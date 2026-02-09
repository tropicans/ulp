"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { DeliveryMode, Difficulty } from "@/generated/prisma"
import {
    queueStatement,
    recordActivity,
    buildActor,
    buildActivity
} from "@/lib/xapi"
import { genIdempotencyKey } from "@/lib/xapi/utils"
import { VERBS, ACTIVITY_TYPES, PLATFORM_IRI } from "@/lib/xapi/verbs"
import { success, error, unauthorized, notFound, forbidden, validationError, serverError, type ActionResponse } from "@/lib/response"
import { canEditCourse } from "@/lib/auth/policies"

const courseSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter"),
    description: z.string().min(10, "Deskripsi minimal 10 karakter"),
    deliveryMode: z.nativeEnum(DeliveryMode),
    difficulty: z.nativeEnum(Difficulty),
    category: z.string().optional(),
    capacity: z.number().optional().nullable(),
    duration: z.number().optional().nullable(),
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),
})


export async function getCourses(filters?: {
    deliveryMode?: DeliveryMode
    difficulty?: Difficulty
    category?: string
    isPublished?: boolean
    limit?: number
    offset?: number
}) {
    try {
        const limit = filters?.limit || 20; // Default pagination
        const offset = filters?.offset || 0;

        const courses = await prisma.course.findMany({
            where: {
                ...(filters?.deliveryMode && { deliveryMode: filters.deliveryMode }),
                ...(filters?.difficulty && { difficulty: filters.difficulty }),
                ...(filters?.category && { category: filters.category }),
                // Exclude personal learner courses from main catalog unless explicitly requested
                ...(!filters?.category && { NOT: { category: "PERSONAL" } }),
                ...(filters?.isPublished !== undefined && { isPublished: filters.isPublished }),
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                thumbnail: true,
                deliveryMode: true,
                difficulty: true,
                category: true,
                duration: true,
                isPublished: true,
                isFeatured: true,
                createdAt: true,
                ytPlaylistId: true,
                User: {
                    select: {
                        name: true,
                        image: true,
                    }
                },
                _count: {
                    select: { Enrollment: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        })

        // Enrich courses with YouTube thumbnails if they have ytPlaylistId and no custom thumbnail
        const playlistIds = courses
            .filter(c => c.ytPlaylistId && !c.thumbnail)
            .map(c => c.ytPlaylistId as string)

        if (playlistIds.length > 0) {
            // Get first video (lowest videoNo) from each playlist
            const firstVideos = await prisma.$queryRaw<{ playlistId: string, videoId: string }[]>`
                SELECT DISTINCT ON (playlist_id) 
                    playlist_id as "playlistId", 
                    video_id as "videoId"
                FROM yt_playlist_items
                WHERE playlist_id = ANY(${playlistIds}::text[])
                ORDER BY playlist_id, video_no ASC
            `

            const playlistToVideoId = new Map(
                firstVideos.map(v => [v.playlistId, v.videoId])
            )

            // Enrich courses with YouTube thumbnail URL
            return courses.map(course => {
                if (course.ytPlaylistId && !course.thumbnail) {
                    const videoId = playlistToVideoId.get(course.ytPlaylistId)
                    if (videoId) {
                        return {
                            ...course,
                            thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
                        }
                    }
                }
                return course
            })
        }

        return courses
    } catch (error) {
        console.error("Error fetching courses:", error)
        return []
    }
}

export async function getCourseBySlug(slug: string) {
    try {
        const course = await prisma.course.findUnique({
            where: { slug },
            include: {
                User: {
                    select: {
                        name: true,
                        image: true,
                        unitKerja: true,
                        jabatan: true,
                    }
                },
                Module: {
                    orderBy: { order: "asc" },
                    include: {
                        Lesson: { orderBy: { order: "asc" } },
                        Quiz: {
                            include: {
                                _count: {
                                    select: { Question: true }
                                }
                            }
                        },
                    }
                },
                Enrollment: {
                    select: { userId: true }
                },
                CourseSession: {
                    orderBy: { startTime: "asc" },
                    include: {
                        _count: {
                            select: { Attendance: true }
                        }
                    }
                }
            }
        })

        if (!course) return null;

        // Calculate JP logic: (total durasi lesson + tiap soal hargai 1 menit) / 45
        let totalLessonMinutes = 0;
        let totalQuestions = 0;

        // 1. Get lesson durations - try to get from yt_playlist_items if it's a YouTube course
        if (course.ytPlaylistId) {
            const ytItems = await prisma.ytPlaylistItem.findMany({
                where: { playlistId: course.ytPlaylistId },
                select: { durationStr: true }
            });

            ytItems.forEach(item => {
                const durationStr = item.durationStr;
                if (durationStr) {
                    const parts = durationStr.split(':').map(Number);
                    if (parts.length === 3) {
                        // H:M:S
                        totalLessonMinutes += parts[0] * 60 + parts[1] + (parts[2] / 60);
                    } else if (parts.length === 2) {
                        // M:S
                        totalLessonMinutes += parts[0] + (parts[1] / 60);
                    }
                }
            });
        }

        // Add duration from Lesson table if not all are from YouTube or as fallback
        if (totalLessonMinutes === 0) {
            course.Module.forEach(m => {
                m.Lesson.forEach(l => {
                    totalLessonMinutes += l.duration || 0;
                });
            });
        }

        // 2. Count quiz questions
        course.Module.forEach(m => {
            m.Quiz.forEach(q => {
                totalQuestions += (q as any)._count?.Question || 0;
            });
        });

        const totalMinutes = Math.ceil(totalLessonMinutes + totalQuestions);
        const jp = Math.ceil(totalMinutes / 45);

        console.log(`[JP Calculation] Total Lesson Min: ${totalLessonMinutes}, Questions: ${totalQuestions}, Total: ${totalMinutes}, JP: ${jp}`);

        return {
            ...course,
            calculatedDuration: totalMinutes,
            calculatedJP: jp
        };
    } catch (error) {
        console.error("Error fetching course detail:", error)
        return null
    }
}

export async function createCourse(data: z.infer<typeof courseSchema>) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const validatedData = courseSchema.parse(data)
        const baseSlug = validatedData.title
            .toLowerCase()
            .trim()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, "")

        // Check for slug collision
        let slug = baseSlug
        const existing = await prisma.course.findUnique({ where: { slug } })
        if (existing) {
            slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`
        }

        const isLearner = session.user.role === "LEARNER"

        const course = await prisma.course.create({
            data: {
                id: crypto.randomUUID(),
                ...validatedData,
                slug,
                instructorId: session.user.id,
                isPublished: isLearner ? true : false,
                category: isLearner ? "PERSONAL" : (validatedData.category || null),
                updatedAt: new Date(),
            }
        })

        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")

        // Auto-enroll if learner
        if (isLearner) {
            await enrollInCourse(course.id)
        }

        return { success: true, course }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error creating course:", error)
        return { error: "Gagal membuat kursus" }
    }
}

const updateCourseSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter"),
    description: z.string().min(10, "Deskripsi minimal 10 karakter"),
    courseShortDesc: z.string().max(500, "Deskripsi singkat maksimal 500 karakter").optional().nullable(),
    requirements: z.string().optional().nullable(),
    outcomes: z.string().optional().nullable(),
    recommendedNext: z.string().optional().nullable(),
    deliveryMode: z.nativeEnum(DeliveryMode),
    difficulty: z.nativeEnum(Difficulty),
    category: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
})

export async function updateCourse(
    courseId: string,
    data: z.infer<typeof updateCourseSchema>
): Promise<ActionResponse<{ course: { id: string; title: string } }>> {
    // 1. AUTH CHECK
    const session = await auth()
    if (!session?.user?.id) {
        return unauthorized()
    }

    // 2. AUTHZ VIA POLICY
    const authz = await canEditCourse(session.user.id, session.user.role, courseId)
    if (!authz.allowed) {
        return forbidden(authz.reason)
    }

    // 3. VALIDATE INPUT
    const parsed = updateCourseSchema.safeParse(data)
    if (!parsed.success) {
        return validationError(parsed.error)
    }

    try {
        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                ...parsed.data,
                updatedAt: new Date(),
            },
            select: { id: true, title: true }
        })

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")

        return success({ course: updatedCourse }, "Kursus berhasil diupdate")
    } catch (err) {
        console.error("[LEARNING] updateCourse error:", err)
        return serverError("Gagal mengupdate kursus")
    }
}

export async function updateCourseThumbnail(
    courseId: string,
    thumbnailUrl: string
): Promise<ActionResponse<{ thumbnail: string | null }>> {
    // 1. AUTH CHECK
    const session = await auth()
    if (!session?.user?.id) {
        return unauthorized()
    }

    // 2. AUTHZ VIA POLICY
    const authz = await canEditCourse(session.user.id, session.user.role, courseId)
    if (!authz.allowed) {
        return forbidden(authz.reason)
    }

    try {
        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                thumbnail: thumbnailUrl,
                updatedAt: new Date(),
            },
            select: { thumbnail: true }
        })

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")

        return success({ thumbnail: updatedCourse.thumbnail })
    } catch (err) {
        console.error("[LEARNING] updateCourseThumbnail error:", err)
        return serverError("Gagal mengupdate thumbnail")
    }
}

export async function toggleCoursePublish(
    courseId: string
): Promise<ActionResponse<{ isPublished: boolean }>> {
    // 1. AUTH CHECK
    const session = await auth()
    if (!session?.user?.id) {
        return unauthorized()
    }

    // 2. AUTHZ VIA POLICY
    const authz = await canEditCourse(session.user.id, session.user.role, courseId)
    if (!authz.allowed) {
        return forbidden(authz.reason)
    }

    try {
        // Get current state
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { isPublished: true }
        })

        if (!course) {
            return notFound("Kursus")
        }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                isPublished: !course.isPublished,
                updatedAt: new Date(),
            },
            select: { isPublished: true }
        })

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")

        const message = updatedCourse.isPublished
            ? "Kursus berhasil dipublish!"
            : "Kursus berhasil dijadikan draft."

        return success({ isPublished: updatedCourse.isPublished }, message)
    } catch (err) {
        console.error("[LEARNING] toggleCoursePublish error:", err)
        return serverError("Gagal mengubah status publish")
    }
}

export async function enrollInCourse(courseId: string): Promise<ActionResponse<{ enrollmentId: string }>> {
    // 1. AUTH CHECK
    const session = await auth()
    if (!session?.user?.id) {
        return unauthorized()
    }

    try {
        // 2. CHECK COURSE EXISTS
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, title: true, slug: true, description: true, isPublished: true }
        })

        if (!course) {
            return notFound("Kursus")
        }

        // 3. CHECK EXISTING ENROLLMENT
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId,
                }
            }
        })

        if (existingEnrollment) {
            return error("CONFLICT", "Anda sudah terdaftar di kursus ini")
        }

        // 4. CREATE ENROLLMENT (atomic with xAPI outbox)
        const enrollmentId = crypto.randomUUID()
        const idempotencyKey = genIdempotencyKey("enrollment", session.user.id, courseId)

        await prisma.$transaction(async (tx) => {
            // Create enrollment
            await tx.enrollment.create({
                data: {
                    id: enrollmentId,
                    userId: session.user.id,
                    courseId,
                }
            })

            // Queue xAPI statement (inside transaction for atomicity)
            await tx.$executeRaw`
                INSERT INTO xapi_outbox (id, idempotency_key, statement, status, attempts, created_at)
                VALUES (
                    gen_random_uuid(), 
                    ${idempotencyKey}, 
                    ${JSON.stringify({
                actor: buildActor(session.user.email || '', session.user.name),
                verb: VERBS.enrolled,
                object: buildActivity(
                    `${PLATFORM_IRI}/courses/${course.slug}`,
                    ACTIVITY_TYPES.course,
                    course.title,
                    course.description || undefined
                ),
                timestamp: new Date().toISOString()
            })}::jsonb, 
                    'PENDING', 
                    0, 
                    NOW()
                )
                ON CONFLICT (idempotency_key) DO NOTHING
            `

            // Record learner activity (inside transaction)
            await tx.$executeRaw`
                INSERT INTO learner_activity (id, user_id, course_id, activity_type, entity_id, entity_title, occurred_at)
                VALUES (gen_random_uuid(), ${session.user.id}, ${courseId}, 'ENROLLMENT', ${courseId}, ${course.title}, NOW())
            `
        })

        // 5. CACHE INVALIDATION (after successful transaction)
        revalidatePath(`/courses/[slug]`, "page")
        revalidatePath("/dashboard")

        // 6. RETURN SUCCESS
        return success({ enrollmentId }, "Berhasil mendaftar kursus")

    } catch (err) {
        console.error("[LEARNING] enrollInCourse error:", err)
        return serverError("Gagal mendaftar kursus")
    }
}

export async function getUserEnrollments() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { userId: session.user.id },
            include: {
                Course: {
                    include: {
                        User: {
                            select: {
                                name: true,
                                image: true,
                            }
                        },
                        Module: {
                            include: {
                                Lesson: {
                                    include: {
                                        Progress: {
                                            where: { userId: session.user.id }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { lastAccessedAt: "desc" }
        })

        // Calculate progress for each enrollment
        return enrollments.map(enrollment => {
            const course = enrollment.Course
            const totalLessons = course.Module.reduce((acc, m) => acc + m.Lesson.length, 0)
            const completedLessons = course.Module.reduce((acc, m) =>
                acc + m.Lesson.filter(l => l.Progress.some(p => p.isCompleted)).length, 0
            )
            const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            return {
                id: enrollment.id,
                courseId: course.id,
                courseTitle: course.title,
                courseSlug: course.slug,
                courseThumbnail: course.thumbnail,
                courseDeliveryMode: course.deliveryMode,
                instructorName: course.User.name,
                progressPercent,
                totalLessons,
                completedLessons,
                enrolledAt: enrollment.enrolledAt,
                lastAccessedAt: enrollment.lastAccessedAt,
            }
        })
    } catch (error) {
        console.error("Error fetching enrollments:", error)
        return []
    }
}

/**
 * Get courses created by the current user (Playlists)
 */
export async function getUserCreatedCourses() {
    try {
        const session = await auth()
        if (!session?.user?.id) return []

        return await prisma.course.findMany({
            where: { instructorId: session.user.id },
            include: {
                _count: {
                    select: { Module: true }
                }
            },
            orderBy: { updatedAt: "desc" }
        })
    } catch (error) {
        console.error("Error fetching user created courses:", error)
        return []
    }
}
