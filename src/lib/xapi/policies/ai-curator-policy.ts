"use server"

import { Policy, PolicyContext } from "../orchestrator"
import { autoGenerateCourseInfo, autoGenerateQuizzes } from "./ai-utils"
import { prisma } from "@/lib/db"

/**
 * AI Auto-Curator Policy
 * Automatically generates course info and quizzes for personal learning paths.
 */
export const AIAutoCuratorPolicy: Policy = {
    name: "AI-Auto-Curator",
    description: "Automatically enhances personal menus with AI-generated info and quizzes",
    activityTypes: ["ENROLLMENT", "MATERIAL_ADDED"], // Triggered on start and on content addition

    shouldExecute: async (ctx: PolicyContext) => {
        if (!ctx.courseId) return false

        // Only act on PERSONAL menus
        const course = await prisma.course.findUnique({
            where: { id: ctx.courseId },
            select: { category: true, instructorId: true }
        })

        // Check if it's a personal menu created by the user
        return course?.category === "PERSONAL" && course.instructorId === ctx.userId
    },

    execute: async (ctx: PolicyContext) => {
        if (!ctx.courseId) return

        console.log(`[Policy: AI Curator] Starting auto-enrichment for course ${ctx.courseId}`)

        // 1. Generate Course Info (Description, Short Desc)
        autoGenerateCourseInfo(ctx.courseId).catch(err =>
            console.error(`[AI Curator] Info generation failed:`, err)
        )

        // 2. Generate Quizzes (Pre/Post/Checks)
        autoGenerateQuizzes(ctx.courseId).catch(err =>
            console.error(`[AI Curator] Quiz generation failed:`, err)
        )
    }
}
