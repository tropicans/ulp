"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendStatementAsync, buildActor, buildActivity } from "@/lib/xapi"
import { VERBS, ACTIVITY_TYPES, PLATFORM_IRI } from "@/lib/xapi/verbs"
import { XAPIStatement } from "@/lib/xapi/types"

/**
 * Track video play event
 */
export async function trackVideoPlay(
    lessonId: string,
    videoId: string,
    currentTime: number // in seconds
) {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
        return { error: "Unauthorized" }
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { Module: { include: { Course: { select: { slug: true } } } } }
    })

    if (!lesson) return { error: "Lesson not found" }

    const statement: XAPIStatement = {
        actor: buildActor(session.user.email, session.user.name),
        verb: VERBS.played,
        object: buildActivity(
            `${PLATFORM_IRI}/courses/${lesson.Module.Course.slug}/lessons/${lessonId}/video/${videoId}`,
            ACTIVITY_TYPES.video,
            lesson.title
        ),
        context: {
            extensions: {
                "https://w3id.org/xapi/video/extensions/time": currentTime
            }
        }
    }

    sendStatementAsync(statement)
    return { success: true }
}

/**
 * Track video pause event
 */
export async function trackVideoPause(
    lessonId: string,
    videoId: string,
    currentTime: number,
    duration: number
) {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
        return { error: "Unauthorized" }
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { Module: { include: { Course: { select: { slug: true } } } } }
    })

    if (!lesson) return { error: "Lesson not found" }

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

    const statement: XAPIStatement = {
        actor: buildActor(session.user.email, session.user.name),
        verb: VERBS.paused,
        object: buildActivity(
            `${PLATFORM_IRI}/courses/${lesson.Module.Course.slug}/lessons/${lessonId}/video/${videoId}`,
            ACTIVITY_TYPES.video,
            lesson.title
        ),
        result: {
            extensions: {
                "https://w3id.org/xapi/video/extensions/time": currentTime,
                "https://w3id.org/xapi/video/extensions/progress": progressPercent
            }
        }
    }

    sendStatementAsync(statement)
    return { success: true }
}

/**
 * Track video seek event
 */
export async function trackVideoSeek(
    lessonId: string,
    videoId: string,
    fromTime: number,
    toTime: number
) {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
        return { error: "Unauthorized" }
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { Module: { include: { Course: { select: { slug: true } } } } }
    })

    if (!lesson) return { error: "Lesson not found" }

    const statement: XAPIStatement = {
        actor: buildActor(session.user.email, session.user.name),
        verb: VERBS.seeked,
        object: buildActivity(
            `${PLATFORM_IRI}/courses/${lesson.Module.Course.slug}/lessons/${lessonId}/video/${videoId}`,
            ACTIVITY_TYPES.video,
            lesson.title
        ),
        context: {
            extensions: {
                "https://w3id.org/xapi/video/extensions/time-from": fromTime,
                "https://w3id.org/xapi/video/extensions/time-to": toTime
            }
        }
    }

    sendStatementAsync(statement)
    return { success: true }
}

/**
 * Track video completed (watched to end)
 */
export async function trackVideoCompleted(
    lessonId: string,
    videoId: string,
    duration: number
) {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
        return { error: "Unauthorized" }
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { Module: { include: { Course: { select: { slug: true } } } } }
    })

    if (!lesson) return { error: "Lesson not found" }

    const statement: XAPIStatement = {
        actor: buildActor(session.user.email, session.user.name),
        verb: VERBS.completed,
        object: buildActivity(
            `${PLATFORM_IRI}/courses/${lesson.Module.Course.slug}/lessons/${lessonId}/video/${videoId}`,
            ACTIVITY_TYPES.video,
            lesson.title
        ),
        result: {
            completion: true,
            duration: `PT${Math.round(duration)}S` // ISO 8601 duration
        }
    }

    sendStatementAsync(statement)
    return { success: true }
}
