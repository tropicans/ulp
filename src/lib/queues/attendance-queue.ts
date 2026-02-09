/**
 * Attendance Queue Service
 * 
 * High-concurrency attendance processing using Redis queue
 * Designed for 5000+ concurrent check-ins during live learning sessions
 * 
 * Flow:
 * 1. User checks in → queueAttendanceCheckIn() (instant response)
 * 2. Background worker → processAttendanceQueue() (batch insert every 5 seconds)
 */
import { getRedis, QUEUE_KEYS, queuePush, queueLength } from "@/lib/redis"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { AttendanceMethod, AttendanceStatus } from "@/generated/prisma"

export interface QueuedAttendance {
    userId: string
    sessionId: string
    method: AttendanceMethod
    status: AttendanceStatus
    checkInAt: string // ISO string
    latitude?: number
    longitude?: number
    userEmail?: string
    userName?: string
}

/**
 * Queue attendance check-in for batch processing
 * Returns immediately for fast user experience
 */
export async function queueAttendanceCheckIn(
    data: QueuedAttendance
): Promise<{ queued: boolean; position: number }> {
    try {
        await queuePush(QUEUE_KEYS.ATTENDANCE, {
            ...data,
            queuedAt: new Date().toISOString(),
        })

        const position = await queueLength(QUEUE_KEYS.ATTENDANCE)

        return { queued: true, position }
    } catch (error) {
        console.error("[ATTENDANCE_QUEUE] Error queuing:", error)
        throw error
    }
}

/**
 * Process attendance queue - batch insert
 * Should be called by cron or background worker every 5 seconds
 */
export async function processAttendanceQueue(
    batchSize: number = 100
): Promise<{ processed: number; errors: number }> {
    const redis = getRedis()
    let processed = 0
    let errors = 0

    try {
        // Get batch of items from queue
        const items: QueuedAttendance[] = []

        for (let i = 0; i < batchSize; i++) {
            const item = await redis.rpop(QUEUE_KEYS.ATTENDANCE)
            if (!item) break
            items.push(JSON.parse(item))
        }

        if (items.length === 0) {
            return { processed: 0, errors: 0 }
        }

        console.log(`[ATTENDANCE_QUEUE] Processing ${items.length} items`)

        // Prepare batch insert data
        const attendanceData = items.map((item) => ({
            id: crypto.randomUUID(),
            userId: item.userId,
            sessionId: item.sessionId,
            status: item.status,
            checkInAt: new Date(item.checkInAt),
            method: item.method,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            updatedAt: new Date(),
        }))

        // Batch insert with upsert to handle duplicates
        const result = await prisma.$transaction(async (tx) => {
            let successCount = 0

            for (const data of attendanceData) {
                try {
                    await tx.attendance.upsert({
                        where: {
                            userId_sessionId: {
                                userId: data.userId,
                                sessionId: data.sessionId,
                            }
                        },
                        create: data,
                        update: {}, // Don't update if exists
                    })
                    successCount++
                } catch {
                    errors++
                }
            }

            return successCount
        })

        processed = result

        // Revalidate unique session paths
        const uniqueSessions = [...new Set(items.map(i => i.sessionId))]
        for (const sessionId of uniqueSessions) {
            revalidatePath(`/dashboard/sessions/${sessionId}`)
        }

        console.log(`[ATTENDANCE_QUEUE] Processed ${processed}, Errors: ${errors}`)

    } catch (error) {
        console.error("[ATTENDANCE_QUEUE] Processing error:", error)
        errors++
    }

    return { processed, errors }
}

/**
 * Get queue status for monitoring
 */
export async function getAttendanceQueueStatus(): Promise<{
    queueLength: number
    isHealthy: boolean
}> {
    try {
        const length = await queueLength(QUEUE_KEYS.ATTENDANCE)
        return {
            queueLength: length,
            isHealthy: length < 1000, // Alert if queue backs up
        }
    } catch {
        return { queueLength: -1, isHealthy: false }
    }
}
