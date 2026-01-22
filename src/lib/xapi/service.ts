// xAPI Service for sending statements to Yet Analytics LRS
"use server"

import { XAPIStatement, SendStatementResult } from "./types"
import { PLATFORM_NAME } from "./verbs"

// LRS Configuration from environment
const LRS_ENDPOINT = process.env.LRS_ENDPOINT || "http://lrsql:8080/xapi/statements"
const LRS_API_KEY = process.env.LRS_API_KEY || ""
const LRS_SECRET_KEY = process.env.LRS_SECRET_KEY || ""
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Send an xAPI statement to the LRS with retry logic
 * This is a server action - can be called from client components
 */
export async function sendStatement(statement: XAPIStatement): Promise<SendStatementResult> {
    // Add timestamp if not present
    if (!statement.timestamp) {
        statement.timestamp = new Date().toISOString()
    }

    // Add default context
    if (!statement.context) {
        statement.context = {}
    }
    statement.context.platform = PLATFORM_NAME
    statement.context.language = "id"

    // Create Basic Auth header
    const auth = Buffer.from(`${LRS_API_KEY}:${LRS_SECRET_KEY}`).toString("base64")

    let lastError: string = ""

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[xAPI] Attempt ${attempt}/${MAX_RETRIES}: Sending ${statement.verb.display.en} for ${statement.object.id}`)

            const response = await fetch(LRS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`,
                    "X-Experience-API-Version": "1.0.3"
                },
                body: JSON.stringify(statement)
            })

            if (!response.ok) {
                const errorText = await response.text()
                lastError = `LRS error: ${response.status} - ${errorText}`
                console.error(`[xAPI] Attempt ${attempt} failed:`, lastError)

                // Don't retry on client errors (4xx)
                if (response.status >= 400 && response.status < 500) {
                    break
                }

                // Retry on server errors (5xx)
                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAY_MS * attempt)
                    continue
                }
            } else {
                // Success!
                const result = await response.json()
                const statementId = Array.isArray(result) ? result[0] : result
                console.log("[xAPI] Statement sent successfully:", statementId)
                return { success: true, statementId }
            }
        } catch (error) {
            lastError = error instanceof Error ? error.message : "Unknown error"
            console.error(`[xAPI] Attempt ${attempt} exception:`, lastError)

            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS * attempt)
            }
        }
    }

    console.error("[xAPI] All retry attempts failed:", lastError)
    return { success: false, error: lastError }
}

/**
 * Send statement asynchronously (fire-and-forget with retry)
 * Use this when you don't need to wait for the result
 */
export async function sendStatementAsync(statement: XAPIStatement): Promise<void> {
    // Just call sendStatement but don't return the result
    // Errors are logged but not thrown
    await sendStatement(statement).catch(err => {
        console.error("[xAPI] Async statement finally failed:", err)
    })
}
