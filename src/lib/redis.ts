/**
 * Redis Client for TITAN
 * Used for caching, queuing, and session management
 */
import { Redis } from "ioredis"

// Singleton pattern for Redis connection
let redis: Redis | null = null

export function getRedis(): Redis {
    if (!redis) {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
        redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) return null
                return Math.min(times * 100, 3000)
            },
            lazyConnect: true,
        })

        redis.on("error", (err) => {
            console.error("[REDIS] Connection error:", err)
        })

        redis.on("connect", () => {
            console.log("[REDIS] Connected successfully")
        })
    }
    return redis
}

// Queue keys
export const QUEUE_KEYS = {
    ATTENDANCE: "titan:queue:attendance",
    XAPI: "titan:queue:xapi",
} as const

/**
 * Add item to a Redis queue (LPUSH)
 */
export async function queuePush(key: string, data: object): Promise<number> {
    const redis = getRedis()
    return redis.lpush(key, JSON.stringify(data))
}

/**
 * Get and remove items from queue (RPOP)
 */
export async function queuePop(key: string): Promise<object | null> {
    const redis = getRedis()
    const item = await redis.rpop(key)
    return item ? JSON.parse(item) : null
}

/**
 * Get queue length
 */
export async function queueLength(key: string): Promise<number> {
    const redis = getRedis()
    return redis.llen(key)
}

/**
 * Pop multiple items from queue (for batch processing)
 */
export async function queuePopMany(key: string, count: number): Promise<object[]> {
    const redis = getRedis()
    const pipeline = redis.pipeline()

    for (let i = 0; i < count; i++) {
        pipeline.rpop(key)
    }

    const results = await pipeline.exec()
    if (!results) return []

    return results
        .map(([err, val]) => (err ? null : val))
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v))
}

/**
 * Simple cache set with TTL
 */
export async function cacheSet(
    key: string,
    value: object,
    ttlSeconds: number = 300
): Promise<void> {
    const redis = getRedis()
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

/**
 * Cache get
 */
export async function cacheGet<T = object>(key: string): Promise<T | null> {
    const redis = getRedis()
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
}

/**
 * Cache delete
 */
export async function cacheDelete(key: string): Promise<void> {
    const redis = getRedis()
    await redis.del(key)
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit()
        redis = null
    }
}
