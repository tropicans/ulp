"use server"

import { prisma } from "@/lib/db"

const PROXY_BASE = process.env.AI_PROXY_URL || "https://proxy.kelazz.my.id"
const API_KEY = process.env.AI_PROXY_KEY || "internal_only_x91aP"
const AI_MODEL = process.env.AI_MODEL || "gpt-5.1"

/**
 * Common fetch wrapper for AI Proxy
 */
async function callAIProxy(prompt: string, endpoint: string = "/v1/responses") {
    const response = await fetch(`${PROXY_BASE}${endpoint}`, {
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

    if (!response.ok) {
        throw new Error(`AI Proxy Error: ${response.status}`)
    }

    const data = await response.json()
    return data.output?.[0]?.content?.[0]?.text ||
        data.choices?.[0]?.message?.content ||
        data.content ||
        ""
}

/**
 * Automate course info generation
 */
export async function autoGenerateCourseInfo(courseId: string) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, ytPlaylistId: true, courseShortDesc: true }
    })

    if (!course?.ytPlaylistId || course.courseShortDesc) return

    const items = await prisma.ytPlaylistItem.findMany({
        where: { playlistId: course.ytPlaylistId },
        select: { transcript: true, videoTitle: true },
        take: 5
    })

    const transcript = items.filter(i => i.transcript).map(i => i.transcript).join("\n\n").substring(0, 5000)
    if (transcript.length < 200) return

    const prompt = `Based on these transcripts, generate a professional description and short summary for a course titled "${course.title}". 
    Return ONLY JSON with "shortDesc" (max 160 chars) and "description" (max 500 words).`

    try {
        const result = await callAIProxy(prompt)
        const json = JSON.parse(result.replace(/```json|```/g, "").trim())
        await prisma.course.update({
            where: { id: courseId },
            data: {
                courseShortDesc: json.shortDesc,
                description: json.description,
                updatedAt: new Date()
            }
        })
        console.log(`[AI Curator] Updated info for course: ${courseId}`)
    } catch (e) {
        console.error("[AI Curator] Course info gen failed:", e)
    }
}

/**
 * Automate quiz generation
 */
export async function autoGenerateQuizzes(courseId: string) {
    const modules = await prisma.module.findMany({
        where: { courseId },
        include: { Quiz: true }
    })

    for (const mod of modules) {
        if (mod.Quiz.length === 0) {
            // Create Pretest and Posttest place holders
            const quiz = await prisma.quiz.create({
                data: {
                    id: crypto.randomUUID(),
                    title: `Checkpoints: ${mod.title}`,
                    moduleId: mod.id,
                    type: "QUIZ",
                    updatedAt: new Date(),
                    isAIGenerated: true
                }
            })
            console.log(`[AI Curator] Created empty quiz ${quiz.id} for module ${mod.id}. Questions will be generated in background.`)

            // Logic to call the actual generate-quiz-questions endpoint or similar logic here
        }
    }
}
