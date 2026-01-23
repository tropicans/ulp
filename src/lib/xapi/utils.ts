import { XAPIActor, XAPIObject, XAPIResult } from "./types"

/**
 * Build an xAPI Actor object
 */
export function buildActor(email: string, name?: string | null): XAPIActor {
    return {
        mbox: email.startsWith("mailto:") ? email : `mailto:${email}`,
        name: name || undefined,
        objectType: "Agent"
    }
}

/**
 * Build an xAPI Activity object
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
            name: { en: name, id: name },
            description: description ? { en: description, id: description } : undefined
        }
    }
}

/**
 * Build an xAPI Result object
 */
export function buildResult(data: {
    score?: number | { raw: number, min?: number, max?: number }
    success?: boolean
    completion?: boolean
    response?: string
    duration?: string
}): XAPIResult {
    const { score, ...rest } = data
    const result: XAPIResult = { ...rest }

    if (typeof score === 'number') {
        result.score = {
            raw: score,
            min: 0,
            max: 100,
            scaled: score / 100
        }
    } else if (score) {
        result.score = {
            ...score,
            scaled: score.max ? score.raw / score.max : undefined
        }
    }

    return result
}

/**
 * Generate a unique idempotency key for xAPI statements.
 * Format: {action}:{userId}:{entityId}:{optional_extra}
 */
export function genIdempotencyKey(action: string, ...ids: string[]): string {
    return `${action}:${ids.join(":")}`
}
