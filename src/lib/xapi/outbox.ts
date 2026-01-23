"use server"

import { prisma } from "@/lib/db"
import { XAPIStatement } from "./types"
import { evaluatePolicies } from "./orchestrator"

/**
 * Queue an xAPI statement for reliable, idempotent emission to LRS.
 * Uses transactional outbox pattern - statements are persisted in DB first,
 * then processed by a background worker.
 * 
 * @param statement - The xAPI statement to send
 * @param idempotencyKey - Unique key to prevent duplicates (e.g., "lesson_complete:user123:lesson456")
 * @returns Whether the statement was queued (false if duplicate)
 */
export async function queueStatement(
    statement: XAPIStatement,
    idempotencyKey: string
): Promise<{ queued: boolean; duplicate: boolean; error?: string }> {
    try {
        // Add timestamp if not present
        if (!statement.timestamp) {
            statement.timestamp = new Date().toISOString()
        }

        // Upsert with idempotency key - prevents duplicates
        // If key already exists, do nothing (no update)
        const result = await prisma.$executeRaw`
            INSERT INTO xapi_outbox (id, idempotency_key, statement, status, attempts, created_at)
            VALUES (gen_random_uuid(), ${idempotencyKey}, ${JSON.stringify(statement)}::jsonb, 'PENDING', 0, NOW())
            ON CONFLICT (idempotency_key) DO NOTHING
        `

        // result = 1 if inserted, 0 if already exists
        if (result === 0) {
            console.log(`[xAPI Outbox] Duplicate detected for key: ${idempotencyKey}`)
            return { queued: false, duplicate: true }
        }

        console.log(`[xAPI Outbox] Queued statement with key: ${idempotencyKey}`)
        return { queued: true, duplicate: false }
    } catch (error: any) {
        console.error(`[xAPI Outbox] Error queuing statement:`, error)
        return { queued: false, duplicate: false, error: error.message }
    }
}


/**
 * Activity types for LearnerActivity tracking
 */
export type ActivityType =
    | "ENROLLMENT"
    | "LESSON_COMPLETE"
    | "QUIZ_ATTEMPT"
    | "QUIZ_PASS"
    | "QUIZ_FAIL"
    | "ATTENDANCE"
    | "CERTIFICATE"
    | "VIDEO_COMPLETE"
    | "MATERIAL_ADDED"

/**
 * Record a learner activity for the unified journey view.
 * This is a denormalized record for fast timeline queries.
 */
export async function recordActivity(
    userId: string,
    activityType: ActivityType,
    entityId: string,
    entityTitle?: string,
    courseId?: string,
    metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.$executeRaw`
            INSERT INTO learner_activity (id, user_id, course_id, activity_type, entity_id, entity_title, metadata, occurred_at)
            VALUES (gen_random_uuid(), ${userId}, ${courseId || null}, ${activityType}, ${entityId}, ${entityTitle || null}, ${metadata ? JSON.stringify(metadata) : null}::jsonb, NOW())
        `

        console.log(`[Journey] Recorded ${activityType} for user ${userId}`)

        // Trigger Orchestration Layer
        evaluatePolicies(userId, activityType, entityId, entityTitle, courseId, metadata)
            .catch(err => console.error(`[Orchestrator] Error triggering evaluatePolicies:`, err))

        return { success: true }
    } catch (error: any) {
        console.error(`[Journey] Error recording activity:`, error)
        return { success: false, error: error.message }
    }
}
