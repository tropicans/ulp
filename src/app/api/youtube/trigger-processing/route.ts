"use server"

import { NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/actions/youtube";

export async function POST() {
    try {
        // Trigger background processing
        processPendingJobs().catch(err => console.error("Worker error:", err));

        return NextResponse.json({
            success: true,
            message: "Processing triggered successfully"
        });
    } catch (error) {
        console.error("Error triggering processing:", error);
        return NextResponse.json({ error: "Failed to trigger processing" }, { status: 500 });
    }
}
