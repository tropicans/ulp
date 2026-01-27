"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { SyncCourseStatus } from "@/generated/prisma"
import { recordActivity } from "@/lib/xapi/outbox"
import { revalidatePath } from "next/cache"
import { SyncCourseConfig, ConceptMarker, ValidationResponse } from "@/lib/types/sync-course"

// ============================================
// GET SYNC COURSE PROGRESS
// ============================================

export async function getSyncCourseProgress(courseId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const progress = await prisma.syncCourseProgress.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: courseId
            }
        }
    })

    return progress || {
        status: SyncCourseStatus.NOT_STARTED,
        preLearnAccessedAt: null,
        liveAccessedAt: null,
        liveWatchDuration: 0,
        postLearnSubmittedAt: null,
        conceptMarkers: null,
        assessmentScore: null,
        completedAt: null
    }
}

// ============================================
// RECORD PRE-LEARNING ACCESS
// ============================================

export async function recordPreLearningAccess(courseId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const progress = await prisma.syncCourseProgress.upsert({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            },
            create: {
                userId: session.user.id,
                courseId: courseId,
                preLearnAccessedAt: new Date(),
                status: SyncCourseStatus.IN_PROGRESS
            },
            update: {
                preLearnAccessedAt: new Date(),
                status: SyncCourseStatus.IN_PROGRESS
            }
        })

        // Record activity for journey
        await recordActivity(
            session.user.id,
            "MATERIAL_ADDED",
            courseId,
            "Pre-Learning: Advance Organizer",
            courseId,
            { type: "SYNC_PRE_LEARNING" }
        )

        console.log(`[SyncCourse] Recorded pre-learning access for user ${session.user.id}`)
        return { success: true, progress }
    } catch (error: any) {
        console.error("[SyncCourse] Error recording pre-learning access:", error)
        return { error: error.message }
    }
}

// ============================================
// RECORD LIVE SESSION ACCESS
// ============================================

export async function recordLiveSessionAccess(courseId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    // Check if pre-learning is completed first
    const existing = await prisma.syncCourseProgress.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: courseId
            }
        }
    })

    if (!existing?.preLearnAccessedAt) {
        return { error: "Pre-learning belum diakses", requirePreLearning: true }
    }

    try {
        const progress = await prisma.syncCourseProgress.update({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            },
            data: {
                liveAccessedAt: new Date()
            }
        })

        // Record activity - this counts as ATTENDANCE per PRD
        await recordActivity(
            session.user.id,
            "ATTENDANCE",
            courseId,
            "Live Session: YouTube Live",
            courseId,
            { type: "SYNC_LIVE_SESSION" }
        )

        console.log(`[SyncCourse] Recorded live session access for user ${session.user.id}`)
        return { success: true, progress }
    } catch (error: any) {
        console.error("[SyncCourse] Error recording live session access:", error)
        return { error: error.message }
    }
}

// ============================================
// UPDATE LIVE WATCH DURATION
// ============================================

const MINIMUM_WATCH_PERCENT = 60 // 60% minimum watch time required

export async function updateLiveWatchDuration(courseId: string, durationSeconds: number) {
    const session = await auth()
    if (!session?.user) {
        return { error: "Not authenticated" }
    }

    try {
        const progress = await prisma.syncCourseProgress.upsert({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            },
            update: {
                liveWatchDuration: durationSeconds
            },
            create: {
                userId: session.user.id,
                courseId: courseId,
                liveWatchDuration: durationSeconds
            }
        })

        return { success: true, watchDuration: progress.liveWatchDuration }
    } catch (error: any) {
        console.error("[SyncCourse] Error updating watch duration:", error)
        return { error: error.message }
    }
}

// ============================================
// CHECK IF MINIMUM WATCH TIME REACHED
// ============================================

export async function checkMinimumWatchTime(courseId: string) {
    const session = await auth()
    if (!session?.user) {
        return { error: "Not authenticated", canAccessValidation: false }
    }

    try {
        // Get course duration (in minutes)
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { duration: true }
        })

        if (!course) {
            return { error: "Course not found", canAccessValidation: false }
        }

        // Get user progress
        const progress = await prisma.syncCourseProgress.findUnique({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            }
        })

        // Duration is in JP (45 minutes each), convert to seconds
        const requiredSeconds = (course.duration || 2) * 45 * 60 * (MINIMUM_WATCH_PERCENT / 100)
        const watchedSeconds = progress?.liveWatchDuration || 0
        const percentWatched = Math.min(100, Math.round((watchedSeconds / ((course.duration || 2) * 45 * 60)) * 100))

        const canAccess = watchedSeconds >= requiredSeconds

        return {
            success: true,
            canAccessValidation: canAccess,
            watchedSeconds,
            requiredSeconds: Math.round(requiredSeconds),
            percentWatched,
            minimumPercent: MINIMUM_WATCH_PERCENT
        }
    } catch (error: any) {
        console.error("[SyncCourse] Error checking watch time:", error)
        return { error: error.message, canAccessValidation: false }
    }
}

// ============================================
// SAVE CONCEPT MARKER
// ============================================

