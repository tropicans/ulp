/**
 * Health Check API
 * Used by load balancer and monitoring
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
    const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {}

    // Database check
    const dbStart = Date.now()
    try {
        await prisma.$queryRaw`SELECT 1`
        checks.database = { status: "ok", latencyMs: Date.now() - dbStart }
    } catch (error) {
        checks.database = {
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error"
        }
    }

    // Redis check (optional, only if redis is configured)
    try {
        const { getRedis } = await import("@/lib/redis")
        const redis = getRedis()
        const redisStart = Date.now()
        await redis.ping()
        checks.redis = { status: "ok", latencyMs: Date.now() - redisStart }
    } catch (error) {
        checks.redis = {
            status: "error",
            error: error instanceof Error ? error.message : "Not configured"
        }
    }

    const allHealthy = Object.values(checks).every((c) => c.status === "ok")

    return NextResponse.json(
        {
            status: allHealthy ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || "1.0.0",
            checks,
        },
        { status: allHealthy ? 200 : 503 }
    )
}
