"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { awardPoints, updateActivityStreak } from "./gamification"
import { z } from "zod"
import { QuizType, GradingStatus } from "@/generated/prisma"
import {
    queueStatement,
    recordActivity,
    buildActor,
    buildActivity,
    buildResult
} from "@/lib/xapi"
import { genIdempotencyKey } from "@/lib/xapi/utils"
import { VERBS, ACTIVITY_TYPES, PLATFORM_IRI } from "@/lib/xapi/verbs"

const createQuizSchema = z.object({
    moduleId: z.string(),
    title: z.string().min(1, "Judul kuis wajib diisi"),
    description: z.string().optional(),
    type: z.nativeEnum(QuizType).default(QuizType.QUIZ),
    passingScore: z.number().min(0).max(100).default(70),
    timeLimit: z.number().nullable().optional(),
    maxAttempts: z.number().min(1).default(1),
    shuffleQuestions: z.boolean().default(true),
    showCorrectAnswers: z.boolean().default(true),
})

const quizSubmissionSchema = z.object({
    quizId: z.string(),
    answers: z.array(z.object({
        questionId: z.string(),
        selectedOptions: z.any().optional(), // For MC/TF: index of option
        answerText: z.string().optional(), // For Essay
    })),
})

export async function createQuiz(data: z.infer<typeof createQuizSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const validated = createQuizSchema.parse(data)

        // Verify ownership of the course through module
        const module = await prisma.module.findUnique({
            where: { id: validated.moduleId },
            include: { Course: true },
        })

        if (!module) return { error: "Module not found" }

        if (
            module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Unauthorized access" }
        }

        const quiz = await prisma.quiz.create({
            data: {
                id: crypto.randomUUID(),
                ...validated,
                updatedAt: new Date(),
            },
        })

        revalidatePath(`/dashboard/courses/${module.courseId}/edit`)
        return { success: true, quiz }
    } catch (error) {
        console.error("Error creating quiz:", error)
        if (error instanceof z.ZodError) return { error: error.issues[0].message }
        return { error: "Gagal membuat kuis" }
    }
}

export async function updateQuiz(quizId: string, data: Partial<z.infer<typeof createQuizSchema>>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const existing = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { Module: { include: { Course: true } } },
        })

        if (!existing) return { error: "Kuis tidak ditemukan" }

        if (
            existing.Module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Unauthorized access" }
        }

        const updated = await prisma.quiz.update({
            where: { id: quizId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        })

        revalidatePath(`/dashboard/quizzes/${quizId}/edit`)
        return { success: true, quiz: updated }
    } catch (error) {
        console.error("Error updating quiz:", error)
        return { error: "Gagal memperbarui kuis" }
    }
}

export async function deleteQuiz(quizId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const existing = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { Module: true }
        })

        if (!existing) return { error: "Kuis tidak ditemukan" }

        await prisma.quiz.delete({ where: { id: quizId } })

        revalidatePath(`/dashboard/courses/${existing.Module.courseId}/edit`)
        return { success: true }
    } catch (error) {
        console.error("Error deleting quiz:", error)
        return { error: "Gagal menghapus kuis" }
    }
}

export async function getQuizById(quizId: string) {
    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                Question: {
                    orderBy: { order: "asc" },
                },
                Module: {
                    include: { Course: true }
                }
            },
        })
        return quiz
    } catch (error) {
        console.error("Error fetching quiz:", error)
        return null
    }
}

/**
 * Submit quiz attempt and grade automatically
 */
