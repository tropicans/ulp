"use server"

import { NextRequest, NextResponse } from "next/server"
import { processOutbox, getOutboxStats } from "@/lib/xapi/worker"

// Secret key for authenticating cron requests
const CRON_SECRET = process.env.CRON_SECRET || "xapi-cron-secret-change-me"

/**
 * Process pending xAPI statements from the outbox.
 * This endpoint should be called by a cron job every minute.
 * 
 * Usage: POST /api/cron/xapi-worker
 * Header: x-cron-secret: your-secret
 */
export async function POST(request: NextRequest) {
    // Verify cron secret
    const secret = request.headers.get("x-cron-secret")
    if (secret !== CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        // Process the outbox
        const result = await processOutbox()

        return NextResponse.json({
            success: true,
            processed: result.processed,
            failed: result.failed,
            errors: result.errors.length > 0 ? result.errors : undefined
        })
    } catch (error) {
        console.error("[xAPI Cron] Error processing outbox:", error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
    }
}

/**
 * Get outbox statistics
 * 
 * Usage: GET /api/cron/xapi-worker
 */
export async function GET(request: NextRequest) {
    // Verify cron secret for stats as well
    const secret = request.headers.get("x-cron-secret")
    if (secret !== CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const stats = await getOutboxStats()
        return NextResponse.json(stats)
    } catch (error) {
        console.error("[xAPI Cron] Error getting stats:", error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
    }
}
