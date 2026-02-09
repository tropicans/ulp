import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * YouTube processing callback endpoint
 * Receives status updates from n8n workflow
 * Note: n8n already updates yt_playlist_items directly via SQL
 * This endpoint syncs quiz data to native Quiz/Question tables
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log("[YouTube Callback] Received:", JSON.stringify({
            status: body.status,
            playlist_id: body.playlist_id,
            video_id: body.video_id,
            video_no: body.video_no,
            has_transcript: body.has_transcript,
            has_summary: body.has_summary,
            has_refined_title: body.has_refined_title,
            has_quiz_knowledge_check: body.has_quiz_knowledge_check,
            timestamp: body.timestamp
        }, null, 2))

        // n8n already updates yt_playlist_items directly via PostgreSQL nodes
        // This callback is for logging and status tracking only

        if (body.status === "item_completed") {
            console.log(`[YouTube Callback] Video ${body.video_no} (${body.video_id}) completed`)
        }

        if (body.status === "playlist_completed" || body.status === "completed") {
            console.log(`[YouTube Callback] Playlist ${body.playlist_id} processing completed`)

            // Sync all AI-generated data to native tables
            if (body.playlist_id) {
                await syncQuizToNativeTables(body.playlist_id)
                await syncCourseMetadata(body.playlist_id)
                await syncLessonContent(body.playlist_id)
            }
        }

        return NextResponse.json({
            success: true,
            message: "Callback logged",
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("[YouTube Callback] Error:", error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

/**
 * Sync AI-generated course metadata from yt_playlists to native Course table
 */
async function syncCourseMetadata(playlistId: string) {
    try {
        console.log(`[Course Sync] Starting metadata sync for playlist: ${playlistId}`)

        // Get playlist with AI-generated metadata
        const playlist = await (prisma as any).ytPlaylist.findUnique({
            where: { playlistId: playlistId }
        })

        if (!playlist) {
            console.log(`[Course Sync] Playlist not found: ${playlistId}`)
            return
        }

        // Find corresponding Course
        const course = await prisma.course.findFirst({
            where: { ytPlaylistId: playlistId }
        })

        if (!course) {
            console.log(`[Course Sync] No course found for playlist: ${playlistId}`)
            return
        }


        // Build update data from yt_playlists AI-generated fields
        const updateData: any = {}

        if (playlist.courseDesc) {
            updateData.description = playlist.courseDesc
        }
        if (playlist.courseShortDesc) {
            updateData.courseShortDesc = playlist.courseShortDesc
        }
        if (playlist.metaKeys) {
            // Parse metaKeys as requirements if it looks like a list
            try {
                const keys = playlist.metaKeys.split(',').map((k: string) => k.trim()).filter(Boolean)
                if (keys.length > 0) {
                    updateData.requirements = keys
                }
            } catch { }
        }
        if (playlist.courseLevel) {
            const levelMap: Record<string, string> = {
                'Beginner': 'BEGINNER',
                'Intermediate': 'INTERMEDIATE',
                'Advanced': 'ADVANCED',
                'All levels': 'ALL_LEVELS'
            }
            const mappedLevel = levelMap[playlist.courseLevel] || playlist.courseLevel
            if (['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'].includes(mappedLevel)) {
                updateData.difficulty = mappedLevel
            }
        }

        // Update Course if there's something to update
        if (Object.keys(updateData).length > 0) {
            await prisma.course.update({
                where: { id: course.id },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                }
            })
            console.log(`[Course Sync] Updated course ${course.id} with:`, Object.keys(updateData))
        } else {
            console.log(`[Course Sync] No metadata to sync for course: ${course.id}`)
        }


    } catch (error) {
        console.error(`[Course Sync] Error syncing course metadata:`, error)
    }
}

/**
 * Sync AI-generated lesson content from yt_playlist_items to native Lesson table
 */
async function syncLessonContent(playlistId: string) {
    try {
        console.log(`[Lesson Sync] Starting content sync for playlist: ${playlistId}`)

        // Get all playlist items with AI-generated content
        const items = await (prisma as any).ytPlaylistItem.findMany({
            where: { playlistId: playlistId }
        })

        if (!items || items.length === 0) {
            console.log(`[Lesson Sync] No items found for playlist: ${playlistId}`)
            return
        }

        // Find corresponding Course
        const course = await prisma.course.findFirst({
            where: { ytPlaylistId: playlistId },
            include: {
                Module: {
                    include: { Lesson: true }
                }
            }
        })

        if (!course || course.Module.length === 0) {
            console.log(`[Lesson Sync] No course/module found for playlist: ${playlistId}`)
            return
        }

        const lessons = course.Module.flatMap(m => m.Lesson)
        let updatedCount = 0

        // Match lessons by ytVideoId and update with AI content
        for (const item of items) {
            const lesson = lessons.find(l => l.ytVideoId === item.videoId)
            if (!lesson) continue

            const updateData: any = {}

            if (item.summary) {
                updateData.summary = item.summary
            }
            if (item.refinedTitle) {
                updateData.title = item.refinedTitle
            }
            if (item.transcript) {
                updateData.content = item.transcript
            }

            if (Object.keys(updateData).length > 0) {
                await prisma.lesson.update({
                    where: { id: lesson.id },
                    data: {
                        ...updateData,
                        updatedAt: new Date()
                    }
                })
                updatedCount++
            }
        }

        console.log(`[Lesson Sync] Updated ${updatedCount} lessons with AI content`)

    } catch (error) {
        console.error(`[Lesson Sync] Error syncing lesson content:`, error)
    }
}

/**
 * Parse quiz text and create native Quiz/Question records
 */
async function syncQuizToNativeTables(playlistId: string) {
    try {
        console.log(`[Quiz Sync] Starting sync for playlist: ${playlistId}`)

        // Get playlist data with quiz_prepost
        const playlist = await (prisma as any).ytPlaylist.findUnique({
            where: { playlistId: playlistId }
        })

        if (!playlist || !playlist.quizPrepost) {
            console.log(`[Quiz Sync] No quiz data found for playlist: ${playlistId}`)
            return
        }

        // Get corresponding Course and Module
        const course = await prisma.course.findFirst({
            where: { ytPlaylistId: playlistId },
            include: { Module: true }
        })

        if (!course || course.Module.length === 0) {
            console.log(`[Quiz Sync] No course/module found for playlist: ${playlistId}`)
            return
        }

        const module = course.Module[0]

        // Check if quiz already exists for this module
        const existingQuiz = await prisma.quiz.findFirst({
            where: {
                moduleId: module.id,
                type: 'PRETEST'
            }
        })

        if (existingQuiz) {
            console.log(`[Quiz Sync] Quiz already exists for module: ${module.id}`)
            return
        }

        // Parse quiz text format to questions
        const questions = parseQuizText(playlist.quizPrepost)

        if (questions.length === 0) {
            console.log(`[Quiz Sync] No questions parsed from quiz text`)
            return
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

    } catch (error) {
        console.error(`[Quiz Sync] Error syncing quiz:`, error)
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

    // Normalize line endings to \n
    const normalizedText = quizText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Split by ANSWER: pattern (each question ends with ANSWER: X)
    const blocks = normalizedText.split(/ANSWER:\s*[A-D]/i)

    // Get the answers separately
    const answerMatches = normalizedText.match(/ANSWER:\s*([A-D])/gi) || []

    console.log(`[Quiz Parse] Found ${blocks.length - 1} question blocks, ${answerMatches.length} answers`)

    for (let i = 0; i < blocks.length - 1; i++) {
        try {
            const block = blocks[i].trim()
            if (!block) continue

            // Extract answer for this block
            const answerMatch = answerMatches[i]?.match(/ANSWER:\s*([A-D])/i)
            const answerLetter = answerMatch?.[1]?.toUpperCase() || 'A'
            const correctIndex = answerLetter.charCodeAt(0) - 65

            console.log(`[Quiz Parse] Q${i + 1}: Answer=${answerLetter}, Index=${correctIndex}`)

            // Extract question text (everything before first option A.)
            const questionMatch = block.match(/^([\s\S]+?)(?=\nA\.)/m)
            if (!questionMatch) {
                console.log(`[Quiz Parse] Q${i + 1}: Could not extract question text`)
                continue
            }

            const questionText = questionMatch[1].trim()

            // Extract options with more flexible regex
            const optionA = block.match(/\nA\.\s*([^\n]+)/)?.[1]?.trim()
            const optionB = block.match(/\nB\.\s*([^\n]+)/)?.[1]?.trim()
            const optionC = block.match(/\nC\.\s*([^\n]+)/)?.[1]?.trim()
            const optionD = block.match(/\nD\.\s*([^\n]+)/)?.[1]?.trim()

            if (questionText && optionA && optionB) {
                const options = [
                    { text: optionA, isCorrect: correctIndex === 0 },
                    { text: optionB, isCorrect: correctIndex === 1 },
                ]
                if (optionC) options.push({ text: optionC, isCorrect: correctIndex === 2 })
                if (optionD) options.push({ text: optionD, isCorrect: correctIndex === 3 })

                console.log(`[Quiz Parse] Q${i + 1}: "${questionText.substring(0, 50)}..." Correct option: ${answerLetter}`)

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
