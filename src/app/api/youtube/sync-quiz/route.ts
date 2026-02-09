"use server"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Manual trigger to sync quiz from yt_playlists to native Quiz/Question tables
 * POST /api/youtube/sync-quiz?playlistId=PLxxx
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const playlistId = searchParams.get('playlistId')

        if (!playlistId) {
            return NextResponse.json({ error: "playlistId is required" }, { status: 400 })
        }

        const result = await syncQuizToNativeTables(playlistId)

        return NextResponse.json(result)

    } catch (error: any) {
        console.error("[Sync Quiz] Error:", error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

/**
 * Parse quiz text and create native Quiz/Question records
 */
async function syncQuizToNativeTables(playlistId: string) {
    console.log(`[Quiz Sync] Starting sync for playlist: ${playlistId}`)

    // Get playlist data with quiz_prepost
    const playlist = await (prisma as any).ytPlaylist.findUnique({
        where: { playlistId: playlistId }
    })

    if (!playlist || !playlist.quizPrepost) {
        return { success: false, error: `No quiz data found for playlist: ${playlistId}` }
    }

    // Get corresponding Course and Module
    const course = await prisma.course.findFirst({
        where: { ytPlaylistId: playlistId },
        include: { Module: true }
    })

    if (!course || course.Module.length === 0) {
        return { success: false, error: `No course/module found for playlist: ${playlistId}` }
    }

    const module = course.Module[0]

    // Check if quiz already exists for this module
    const existingQuiz = await prisma.quiz.findFirst({
        where: { moduleId: module.id }
    })

    if (existingQuiz) {
        return { success: false, error: `Quiz already exists for module: ${module.id}`, quizId: existingQuiz.id }
    }

    // Parse quiz text format to questions
    const questions = parseQuizText(playlist.quizPrepost)

    if (questions.length === 0) {
        return { success: false, error: `No questions parsed from quiz text` }
    }

    // Create Pre-Test Quiz (assessment only, no passing requirement)
    const preTestQuiz = await prisma.quiz.create({
        data: {
            id: crypto.randomUUID(),
            title: `Pre-Test: ${course.title}`,
            description: `Kuis evaluasi awal untuk mengukur pemahaman sebelum mempelajari materi ${course.title}. Hasil tidak mempengaruhi kelulusan.`,
            moduleId: module.id,
            type: 'PRETEST',
            passingScore: 0, // No passing requirement for pretest
            maxAttempts: 1,  // Single attempt only
            shuffleQuestions: true,
            isAIGenerated: true,
            updatedAt: new Date()
        }
    })

    // Create Post-Test Quiz (with passing requirement)
    const postTestQuiz = await prisma.quiz.create({
        data: {
            id: crypto.randomUUID(),
            title: `Post-Test: ${course.title}`,
            description: `Kuis evaluasi akhir untuk mengukur pemahaman setelah mempelajari materi ${course.title}. Wajib lulus untuk mendapatkan sertifikat.`,
            moduleId: module.id,
            type: 'POSTTEST',
            passingScore: 70, // Must pass 70% to complete
            maxAttempts: 3,   // Allow 3 attempts
            shuffleQuestions: true,
            isAIGenerated: true,
            updatedAt: new Date()
        }
    })

    // Create ALL questions for Pre-Test
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await prisma.question.create({
            data: {
                id: crypto.randomUUID(),
                quizId: preTestQuiz.id,
                type: 'MULTIPLE_CHOICE',
                text: q.text,
                options: q.options,
                order: i + 1,
                points: 1
            }
        })
    }

    // Create SAME questions for Post-Test
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await prisma.question.create({
            data: {
                id: crypto.randomUUID(),
                quizId: postTestQuiz.id,
                type: 'MULTIPLE_CHOICE',
                text: q.text,
                options: q.options,
                order: i + 1,
                points: 1
            }
        })
    }

    console.log(`[Quiz Sync] Created Pre-Test and Post-Test with ${questions.length} identical questions for course: ${course.title}`)

    return {
        success: true,
        preTestQuizId: preTestQuiz.id,
        postTestQuizId: postTestQuiz.id,
        preTestQuestions: questions.length,
        postTestQuestions: questions.length,
        courseTitle: course.title
    }
}

/**
 * Parse quiz text format (generated by AI) into structured questions
 * Actual format:
 * Question text here...
 *  A. Option A
 *  B. Option B
 *  C. Option C
 *  D. Option D
 *
 *  ANSWER: B
 */
function parseQuizText(quizText: string): Array<{ text: string, options: any }> {
    const questions: Array<{ text: string, options: any }> = []

    // Split by ANSWER: pattern (each question ends with ANSWER: X)
    const blocks = quizText.split(/ANSWER:\s*[A-D]/i)

    // Get the answers separately
    const answerMatches = quizText.match(/ANSWER:\s*([A-D])/gi) || []

    for (let i = 0; i < blocks.length - 1; i++) {
        try {
            const block = blocks[i].trim()
            if (!block) continue

            // Extract answer for this block
            const answerLetter = answerMatches[i]?.match(/[A-D]/i)?.[0]?.toUpperCase() || 'A'
            const correctIndex = answerLetter.charCodeAt(0) - 65

            // Extract question text (everything before first option line starting with A.)
            const questionMatch = block.match(/^([\s\S]+?)(?=\n\s*A\.)/m)
            if (!questionMatch) continue

            const questionText = questionMatch[1].trim()

            // Extract options - they may have spaces before them
            const optionA = block.match(/\n\s*A\.\s*([\s\S]+?)(?=\n\s*B\.|$)/)?.[1]?.trim()
            const optionB = block.match(/\n\s*B\.\s*([\s\S]+?)(?=\n\s*C\.|$)/)?.[1]?.trim()
            const optionC = block.match(/\n\s*C\.\s*([\s\S]+?)(?=\n\s*D\.|$)/)?.[1]?.trim()
            const optionD = block.match(/\n\s*D\.\s*([\s\S]+?)$/)?.[1]?.trim()

            if (questionText && optionA && optionB) {
                const options = [
                    { text: optionA, isCorrect: correctIndex === 0 },
                    { text: optionB, isCorrect: correctIndex === 1 },
                ]
                if (optionC) options.push({ text: optionC, isCorrect: correctIndex === 2 })
                if (optionD) options.push({ text: optionD, isCorrect: correctIndex === 3 })

                questions.push({
                    text: questionText,
                    options: options
                })
            }
        } catch (e) {
            console.error("[Quiz Parse] Error parsing question block:", e)
        }
    }

    console.log(`[Quiz Parse] Parsed ${questions.length} questions from quiz text`)
    return questions
}
