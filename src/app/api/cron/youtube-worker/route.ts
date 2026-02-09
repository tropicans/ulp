"use server"

import { NextRequest, NextResponse } from "next/server"
import { processPendingJobs } from "@/lib/actions/youtube"

const CRON_SECRET = process.env.CRON_SECRET || "titan-cron-secret-change-me"

export async function POST(request: NextRequest) {
    const cronSecret = request.headers.get("x-cron-secret")

    if (cronSecret !== CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const startTime = Date.now()
        await processPendingJobs()
        const durationMs = Date.now() - startTime

        return NextResponse.json({
            success: true,
            message: "YouTube processing jobs executed",
            durationMs
        })
    } catch (error: any) {
        console.error("YouTube worker error:", error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
