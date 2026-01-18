"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { awardPoints, updateActivityStreak } from "./gamification"

/**
 * Mark a lesson as completed
 */
export async function markLessonComplete(lessonId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Check if already completed
        const existing = await prisma.lessonProgress.findUnique({
            where: {
                userId_lessonId: {
                    userId: session.user.id,
                    lessonId,
                },
            },
        })

        if (existing?.completedAt) {
            return { success: true, message: "Already completed" }
        }

        // Mark as complete
        await prisma.lessonProgress.upsert({
            where: {
                userId_lessonId: {
                    userId: session.user.id,
                    lessonId,
                },
            },
            update: {
                completedAt: new Date(),
                lastAccessedAt: new Date(),
            },
            create: {
                userId: session.user.id,
                lessonId,
                completedAt: new Date(),
                lastAccessedAt: new Date(),
            },
        })

        // Gamification: Award points and update streak
        await awardPoints(session.user.id, "LESSON_COMPLETE")
        await updateActivityStreak(session.user.id)

        revalidatePath(`/courses/[slug]/learn`, "page")
        return { success: true }
    } catch (error) {
        console.error("Error marking lesson complete:", error)
        return { error: "Failed to mark lesson as complete" }
    }
}

/**
 * Update lesson progress (for video/content tracking)
 */
export async function updateLessonProgress(
    lessonId: string,
    progressData: { lastAccessedAt?: Date; timeSpent?: number }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.lessonProgress.upsert({
            where: {
                userId_lessonId: {
                    userId: session.user.id,
                    lessonId,
                },
            },
            update: {
                lastAccessedAt: progressData.lastAccessedAt || new Date(),
            },
            create: {
                userId: session.user.id,
                lessonId,
                lastAccessedAt: progressData.lastAccessedAt || new Date(),
            },
        })

        return { success: true }
    } catch (error) {
        console.error("Error updating lesson progress:", error)
        return { error: "Failed to update progress" }
    }
}

/**
 * Get user's progress for a course
 */
export async function getCourseProgress(courseId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return null
    }

    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                Module: {
                    orderBy: { order: "asc" },
                    include: {
                        Lesson: {
                            orderBy: { order: "asc" },
                            include: {
                                Progress: {
                                    where: { userId: session.user.id },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!course) return null

        // Calculate progress
        const totalLessons = course.Module.reduce(
            (acc, module) => acc + module.Lesson.length,
            0
        )
        const completedLessons = course.Module.reduce(
            (acc, module) =>
                acc +
                module.Lesson.filter((lesson) => lesson.Progress[0]?.completedAt)
                    .length,
            0
        )

        const progressPercentage =
            totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        return {
            totalLessons,
            completedLessons,
            progressPercentage,
            modules: course.Module,
        }
    } catch (error) {
        console.error("Error getting course progress:", error)
        return null
    }
}
