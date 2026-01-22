// xAPI Helper Functions (not server actions - pure utilities)

import { XAPIActor, XAPIObject, XAPIResult } from "./types"

/**
 * Build an actor from user data
 */
export function buildActor(email: string, name?: string | null): XAPIActor {
    return {
        mbox: `mailto:${email}`,
        name: name || "User",
        objectType: "Agent"
    }
}

/**
 * Build an activity object
 */
export function buildActivity(
    id: string,
    type: string,
    name: string,
    description?: string
): XAPIObject {
    return {
        id,
        objectType: "Activity",
        definition: {
            type,
            name: { id: name, en: name },
            description: description ? { id: description, en: description } : undefined
        }
    }
}

/**
 * Build a result object for assessments
 */
export function buildResult(options: {
    score?: number // 0-100
    success?: boolean
    completion?: boolean
    duration?: string
}): XAPIResult {
    const result: XAPIResult = {}

    if (options.score !== undefined) {
        result.score = {
            scaled: options.score / 100,
            raw: options.score,
            min: 0,
            max: 100
        }
    }

    if (options.success !== undefined) result.success = options.success
    if (options.completion !== undefined) result.completion = options.completion
    if (options.duration !== undefined) result.duration = options.duration

    return result
}
