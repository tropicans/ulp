"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { QuestionType } from "@/generated/prisma"

const createQuestionSchema = z.object({
    quizId: z.string(),
    type: z.nativeEnum(QuestionType),
    text: z.string().min(1, "Pertanyaan wajib diisi"),
    explanation: z.string().optional(),
    points: z.number().min(1).default(1),
    order: z.number(),
    options: z.any().optional(), // For MC/TF
    modelAnswer: z.string().optional(), // For Essay
})

export async function createQuestion(data: z.infer<typeof createQuestionSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const validated = createQuestionSchema.parse(data)

        // Verify ownership
        const quiz = await prisma.quiz.findUnique({
            where: { id: validated.quizId },
            include: { Module: { include: { Course: true } } },
        })

        if (!quiz) return { error: "Quiz not found" }

        if (
            quiz.Module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Unauthorized" }
        }

        const question = await prisma.question.create({
            data: {
                id: crypto.randomUUID(),
                ...validated,
            },
        })

        revalidatePath(`/dashboard/quizzes/${validated.quizId}/edit`)
        return { success: true, question }
    } catch (error) {
        console.error("Error creating question:", error)
        return { error: "Gagal membuat pertanyaan" }
    }
}

export async function updateQuestion(questionId: string, data: Partial<z.infer<typeof createQuestionSchema>>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const existing = await prisma.question.findUnique({
            where: { id: questionId },
            include: { Quiz: true }
        })

        if (!existing) return { error: "Pertanyaan tidak ditemukan" }

        const updated = await prisma.question.update({
            where: { id: questionId },
            data,
        })

        revalidatePath(`/dashboard/quizzes/${existing.quizId}/edit`)
        return { success: true, question: updated }
    } catch (error) {
        console.error("Error updating question:", error)
        return { error: "Gagal memperbarui pertanyaan" }
    }
}

export async function deleteQuestion(questionId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const existing = await prisma.question.findUnique({
            where: { id: questionId },
        })

        if (!existing) return { error: "Pertanyaan tidak ditemukan" }

        await prisma.question.delete({ where: { id: questionId } })

        revalidatePath(`/dashboard/quizzes/${existing.quizId}/edit`)
        return { success: true }
    } catch (error) {
        console.error("Error deleting question:", error)
        return { error: "Gagal menghapus pertanyaan" }
    }
}

export async function reorderQuestions(quizId: string, questionIds: string[]) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await prisma.$transaction(
            questionIds.map((id, index) =>
                prisma.question.update({
                    where: { id },
                    data: { order: index },
                })
            )
        )

        revalidatePath(`/dashboard/quizzes/${quizId}/edit`)
        return { success: true }
    } catch (error) {
        console.error("Error reordering questions:", error)
        return { error: "Gagal mengubah urutan pertanyaan" }
    }
}
