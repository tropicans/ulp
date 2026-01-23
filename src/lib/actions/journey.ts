"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export interface JourneyActivity {
    id: string
    type: string
    title: string
    courseId?: string
    entityId: string
    metadata: any
    occurredAt: Date
}

/**
 * Get the learning journey for the current user
 */
export async function getLearnerJourney(): Promise<JourneyActivity[]> {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    try {
        const activities = await prisma.$queryRaw`
            SELECT 
                id, 
                activity_type as type, 
                entity_title as title, 
                course_id as "courseId", 
                entity_id as "entityId", 
                metadata, 
                occurred_at as "occurredAt"
            FROM learner_activity
            WHERE user_id = ${session.user.id}
            ORDER BY occurred_at DESC
            LIMIT 100
        `

        return (activities as any[]).map(a => ({
            ...a,
            metadata: typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata
        }))
    } catch (error) {
        console.error("Error fetching learner journey:", error)
        return []
    }
}