export async function saveConceptMarker(courseId: string, marker: ConceptMarker) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const existing = await prisma.syncCourseProgress.findUnique({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            }
        })

        const existingMarkers = (existing?.conceptMarkers as unknown as ConceptMarker[]) || []
        const updatedMarkers = [...existingMarkers, marker]

        const progress = await prisma.syncCourseProgress.update({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            },
            data: {
                conceptMarkers: updatedMarkers as any
            }
        })

        console.log(`[SyncCourse] Saved concept marker for user ${session.user.id}`)
        return { success: true, progress }
    } catch (error: any) {
        console.error("[SyncCourse] Error saving concept marker:", error)
        return { error: error.message }
    }
}

// ============================================
// SUBMIT CONCEPT VALIDATION (POST-LEARNING)
// ============================================

export async function submitConceptValidation(
    courseId: string,
    responses: ValidationResponse[],
    config: SyncCourseConfig
) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    // Check prerequisites
    const existing = await prisma.syncCourseProgress.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: courseId
            }
        }
    })

    if (!existing?.preLearnAccessedAt || !existing?.liveAccessedAt) {
        return { error: "Pre-learning dan live session harus diselesaikan terlebih dahulu" }
    }

    try {
        // Calculate score (for record only, doesn't affect completion)
        let correctCount = 0
        const questions = config.conceptValidation.questions

        for (const response of responses) {
            const question = questions.find(q => q.id === response.questionId)
            if (question && question.correctOptionId === response.selectedOptionId) {
                correctCount++
            }
        }

        const score = questions.length > 0
            ? Math.round((correctCount / questions.length) * 100)
            : 0

        // Update progress - AUTO-PASS regardless of score
        const progress = await prisma.syncCourseProgress.update({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: courseId
                }
            },
            data: {
                postLearnSubmittedAt: new Date(),
                assessmentScore: score,
                assessmentResponse: responses as any,
                status: SyncCourseStatus.COMPLETED,
                completedAt: new Date()
            }
        })

        // Record quiz activity
        await recordActivity(
            session.user.id,
            "QUIZ_PASS", // Always pass per PRD
            courseId,
            "Concept Validation Assessment",
            courseId,
            { type: "SYNC_CONCEPT_VALIDATION", score }
        )

        // Update enrollment status to COMPLETED
        await prisma.enrollment.updateMany({
            where: {
                userId: session.user.id,
                courseId: courseId
            },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
                progressPercent: 100
            }
        })

        // Trigger certificate generation
        await generateSyncCourseCertificate(courseId, session.user.id)

        console.log(`[SyncCourse] User ${session.user.id} completed course ${courseId} with score ${score}%`)
        revalidatePath(`/courses`)

        return {
            success: true,
            progress,
            score,
            completed: true
        }
    } catch (error: any) {
        console.error("[SyncCourse] Error submitting concept validation:", error)
        return { error: error.message }
    }
}

// ============================================
// GENERATE SYNC COURSE CERTIFICATE
// ============================================

async function generateSyncCourseCertificate(courseId: string, userId: string) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { title: true }
        })

        if (!course) {
            console.error("[SyncCourse] Course not found for certificate generation")
            return null
        }

        // Generate certificate number
        const certificateNo = `SYNC-${Date.now()}-${userId.slice(-6).toUpperCase()}`
        const verificationCode = `V${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

        const certificate = await prisma.certificate.create({
            data: {
                id: `cert_${Date.now()}`,
                userId: userId,
                courseId: courseId,
                certificateNo: certificateNo,
                verificationCode: verificationCode,
                issuedAt: new Date(),
                isValid: true
            }
        })

        // Record certificate activity
        await recordActivity(
            userId,
            "CERTIFICATE",
            certificate.id,
            `Sertifikat: ${course.title}`,
            courseId,
            {
                type: "SYNC_COURSE_CERTIFICATE",
                certificateNo: certificateNo,
                // PRD-compliant wording
                statement: "Telah mengikuti dan menyelesaikan seluruh rangkaian pembelajaran sinkronus berbasis pengetahuan pada course ini."
            }
        )

        console.log(`[SyncCourse] Generated certificate ${certificateNo} for user ${userId}`)
        return certificate
    } catch (error) {
        console.error("[SyncCourse] Error generating certificate:", error)
        return null
    }
}

// ============================================
// GET SYNC COURSE CONFIG
// ============================================

export async function getSyncCourseConfig(courseId: string): Promise<SyncCourseConfig | null> {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { syncConfig: true }
    })

    return course?.syncConfig as SyncCourseConfig | null
}

// ============================================
// UPDATE SYNC COURSE CONFIG (INSTRUCTOR)
// ============================================

export async function updateSyncCourseConfig(courseId: string, config: SyncCourseConfig) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    // Check if user is instructor of this course
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true }
    })

    if (course?.instructorId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
        return { error: "Forbidden" }
    }

    try {
        const updated = await prisma.course.update({
            where: { id: courseId },
            data: {
                syncConfig: config as any,
                deliveryMode: "SYNC_ONLINE"
            },
            select: { id: true, slug: true }
        })

        revalidatePath(`/courses/${updated.slug}`)
        revalidatePath(`/courses/${updated.slug}/sync/live`)
        revalidatePath(`/courses/${updated.slug}/sync/pre-learning`)
        revalidatePath(`/courses/${updated.slug}/sync/validation`)
        revalidatePath(`/dashboard/instructor`)

        return { success: true, course: updated }
    } catch (error: any) {
        console.error("[SyncCourse] Error updating config:", error)
        return { error: error.message }
    }
}
