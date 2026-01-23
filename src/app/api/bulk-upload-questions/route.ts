"use server"

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { QuestionType } from "@/generated/prisma"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { quizId, questions, syncToPaired } = body

        if (!quizId || !questions || !Array.isArray(questions)) {
            return NextResponse.json({
                error: "Format tidak valid. Diperlukan quizId dan array questions."
            }, { status: 400 })
        }

        // Fetch quiz to verify access
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                Module: {
                    include: {
                        Course: {
                            select: {
                                id: true,
                                instructorId: true
                            }
                        }
                    }
                },
                Question: true
            }
        })

        if (!quiz) {
            return NextResponse.json({ error: "Quiz tidak ditemukan" }, { status: 404 })
        }

        // Check authorization
        if (quiz.Module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role as string)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Validate questions format
        const validatedQuestions = []
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i]

            if (!q.text || typeof q.text !== 'string') {
                return NextResponse.json({
                    error: `Soal ke-${i + 1}: 'text' wajib diisi`
                }, { status: 400 })
            }

            if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
                return NextResponse.json({
                    error: `Soal ke-${i + 1}: 'options' harus berupa array minimal 2 pilihan`
                }, { status: 400 })
            }

            if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
                return NextResponse.json({
                    error: `Soal ke-${i + 1}: 'correctIndex' harus berupa angka valid (0-${q.options.length - 1})`
                }, { status: 400 })
            }

            validatedQuestions.push({
                text: q.text,
                type: QuestionType.MULTIPLE_CHOICE,
                points: q.points || 1,
                explanation: q.explanation || null,
                options: {
                    choices: q.options,
                    correctIndex: q.correctIndex
                }
            })
        }

        // Get current max order
        const maxOrder = quiz.Question.length > 0
            ? Math.max(...quiz.Question.map(q => q.order))
            : 0

        // Create questions in database
        const createdQuestions = await Promise.all(
            validatedQuestions.map(async (q, idx) => {
                return prisma.question.create({
                    data: {
                        id: crypto.randomUUID(),
                        quizId: quizId,
                        type: q.type,
                        text: q.text,
                        points: q.points,
                        order: maxOrder + idx + 1,
                        options: q.options,
                        explanation: q.explanation
                    }
                })
            })
        )

        // Sync to paired quiz (pretest ↔ posttest) if requested
        let pairedQuestionsCreated = 0
        if (syncToPaired && (quiz.type === 'PRETEST' || quiz.type === 'POSTTEST')) {
            const pairedType = quiz.type === 'PRETEST' ? 'POSTTEST' : 'PRETEST'

            const pairedQuiz = await prisma.quiz.findFirst({
                where: {
                    moduleId: quiz.Module.id,
                    type: pairedType
                },
                include: { Question: true }
            })

            if (pairedQuiz) {
                const pairedMaxOrder = pairedQuiz.Question.length > 0
                    ? Math.max(...pairedQuiz.Question.map(q => q.order))
                    : 0

                await Promise.all(
                    validatedQuestions.map(async (q, idx) => {
                        return prisma.question.create({
                            data: {
                                id: crypto.randomUUID(),
                                quizId: pairedQuiz.id,
                                type: q.type,
                                text: q.text,
                                points: q.points,
                                order: pairedMaxOrder + idx + 1,
                                options: q.options,
                                explanation: q.explanation
                            }
                        })
                    })
                )
                pairedQuestionsCreated = validatedQuestions.length
            }
        }

        const message = pairedQuestionsCreated > 0
            ? `Berhasil upload ${createdQuestions.length} soal (dan disinkronkan ke ${quiz.type === 'PRETEST' ? 'Posttest' : 'Pretest'})`
            : `Berhasil upload ${createdQuestions.length} soal`

        return NextResponse.json({
            success: true,
            questionsCreated: createdQuestions.length,
            pairedQuestionsCreated,
            message
        })

    } catch (error) {
        console.error("Bulk upload questions error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
