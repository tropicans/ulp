// Policy definition - not a server action file

import { Policy, PolicyContext } from "../orchestrator"
import { prisma } from "@/lib/db"
import { generateCourseCertificate } from "@/lib/actions/certificates"

/**
 * Auto-Certificate Policy
 * Automatically issues a certificate when a learner completes a course.
 */
export const AutoCertificatePolicy: Policy = {
    name: "Auto-Certificate",
    description: "Automatically issue a certificate when a course is 100% complete",
    activityTypes: ["LESSON_COMPLETE", "QUIZ_PASS"],

    shouldExecute: async (ctx: PolicyContext) => {
        if (!ctx.courseId) return false

        // Check if user already has a certificate for this course
        const existing = await prisma.certificate.findFirst({
            where: { userId: ctx.userId, courseId: ctx.courseId }
        })
        if (existing) return false

        // Check for 100% completion (copied logic from generateCourseCertificate for evaluation)
        const course = await prisma.course.findUnique({
            where: { id: ctx.courseId },
            include: {
                Module: {
                    include: {
                        Lesson: {
                            include: {
                                Progress: { where: { userId: ctx.userId } }
                            }
                        }
                    }
                }
            }
        })

        if (!course) return false

        const allLessons = course.Module.flatMap(m => m.Lesson)
        const completedLessons = allLessons.filter(l => l.Progress.length > 0 && l.Progress[0].isCompleted)

        return allLessons.length > 0 && completedLessons.length === allLessons.length
    },

    execute: async (ctx: PolicyContext) => {
        if (!ctx.courseId) return
        console.log(`[Policy: Auto-Certificate] Issuing certificate for user ${ctx.userId} on course ${ctx.courseId}`)

        // We trigger the generator. Note: generateCourseCertificate uses auth() to get the user.
        // For background execution, we might need a version that accepts a userId.
        // However, in this project's context, the user is usually in session 
        // because recordActivity is called from server actions initiated by the user.
        await generateCourseCertificate(ctx.courseId)
    }
}
