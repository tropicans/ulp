"use server"

import { auth } from "@/lib/auth"

// LRS Configuration
const LRS_ENDPOINT = process.env.LRS_ENDPOINT || "http://lrsql:8080/xapi/statements"
const LRS_API_KEY = process.env.LRS_API_KEY || ""
const LRS_SECRET_KEY = process.env.LRS_SECRET_KEY || ""

interface XAPIStatementResponse {
    statements: any[]
    more?: string
}

/**
 * Fetch xAPI statements from the LRS
 * Admin only - for analytics dashboard
 */
export async function getXAPIStatements(options: {
    limit?: number
    verb?: string
    agent?: string // email
    activity?: string
    since?: string // ISO date
    until?: string // ISO date
} = {}): Promise<{ statements: any[], error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { statements: [], error: "Unauthorized" }
    }

    // Only admins can view all statements
    if (!["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { statements: [], error: "Access denied" }
    }

    try {
        const auth = Buffer.from(`${LRS_API_KEY}:${LRS_SECRET_KEY}`).toString("base64")

        const params = new URLSearchParams()
        if (options.limit) params.set("limit", options.limit.toString())
        if (options.verb) params.set("verb", options.verb)
        if (options.agent) params.set("agent", JSON.stringify({ mbox: `mailto:${options.agent}` }))
        if (options.activity) params.set("activity", options.activity)
        if (options.since) params.set("since", options.since)
        if (options.until) params.set("until", options.until)

        const url = `${LRS_ENDPOINT}?${params.toString()}`

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "X-Experience-API-Version": "1.0.3",
                "Accept": "application/json"
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("[xAPI] Failed to fetch statements:", response.status, errorText)
            return { statements: [], error: `LRS error: ${response.status}` }
        }

        const data: XAPIStatementResponse = await response.json()
        return { statements: data.statements || [] }
    } catch (error) {
        console.error("[xAPI] Error fetching statements:", error)
        return { statements: [], error: error instanceof Error ? error.message : "Unknown error" }
    }
}

/**
 * Get xAPI summary statistics
 */
export async function getXAPIStats(): Promise<{
    totalStatements: number
    enrollments: number
    completions: number
    quizAttempts: number
    videoEvents: number
    error?: string
}> {
    const session = await auth()
    if (!session?.user?.id || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { totalStatements: 0, enrollments: 0, completions: 0, quizAttempts: 0, videoEvents: 0, error: "Unauthorized" }
    }

    try {
        const auth = Buffer.from(`${LRS_API_KEY}:${LRS_SECRET_KEY}`).toString("base64")

        // Fetch last 500 statements for stats
        const response = await fetch(`${LRS_ENDPOINT}?limit=500`, {
            headers: {
                "Authorization": `Basic ${auth}`,
                "X-Experience-API-Version": "1.0.3",
                "Accept": "application/json"
            }
        })

        if (!response.ok) {
            return { totalStatements: 0, enrollments: 0, completions: 0, quizAttempts: 0, videoEvents: 0, error: "Failed to fetch" }
        }

        const data: XAPIStatementResponse = await response.json()
        const statements = data.statements || []

        // Count by verb type
        let enrollments = 0
        let completions = 0
        let quizAttempts = 0
        let videoEvents = 0

        for (const stmt of statements) {
            const verbId = stmt.verb?.id || ""
            if (verbId.includes("registered")) enrollments++
            else if (verbId.includes("completed")) completions++
            else if (verbId.includes("passed") || verbId.includes("failed")) quizAttempts++
            else if (verbId.includes("played") || verbId.includes("paused") || verbId.includes("seeked")) videoEvents++
        }

        return {
            totalStatements: statements.length,
            enrollments,
            completions,
            quizAttempts,
            videoEvents
        }
    } catch (error) {
        console.error("[xAPI] Error fetching stats:", error)
        return { totalStatements: 0, enrollments: 0, completions: 0, quizAttempts: 0, videoEvents: 0, error: "Error" }
    }
}
