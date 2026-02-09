"use server"

import { prisma } from "@/lib/db"
import { sendStatement } from "./service"
import { XAPIStatement } from "./types"

const MAX_ATTEMPTS = 5
const BATCH_SIZE = 50

interface OutboxItem {
    id: string
    idempotency_key: string
    statement: XAPIStatement
    status: string
    attempts: number
}

/**
 * Process pending xAPI statements from the outbox.
 * This should be called by a cron job or background worker.
 * 
 * Flow:
 * 1. Fetch batch of PENDING items (oldest first)
 * 2. Send each to LRS
 * 3. Mark as SENT on success, increment attempts on failure
 * 4. Move to DLQ after MAX_ATTEMPTS failures
 */
export async function processOutbox(): Promise<{ processed: number; failed: number; errors: string[] }> {
    let processed = 0
    let failed = 0
    const errors: string[] = []

    try {
        // Fetch pending items
        const items = await prisma.$queryRaw<OutboxItem[]>`
            SELECT id, idempotency_key, statement, status, attempts
            FROM xapi_outbox
            WHERE status = 'PENDING' AND attempts < ${MAX_ATTEMPTS}
            ORDER BY created_at ASC
            LIMIT ${BATCH_SIZE}
        `

        console.log(`[xAPI Worker] Processing ${items.length} pending statements`)

        for (const item of items) {
            try {
                // Send to LRS
                const result = await sendStatement(item.statement)

                if (result.success) {
                    // Mark as sent
                    await prisma.$executeRaw`
                        UPDATE xapi_outbox 
                        SET status = 'SENT', processed_at = NOW()
                        WHERE id::text = ${item.id}
                    `
                    processed++
                    console.log(`[xAPI Worker] ✅ Sent: ${item.idempotency_key}`)
                } else {
                    // Increment attempts and record error
                    await markFailed(item.id, item.attempts, result.error || "Unknown error")
                    failed++
                    errors.push(`${item.idempotency_key}: ${result.error}`)
                }
            } catch (error: any) {
                await markFailed(item.id, item.attempts, error.message)
                failed++
                errors.push(`${item.idempotency_key}: ${error.message}`)
            }
        }

        console.log(`[xAPI Worker] Completed: ${processed} sent, ${failed} failed`)
        return { processed, failed, errors }

    } catch (error: any) {
        console.error(`[xAPI Worker] Fatal error:`, error)
        return { processed, failed, errors: [error.message] }
    }
}

/**
 * Mark an item as failed, moving to DLQ if max attempts reached
 */
async function markFailed(id: string, currentAttempts: number, error: string) {
    const newAttempts = currentAttempts + 1
    const newStatus = newAttempts >= MAX_ATTEMPTS ? "DLQ" : "PENDING"

    await prisma.$executeRaw`
        UPDATE xapi_outbox 
        SET attempts = ${newAttempts}, 
            last_error = ${error},
            status = ${newStatus}
        WHERE id::text = ${id}
    `

    if (newStatus === "DLQ") {
        console.warn(`[xAPI Worker] ⚠️ Moved to DLQ after ${MAX_ATTEMPTS} attempts: ${id}`)
    }
}

/**
 * Get outbox statistics for monitoring
 */
export async function getOutboxStats(): Promise<{
    pending: number
    sent: number
    failed: number
    dlq: number
}> {
    const stats = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT status, COUNT(*) as count
        FROM xapi_outbox
        GROUP BY status
    `

    const result = { pending: 0, sent: 0, failed: 0, dlq: 0 }
    for (const row of stats) {
        const count = Number(row.count)
        switch (row.status) {
            case "PENDING": result.pending = count; break
            case "SENT": result.sent = count; break
            case "FAILED": result.failed = count; break
            case "DLQ": result.dlq = count; break
        }
    }
    return result
}

/**
 * Retry DLQ items (manual intervention)
 */
export async function retryDLQ(): Promise<{ moved: number }> {
    const result = await prisma.$executeRaw`
        UPDATE xapi_outbox 
        SET status = 'PENDING', attempts = 0, last_error = NULL
        WHERE status = 'DLQ'
    `
    console.log(`[xAPI Worker] Moved ${result} items from DLQ back to pending`)
    return { moved: Number(result) }
}