export async function submitQuizAttempt(data: z.infer<typeof quizSubmissionSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const validated = quizSubmissionSchema.parse(data)

        // Fetch quiz with questions to grade
        const quiz = await prisma.quiz.findUnique({
            where: { id: validated.quizId },
            include: { Question: true },
        })

        if (!quiz) return { error: "Quiz not found" }

        // Check attempts
        const attemptCount = await prisma.quizAttempt.count({
            where: { quizId: validated.quizId, userId: session.user.id },
        })

        if (attemptCount >= quiz.maxAttempts) {
            return { error: "Batas maksimal percobaan telah tercapai" }
        }

        let totalPoints = 0
        let earnedPoints = 0
        let hasEssay = false

        // Create Attempt record first
        const attemptId = crypto.randomUUID()

        const questionAnswersData = validated.answers.map((ans) => {
            const question = quiz.Question.find((q) => q.id === ans.questionId)
            if (!question) return null

            totalPoints += question.points
            let isCorrect = false
            let pointsEarned = 0

            if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
                // options could be:
                // 1. Array of choices with separate correctIndex field on question
                // 2. Object with { choices: [...], correctIndex: number }
                const opts = question.options as any
                const selectedIndex = typeof ans.selectedOptions === "number" ? ans.selectedOptions : null

                // Debug logging
                console.log('[GRADING] Question:', question.id)
                console.log('[GRADING] opts:', JSON.stringify(opts))
                console.log('[GRADING] selectedIndex:', selectedIndex)

                // Determine correct index based on format
                let correctIndex: number | null = null
                if (Array.isArray(opts)) {
                    // Format 1: options is an array, correctIndex might be on question itself or not exist
                    // For bulk uploaded questions, correctIndex should be stored separately
                    correctIndex = (question as any).correctIndex ?? null
                } else if (opts && typeof opts.correctIndex === 'number') {
                    // Format 2: options is object with correctIndex
                    correctIndex = opts.correctIndex
                }

                console.log('[GRADING] correctIndex:', correctIndex)

                if (selectedIndex !== null && correctIndex !== null && selectedIndex === correctIndex) {
                    isCorrect = true
                    pointsEarned = question.points
                    earnedPoints += pointsEarned
                    console.log('[GRADING] CORRECT! Points:', pointsEarned)
                } else {
                    console.log('[GRADING] INCORRECT')
                }
            } else if (question.type === "ESSAY") {
                hasEssay = true
            }

            return {
                id: crypto.randomUUID(),
                questionId: ans.questionId,
                answer: ans.answerText,
                // Store selectedOptions as object with index for querying later
                selectedOptions: typeof ans.selectedOptions === "number" ? ans.selectedOptions : undefined,
                isCorrect: question.type === "ESSAY" ? null : isCorrect,
                pointsEarned: question.type === "ESSAY" ? 0 : pointsEarned,
            }
        }).filter(Boolean) as any[]

        const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
        const isPassed = score >= quiz.passingScore

        const attempt = await prisma.quizAttempt.create({
            data: {
                id: attemptId,
                userId: session.user.id,
                quizId: validated.quizId,
                startedAt: new Date(), // Ideally this would be passed or tracked from start
                submittedAt: new Date(),
                score,
                isPassed: hasEssay ? null : isPassed,
                gradingStatus: hasEssay ? "PENDING" : "COMPLETED",
                QuestionAnswer: {
                    create: questionAnswersData,
                },
            },
        })

        // If quiz is passed, trigger progress update (indirectly)
        // In a real app, this might mark a "Lesson" (if quiz is linked to one) as complete

        // Gamification: Update streak on every submission
        await updateActivityStreak(session.user.id)

        // Award points only if passed and no essay (auto-graded)
        if (isPassed && !hasEssay) {
            await awardPoints(session.user.id, "QUIZ_PASS")
        }

        // Send xAPI statement for quiz attempt
        if (!hasEssay) {
            const quizModule = await prisma.quiz.findUnique({
                where: { id: validated.quizId },
                include: { Module: { include: { Course: { select: { slug: true } } } } }
            })

            if (quizModule) {
                const activityType = isPassed ? "QUIZ_PASS" : "QUIZ_FAIL"

                queueStatement(
                    {
                        actor: buildActor(session.user.email || '', session.user.name),
                        verb: isPassed ? VERBS.passed : VERBS.failed,
                        object: buildActivity(
                            `${PLATFORM_IRI}/courses/${quizModule.Module.Course.slug}/quizzes/${validated.quizId}`,
                            ACTIVITY_TYPES.assessment,
                            quiz.title,
                            quiz.description || undefined
                        ),
                        result: buildResult({
                            score: Math.round(score),
                            success: isPassed,
                            completion: true
                        })
                    },
                    genIdempotencyKey(isPassed ? "quiz_pass" : "quiz_fail", session.user.id, validated.quizId, attemptId)
                )

                // Record to unified journey
                recordActivity(
                    session.user.id,
                    activityType,
                    validated.quizId,
                    quiz.title,
                    quizModule.Module.courseId,
                    { score, attemptId }
                )

                // If POSTTEST is passed, check course completion and send course completed xAPI
                if (isPassed && quiz.type === "POSTTEST") {
                    const courseId = quizModule.Module.courseId

                    // Check if all lessons are completed
                    const course = await prisma.course.findUnique({
                        where: { id: courseId },
                        include: {
                            Module: {
                                include: {
                                    Lesson: {
                                        include: {
                                            Progress: { where: { userId: session.user.id } }
                                        }
                                    }
                                }
                            }
                        }
                    })

                    if (course) {
                        const allLessons = course.Module.flatMap(m => m.Lesson)
                        const completedLessons = allLessons.filter(l =>
                            l.Progress.length > 0 && l.Progress[0].isCompleted
                        )

                        // If all lessons completed + posttest passed = course completed
                        if (completedLessons.length >= allLessons.length) {
                            // Award COURSE_COMPLETE points
                            await awardPoints(session.user.id, "COURSE_COMPLETE")

                            // Send xAPI course completed statement
                            queueStatement(
                                {
                                    actor: buildActor(session.user.email || '', session.user.name),
                                    verb: VERBS.completed,
                                    object: buildActivity(
                                        `${PLATFORM_IRI}/courses/${course.slug}`,
                                        ACTIVITY_TYPES.course,
                                        course.title,
                                        course.description || undefined
                                    ),
                                    result: buildResult({
                                        completion: true,
                                        success: true
                                    })
                                },
                                genIdempotencyKey("course_complete", session.user.id, courseId)
                            )

                            // Record to unified journey
                            recordActivity(
                                session.user.id,
                                "COURSE_COMPLETE",
                                courseId,
                                course.title,
                                courseId
                            )
                        }
                    }
                }
            }
        }

        return { success: true, attemptId: attempt.id, score, isPassed, hasEssay }
    } catch (error) {
        console.error("Error submitting quiz:", error)
        return { error: "Gagal mengirim jawaban kuis" }
    }
}

/**
 * Get quiz attempt results
 */
export async function getAttemptResult(attemptId: string) {
    try {
        const attempt = await prisma.quizAttempt.findUnique({
            where: { id: attemptId },
            include: {
                Quiz: {
                    include: {
                        Question: true
                    }
                },
                QuestionAnswer: {
                    include: {
                        Question: true
                    }
                }
            }
        })
        return attempt
    } catch (error) {
        console.error("Error fetching attempt result:", error)
        return null
    }
}
