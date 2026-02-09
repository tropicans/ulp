/**
 * Attendance Queue Worker API
 * 
 * Called by cron every minute to process attendance check-ins in batches
 * Designed to handle high-concurrency during live learning sessions
 */
import { NextRequest, NextResponse } from "next/server"
import { processAttendanceQueue, getAttendanceQueueStatus } from "@/lib/queues/attendance-queue"

export async function POST(request: NextRequest) {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret")
    const expectedSecret = process.env.CRON_SECRET || "titan-cron-secret-change-me"

    if (cronSecret !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const startTime = Date.now()

    try {
        // Process queue in batches
        const result = await processAttendanceQueue(100)

        const duration = Date.now() - startTime

        return NextResponse.json({
            success: true,
            processed: result.processed,
            errors: result.errors,
            durationMs: duration,
        })
    } catch (error) {
        console.error("[ATTENDANCE_WORKER] Error:", error)
        return NextResponse.json(
            { error: "Worker failed" },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const status = await getAttendanceQueueStatus()
        return NextResponse.json(status)
    } catch {
        return NextResponse.json(
            { error: "Failed to get status" },
            { status: 500 }
        )
    }
}
