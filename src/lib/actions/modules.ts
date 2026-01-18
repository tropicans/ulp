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
