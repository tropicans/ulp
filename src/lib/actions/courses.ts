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
        return await prisma.course.findUnique({
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
                        Quiz: true,
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
    deliveryMode: z.nativeEnum(DeliveryMode),
    difficulty: z.nativeEnum(Difficulty),
    category: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
})

export async function updateCourse(courseId: string, data: z.infer<typeof updateCourseSchema>) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        // Check ownership
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true }
        })

        if (!course) {
            return { error: "Kursus tidak ditemukan" }
        }

        if (course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses untuk mengedit kursus ini" }
        }

        const validatedData = updateCourseSchema.parse(data)

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                ...validatedData,
                updatedAt: new Date(),
            }
        })

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")
        return { success: true, course: updatedCourse }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error updating course:", error)
        return { error: "Gagal mengupdate kursus" }
    }
}

export async function updateCourseThumbnail(courseId: string, thumbnailUrl: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        // Check ownership
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true }
        })

        if (!course) {
            return { error: "Kursus tidak ditemukan" }
        }

        if (course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses untuk mengedit kursus ini" }
        }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                thumbnail: thumbnailUrl,
                updatedAt: new Date(),
            }
        })

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")
        return { success: true, thumbnail: updatedCourse.thumbnail }
    } catch (error) {
        console.error("Error updating thumbnail:", error)
        return { error: "Gagal mengupdate thumbnail" }
    }
}

export async function toggleCoursePublish(courseId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        // Check ownership
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true, isPublished: true }
        })

        if (!course) {
            return { error: "Kursus tidak ditemukan" }
        }

        if (course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses untuk mengedit kursus ini" }
        }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                isPublished: !course.isPublished,
                updatedAt: new Date(),
            }
        })

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")
        return {
            success: true,
            isPublished: updatedCourse.isPublished,
            message: updatedCourse.isPublished ? "Kursus berhasil dipublish!" : "Kursus berhasil dijadikan draft."
        }
    } catch (error) {
        console.error("Error toggling publish:", error)
        return { error: "Gagal mengubah status publish" }
    }
}

export async function enrollInCourse(courseId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Silakan login terlebih dahulu" }
        }

        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId,
                }
            }
        })

        if (existingEnrollment) {
            return { error: "Anda sudah terdaftar di kursus ini" }
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { title: true, slug: true, description: true }
        })

        await prisma.enrollment.create({
            data: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                courseId,
            }
        })

        // Send xAPI statement for enrollment (transactional outbox)
        if (course) {
            queueStatement(
                {
                    actor: buildActor(session.user.email || '', session.user.name),
                    verb: VERBS.enrolled,
                    object: buildActivity(
                        `${PLATFORM_IRI}/courses/${course.slug}`,
                        ACTIVITY_TYPES.course,
                        course.title,
                        course.description || undefined
                    )
                },
                genIdempotencyKey("enrollment", session.user.id, courseId)
            )

            // Record to unified journey
            recordActivity(
                session.user.id,
                "ENROLLMENT",
                courseId,
                course.title
            )
        }

        revalidatePath(`/courses/[slug]`, "page")
        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Enrollment error:", error)
        return { error: "Gagal mendaftar kursus" }
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
