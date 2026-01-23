"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { awardPoints, updateActivityStreak } from "./gamification"
import {
    queueStatement,
    genIdempotencyKey,
    recordActivity,
    buildActor,
    buildActivity,
    buildResult
} from "@/lib/xapi"
import { VERBS, ACTIVITY_TYPES, PLATFORM_IRI } from "@/lib/xapi/verbs"

/**
 * Mark a lesson as completed
 * Uses outbox pattern for reliable xAPI emission
 */
export async function markLessonComplete(lessonId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Check if already completed
        const existing = await prisma.progress.findUnique({
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

        // Get lesson and course info for xAPI
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { Module: { include: { Course: { select: { id: true, slug: true, title: true } } } } }
        })

        // Mark as complete
        await prisma.progress.upsert({
            where: {
                userId_lessonId: {
                    userId: session.user.id,
                    lessonId,
                },
            },
            update: {
                isCompleted: true,
                completedAt: new Date(),
                updatedAt: new Date(),
            },
            create: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                lessonId,
                isCompleted: true,
                completedAt: new Date(),
                updatedAt: new Date(),
            },
        })

        // Gamification: Award points and update streak
        await awardPoints(session.user.id, "LESSON_COMPLETE")
        await updateActivityStreak(session.user.id)

        // Queue xAPI statement (outbox pattern - reliable & idempotent)
        if (lesson) {
            const courseId = lesson.Module.Course.id
            const courseSlug = lesson.Module.Course.slug

            // Queue xAPI statement for LRS
            queueStatement(
                {
                    actor: buildActor(session.user.email || '', session.user.name),
                    verb: VERBS.completed,
                    object: buildActivity(
                        `${PLATFORM_IRI}/courses/${courseSlug}/lessons/${lessonId}`,
                        ACTIVITY_TYPES.lesson,
                        lesson.title,
                        `Lesson in ${lesson.Module.Course.title}`
                    ),
                    result: buildResult({ completion: true })
                },
                genIdempotencyKey("lesson_complete", session.user.id, lessonId)
            )

            // Record to unified journey
            recordActivity(
                session.user.id,
                "LESSON_COMPLETE",
                lessonId,
                lesson.title,
                courseId
            )
        }

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
        await prisma.progress.upsert({
            where: {
                userId_lessonId: {
                    userId: session.user.id,
                    lessonId,
                },
            },
            update: {
                updatedAt: progressData.lastAccessedAt || new Date(),
            },
            create: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                lessonId,
                updatedAt: progressData.lastAccessedAt || new Date(),
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
