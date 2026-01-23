"use server"

import { ActivityType } from "./outbox"

/**
 * Context provided to policies when evaluating an activity
 */
export interface PolicyContext {
    userId: string
    courseId?: string
    entityId: string
    entityTitle?: string
    metadata?: Record<string, any>
    occurredAt: Date
}

/**
 * A Policy defines a condition and a side effect to execute
 */
export interface Policy {
    name: string
    description: string
    /**
     * Which activity types this policy cares about
     */
    activityTypes: ActivityType[]
    /**
     * Evaluate the activity and return whether to execute the effect
     */
    shouldExecute: (ctx: PolicyContext) => Promise<boolean>
    /**
     * The actual side effect logic
     */
    execute: (ctx: PolicyContext) => Promise<void>
}

// Registry of policies
const policies: Policy[] = []

/**
 * Register a new policy with the orchestrator
 */
export async function registerPolicy(policy: Policy) {
    if (!policies.find(p => p.name === policy.name)) {
        policies.push(policy)
    }
}

/**
 * Evaluate all registered policies for a given activity
 */
export async function evaluatePolicies(
    userId: string,
    activityType: ActivityType,
    entityId: string,
    entityTitle?: string,
    courseId?: string,
    metadata?: Record<string, any>
) {
    // Lazy init simple policies if none registered
    if (policies.length === 0) {
        const { AutoCertificatePolicy } = await import("./policies/basic-policies")
        await registerPolicy(AutoCertificatePolicy)

        const { AIAutoCuratorPolicy } = await import("./policies/ai-curator-policy")
        await registerPolicy(AIAutoCuratorPolicy)
    }

    const ctx: PolicyContext = {
        userId,
        courseId,
        entityId,
        entityTitle,
        metadata,
        occurredAt: new Date()
    }

    console.log(`[Orchestrator] Evaluating ${policies.length} policies for ${activityType}`)

    for (const policy of policies) {
        if (policy.activityTypes.includes(activityType)) {
            try {
                const shouldRun = await policy.shouldExecute(ctx)
                if (shouldRun) {
                    console.log(`[Orchestrator] 🚀 Executing policy: ${policy.name}`)
                    // Run execution asynchronously but don't wait for it to block the main flow
                    // Use a separate try-catch to ensure one failing policy doesn't break others
                    policy.execute(ctx).catch(err => {
                        console.error(`[Orchestrator] ❌ Error executing policy ${policy.name}:`, err)
                    })
                }
            } catch (err) {
                console.error(`[Orchestrator] ❌ Error evaluating policy ${policy.name}:`, err)
            }
        }
    }
}
