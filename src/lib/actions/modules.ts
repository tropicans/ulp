"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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

