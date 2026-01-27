"use server"

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const PROXY_BASE = process.env.AI_PROXY_URL || "https://proxy.kelazz.my.id"
const API_KEY = process.env.AI_PROXY_KEY || ""
const AI_MODEL = process.env.AI_MODEL || "gpt-5.1"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { quizId } = body

        if (!quizId) {
            return NextResponse.json({ error: "Quiz ID required" }, { status: 400 })
        }

        // Fetch quiz with module and course info
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                Module: {
                    include: {
                        Course: {
                            select: {
                                id: true,
                                title: true,
                                ytPlaylistId: true,
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

        const ytPlaylistId = quiz.Module.Course.ytPlaylistId
        if (!ytPlaylistId) {
            return NextResponse.json({
                error: "Kursus ini tidak memiliki YouTube playlist. Fitur AI hanya tersedia untuk kursus yang diimpor dari YouTube."
            }, { status: 400 })
        }

        // Fetch transcripts from YouTube playlist items
        const playlistItems = await prisma.ytPlaylistItem.findMany({
            where: { playlistId: ytPlaylistId },
            select: {
                videoTitle: true,
                transcript: true,
                videoNo: true
            },
            orderBy: { videoNo: "asc" }
        })

        if (playlistItems.length === 0) {
            return NextResponse.json({
                error: "Tidak ada video dalam playlist"
            }, { status: 400 })
        }

        // Combine transcripts (limit to prevent token overflow)
        let combinedTranscript = playlistItems
            .filter(item => item.transcript)
            .map((item, idx) => `[Video ${idx + 1}: ${item.videoTitle}]\n${item.transcript}`)
            .join("\n\n---\n\n")

        if (combinedTranscript.length > 12000) {
            combinedTranscript = combinedTranscript.substring(0, 12000) + "..."
        }

        if (!combinedTranscript || combinedTranscript.length < 100) {
            return NextResponse.json({
                error: "Transkrip video tidak tersedia atau terlalu pendek untuk generate soal"
            }, { status: 400 })
        }

        const lessonCount = playlistItems.length
        const questionsPerLesson = 3
        const totalQuestions = lessonCount * questionsPerLesson

        const prompt = `Kamu adalah ahli pembuat soal ujian untuk kursus online. Berdasarkan transkrip video berikut, buatlah ${totalQuestions} soal pilihan ganda untuk ${quiz.type === 'PRETEST' ? 'Pretest' : quiz.type === 'POSTTEST' ? 'Posttest' : 'Quiz'}.

ATURAN PEMBUATAN SOAL:
- Buat ${questionsPerLesson} soal per topik/video (${lessonCount} video = ${totalQuestions} soal total)
- Setiap set 3 soal harus memiliki tingkat kesulitan berbeda:
  1. MUDAH (1 poin) - Pertanyaan recall/definisi dasar
  2. SEDANG (2 poin) - Pertanyaan pemahaman/aplikasi
  3. SULIT (3 poin) - Pertanyaan analisis/sintesis

FORMAT SOAL:
- Setiap soal harus memiliki 4 pilihan jawaban (A, B, C, D)
- Hanya 1 jawaban yang benar
- Gunakan Bahasa Indonesia yang baku dan profesional
- Pertanyaan harus jelas dan tidak ambigu

Transkrip Video:
${combinedTranscript}

Berikan response dalam format JSON array seperti berikut:
[
  {
    "text": "Pertanyaan soal?",
    "difficulty": "EASY",
    "points": 1,
    "options": {
      "choices": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "correctIndex": 0
    },
    "explanation": "Penjelasan mengapa jawaban tersebut benar"
  }
]

PENTING:
- Jawab HANYA dengan JSON array, tanpa teks tambahan
- Pastikan correctIndex adalah angka 0-3 yang menunjukkan jawaban benar
- Buat soal yang relevan dengan materi dalam transkrip`

        console.log("Calling AI proxy for quiz generation...")

        const aiResponse = await fetch(`${PROXY_BASE}/v1/responses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                input: prompt
            })
        })

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text()
            console.error("AI proxy error:", errorText)
            return NextResponse.json({
                error: "Gagal menghubungi AI service"
            }, { status: 500 })
        }

        const aiData = await aiResponse.json()
        console.log("AI response received for quiz generation")

        // Parse AI response
        const content = aiData.output?.[0]?.content?.[0]?.text ||
            aiData.choices?.[0]?.message?.content ||
            aiData.content ||
            ""

        try {
            // Extract JSON from response
            let jsonStr = content
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                jsonStr = jsonMatch[1]
            } else {
                const arrayMatch = content.match(/\[[\s\S]*\]/)
                if (arrayMatch) {
                    jsonStr = arrayMatch[0]
                }
            }

            const questions = JSON.parse(jsonStr)

            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error("Invalid questions format")
            }

            // Get current max order
            const maxOrder = quiz.Question.length > 0
                ? Math.max(...quiz.Question.map(q => q.order))
                : 0

            // Create questions in database
            const createdQuestions = await Promise.all(
                questions.map(async (q: any, idx: number) => {
                    return prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: quizId,
                            type: "MULTIPLE_CHOICE",
                            text: q.text,
                            points: q.points || 1,
                            order: maxOrder + idx + 1,
                            options: q.options,
                            explanation: q.explanation || null
                        }
                    })
                })
            )

            // Sync questions to paired quiz (pretest ↔ posttest)
            let pairedQuestionsCreated = 0
            if (quiz.type === 'PRETEST' || quiz.type === 'POSTTEST') {
                const pairedType = quiz.type === 'PRETEST' ? 'POSTTEST' : 'PRETEST'

                // Find the paired quiz in the same module
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

                    // Create same questions in paired quiz
                    await Promise.all(
                        questions.map(async (q: any, idx: number) => {
                            return prisma.question.create({
                                data: {
                                    id: crypto.randomUUID(),
                                    quizId: pairedQuiz.id,
                                    type: "MULTIPLE_CHOICE",
                                    text: q.text,
                                    points: q.points || 1,
                                    order: pairedMaxOrder + idx + 1,
                                    options: q.options,
                                    explanation: q.explanation || null
                                }
                            })
                        })
                    )
                    pairedQuestionsCreated = questions.length
                }
            }

            const totalCreated = createdQuestions.length + pairedQuestionsCreated
            const message = pairedQuestionsCreated > 0
                ? `Berhasil generate ${createdQuestions.length} soal (dan disinkronkan ke ${quiz.type === 'PRETEST' ? 'Posttest' : 'Pretest'})`
                : `Berhasil generate ${createdQuestions.length} soal`

            return NextResponse.json({
                success: true,
                questionsCreated: createdQuestions.length,
                pairedQuestionsCreated,
                message
            })

        } catch (parseError) {
            console.error("Failed to parse AI response:", content)
            return NextResponse.json({
                error: "Gagal memproses response dari AI"
            }, { status: 500 })
        }

    } catch (error) {
        console.error("Generate quiz questions error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
