"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordActivity } from "@/lib/xapi"

const moduleSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter"),
    description: z.string().optional().nullable(),
    order: z.number().int(),
})

export async function createModule(courseId: string, data: z.infer<typeof moduleSchema>) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        // Verify ownership
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true }
        })

        if (!course || course.instructorId !== session.user.id) {
            return { error: "Forbidden" }
        }

        const validatedData = moduleSchema.parse(data)

        const module = await prisma.module.create({
            data: {
                id: crypto.randomUUID(),
                ...validatedData,
                courseId,
                updatedAt: new Date(),
            }
        })

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        return { success: true, module }
    } catch (error) {
        if (error instanceof z.ZodError) return { error: error.issues[0].message }
        return { error: "Gagal membuat modul" }
    }
}

const updateModuleSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter"),
    description: z.string().optional().nullable(),
})

export async function updateModule(moduleId: string, data: z.infer<typeof updateModuleSchema>) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        // Get module and verify ownership
        const module = await prisma.module.findUnique({
            where: { id: moduleId },
            include: { Course: { select: { instructorId: true, id: true } } }
        })

        if (!module) return { error: "Modul tidak ditemukan" }

        if (module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Forbidden" }
        }

        const validatedData = updateModuleSchema.parse(data)

        const updatedModule = await prisma.module.update({
            where: { id: moduleId },
            data: {
                ...validatedData,
                updatedAt: new Date(),
            }
        })

        revalidatePath(`/dashboard/courses/${module.Course.id}/edit`)
        return { success: true, module: updatedModule }
    } catch (error) {
        if (error instanceof z.ZodError) return { error: error.issues[0].message }
        return { error: "Gagal mengupdate modul" }
    }
}

const lessonSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional().nullable(),
    order: z.number().int(),
    contentType: z.enum(["VIDEO", "DOCUMENT", "ARTICLE", "SCORM", "EXTERNAL_LINK", "ASSIGNMENT"]),
    content: z.string().optional().nullable(),
    videoUrl: z.string().url().optional().nullable(),
    fileUrl: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
})

export async function createLesson(moduleId: string, data: z.infer<typeof lessonSchema>) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        const validatedData = lessonSchema.parse(data)

        const lesson = await prisma.lesson.create({
            data: {
                id: crypto.randomUUID(),
                ...validatedData,
                moduleId,
                updatedAt: new Date(),
            }
        })

        return { success: true, lesson }
    } catch (error) {
        return { error: "Gagal membuat materi" }
    }
}

const updateLessonSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter"),
    description: z.string().optional().nullable(),
    contentType: z.enum(["VIDEO", "DOCUMENT", "ARTICLE", "SCORM", "EXTERNAL_LINK", "ASSIGNMENT"]),
    content: z.string().optional().nullable(),
    videoUrl: z.string().optional().nullable(),
})

export async function updateLesson(lessonId: string, data: z.infer<typeof updateLessonSchema>) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        // Get lesson and verify ownership
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { Module: { include: { Course: { select: { instructorId: true, id: true } } } } }
        })

        if (!lesson) return { error: "Materi tidak ditemukan" }

        if (lesson.Module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Forbidden" }
        }

        const validatedData = updateLessonSchema.parse(data)

        const updatedLesson = await prisma.lesson.update({
            where: { id: lessonId },
            data: {
                ...validatedData,
                updatedAt: new Date(),
            }
        })

        revalidatePath(`/dashboard/courses/${lesson.Module.Course.id}/edit`)
        return { success: true, lesson: updatedLesson }
    } catch (error) {
        if (error instanceof z.ZodError) return { error: error.issues[0].message }
        return { error: "Gagal mengupdate materi" }
    }
}


/**
 * Reorder modules within a course
 */
export async function reorderModules(courseId: string, moduleIds: string[]) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        // Use a transaction to update all orders
        await prisma.$transaction(
            moduleIds.map((id, index) =>
                prisma.module.update({
                    where: { id },
                    data: { order: index },
                })
            )
        )

        revalidatePath(`/dashboard/courses/${courseId}/edit`)
        return { success: true }
    } catch (error) {
        console.error("Error reordering modules:", error)
        return { error: "Failed to reorder modules" }
    }
}

/**
 * Reorder lessons within a module
 */
export async function reorderLessons(moduleId: string, lessonIds: string[]) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const module = await prisma.module.findUnique({
            where: { id: moduleId },
            select: { courseId: true }
        })

        if (!module) return { error: "Module not found" }

        // Use a transaction to update all orders
        await prisma.$transaction(
            lessonIds.map((id, index) =>
                prisma.lesson.update({
                    where: { id },
                    data: { order: index },
                })
            )
        )

        revalidatePath(`/dashboard/courses/${module.courseId}/edit`)
        return { success: true }
    } catch (error) {
        console.error("Error reordering lessons:", error)
        return { error: "Failed to reorder lessons" }
    }
}

/**
 * Add a lesson from the library (clone it)
 */
export async function addLessonFromLibrary(moduleId: string, lessonId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const module = await prisma.module.findUnique({
            where: { id: moduleId },
            include: {
                Lesson: { orderBy: { order: "desc" }, take: 1 },
                Course: { select: { instructorId: true, id: true } }
            }
        })

        if (!module) return { error: "Module not found" }

        // Verify ownership
        if (module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Forbidden" }
        }

        // Get the source lesson
        const sourceLesson = await prisma.lesson.findUnique({
            where: { id: lessonId }
        })

        if (!sourceLesson) return { error: "Source lesson not found" }

        // CHECK FOR DUPLICATES: If YouTube video, check by ytVideoId. Otherwise check by title.
        const existingLesson = await prisma.lesson.findFirst({
            where: {
                moduleId: moduleId,
                OR: [
                    ...(sourceLesson.ytVideoId ? [{ ytVideoId: sourceLesson.ytVideoId }] : []),
                    { title: sourceLesson.title, contentType: sourceLesson.contentType }
                ]
            }
        })

        if (existingLesson) {
            return {
                success: true,
                lesson: existingLesson,
                message: "Materi ini sudah ada di menu Anda."
            }
        }

        // Determine the next order
        const lastLesson = module.Lesson[0]
        const nextOrder = lastLesson ? lastLesson.order + 1 : 0

        // Create the clone
        const newLesson = await prisma.lesson.create({
            data: {
                id: crypto.randomUUID(),
                title: `${sourceLesson.title} (Copy)`,
                description: sourceLesson.description,
                contentType: sourceLesson.contentType,
                content: sourceLesson.content,
                videoUrl: sourceLesson.videoUrl,
                fileUrl: sourceLesson.fileUrl,
                duration: sourceLesson.duration,
                ytVideoId: sourceLesson.ytVideoId,
                transcript: sourceLesson.transcript,
                summary: sourceLesson.summary,
                moduleId: moduleId,
                order: nextOrder,
                updatedAt: new Date(),
            }
        })

        revalidatePath(`/dashboard/courses/${module.Course.id}/edit`)

        // Record activity for AI curator and journey
        recordActivity(
            session.user.id,
            "MATERIAL_ADDED",
            newLesson.id,
            newLesson.title,
            module.Course.id,
            { sourceId: lessonId }
        )

        return { success: true, lesson: newLesson }
    } catch (error) {
        console.error("Error adding lesson from library:", error)
        return { error: "Failed to add lesson from library" }
    }
}
