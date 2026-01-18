"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { DeliveryMode, Difficulty } from "@/generated/prisma"

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
}) {
    try {
        return await prisma.course.findMany({
            where: {
                ...(filters?.deliveryMode && { deliveryMode: filters.deliveryMode }),
                ...(filters?.difficulty && { difficulty: filters.difficulty }),
                ...(filters?.category && { category: filters.category }),
                ...(filters?.isPublished !== undefined && { isPublished: filters.isPublished }),
            },
            include: {
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
            orderBy: { createdAt: "desc" }
        })
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
        if (!session?.user?.id || (session.user.role !== "INSTRUCTOR" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN_UNIT")) {
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

        const course = await prisma.course.create({
            data: {
                id: crypto.randomUUID(),
                ...validatedData,
                slug,
                instructorId: session.user.id,
                updatedAt: new Date(),
            }
        })

        revalidatePath("/dashboard/courses")
        revalidatePath("/courses")
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

        await prisma.enrollment.create({
            data: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                courseId,
            }
        })

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
