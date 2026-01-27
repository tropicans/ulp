"use server"

import { prisma } from "@/lib/db"
import { getXAPIStatements } from "./xapi-analytics"

interface VideoAnalyticsResult {
    videoId: string
    videoTitle: string
    totalViews: number
    uniqueViewers: number
    avgWatchTime: number // in seconds
    completionRate: number // percentage
    pauseEvents: { position: number; count: number }[]
    seekEvents: { fromPosition: number; toPosition: number; count: number }[]
    dropOffPoints: { position: number; percentage: number }[]
}

interface VideoListItem {
    id: string
    title: string
    viewCount: number
}

/**
 * Get list of videos with view counts for selector dropdown
 */
export async function getVideoList(): Promise<VideoListItem[]> {
    try {
        // Get unique videos from xAPI statements
        const result = await getXAPIStatements({ limit: 500 })
        const statements = result.statements || []

        const videoMap = new Map<string, { title: string; count: number }>()

        statements.forEach((stmt: any) => {
            const verbId = stmt.verb?.id || ""
            // Filter for video-related events
            if (verbId.includes("played") || verbId.includes("paused") || verbId.includes("seeked") || verbId.includes("completed")) {
                const objectId = stmt.object?.id || ""
                const objectName = stmt.object?.definition?.name?.en ||
                    stmt.object?.definition?.name?.id ||
                    objectId.split("/").pop() || "Unknown Video"

                if (objectId) {
                    const existing = videoMap.get(objectId)
                    if (existing) {
                        existing.count++
                    } else {
                        videoMap.set(objectId, { title: objectName, count: 1 })
                    }
                }
            }
        })

        return Array.from(videoMap.entries())
            .map(([id, data]) => ({ id, title: data.title, viewCount: data.count }))
            .sort((a, b) => b.viewCount - a.viewCount)
    } catch (error) {
        console.error("Error getting video list:", error)
        return []
    }
}

/**
 * Get detailed analytics for a specific video
 */
export async function getVideoAnalytics(videoId: string): Promise<VideoAnalyticsResult | null> {
    try {
        const result = await getXAPIStatements({ limit: 1000 })
        const statements = result.statements || []

        // Filter statements for this video
        const videoStatements = statements.filter((stmt: any) =>
            stmt.object?.id === videoId
        )

        if (videoStatements.length === 0) {
            return null
        }

        // Extract video title
        const firstStmt = videoStatements[0]
        const videoTitle = firstStmt.object?.definition?.name?.en ||
            firstStmt.object?.definition?.name?.id ||
            videoId.split("/").pop() || "Unknown Video"

        // Calculate unique viewers
        const uniqueActors = new Set(videoStatements.map((s: any) => s.actor?.mbox || s.actor?.name))

        // Categorize events
        const playEvents: any[] = []
        const pauseEvents: any[] = []
        const seekEvents: any[] = []
        const completeEvents: any[] = []

        videoStatements.forEach((stmt: any) => {
            const verbId = stmt.verb?.id || ""
            const position = stmt.result?.extensions?.["https://w3id.org/xapi/video/extensions/time"] ||
                stmt.result?.extensions?.position || 0

            if (verbId.includes("played")) {
                playEvents.push({ ...stmt, position })
            } else if (verbId.includes("paused")) {
                pauseEvents.push({ ...stmt, position })
            } else if (verbId.includes("seeked")) {
                const fromPos = stmt.result?.extensions?.["https://w3id.org/xapi/video/extensions/time-from"] || 0
                const toPos = stmt.result?.extensions?.["https://w3id.org/xapi/video/extensions/time-to"] || position
                seekEvents.push({ ...stmt, fromPosition: fromPos, toPosition: toPos })
            } else if (verbId.includes("completed")) {
                completeEvents.push(stmt)
            }
        })

        // Aggregate pause positions (group by 30-second intervals)
        const pausePositionCounts = new Map<number, number>()
        pauseEvents.forEach((evt: any) => {
            const interval = Math.floor(evt.position / 30) * 30 // 30-second intervals
            pausePositionCounts.set(interval, (pausePositionCounts.get(interval) || 0) + 1)
        })

        // Sort pause events by position
        const pauseAnalytics = Array.from(pausePositionCounts.entries())
            .map(([position, count]) => ({ position, count }))
            .sort((a, b) => a.position - b.position)

        // Aggregate seek events (skip detection)
        const seekAnalytics = seekEvents.map((evt: any) => ({
            fromPosition: evt.fromPosition,
            toPosition: evt.toPosition,
            count: 1
        }))

        // Calculate completion rate
        const completionRate = playEvents.length > 0
            ? (completeEvents.length / uniqueActors.size) * 100
            : 0

        // Estimate average watch time (simplified)
        const avgWatchTime = pauseEvents.length > 0
            ? pauseEvents.reduce((sum: number, evt: any) => sum + (evt.position || 0), 0) / pauseEvents.length
            : 0

        // Calculate drop-off points (where people stop watching)
        const dropOffPoints: { position: number; percentage: number }[] = []
        const maxPosition = Math.max(...pauseEvents.map((e: any) => e.position || 0), 1)
        for (let pos = 0; pos <= maxPosition; pos += 60) { // 1-minute intervals
            const viewersAtPosition = pauseEvents.filter((e: any) => (e.position || 0) >= pos).length
            const percentage = (viewersAtPosition / Math.max(playEvents.length, 1)) * 100
            dropOffPoints.push({ position: pos, percentage: Math.min(percentage, 100) })
        }

        return {
            videoId,
            videoTitle,
            totalViews: playEvents.length,
            uniqueViewers: uniqueActors.size,
            avgWatchTime,
            completionRate: Math.round(completionRate),
            pauseEvents: pauseAnalytics,
            seekEvents: seekAnalytics,
            dropOffPoints
        }
    } catch (error) {
        console.error("Error getting video analytics:", error)
        return null
    }
}

/**
 * Get AI-powered insights for video analytics using LLM
 */
const PROXY_BASE = process.env.AI_PROXY_URL || "https://proxy.kelazz.my.id"
const API_KEY = process.env.AI_PROXY_KEY || ""
const AI_MODEL = process.env.AI_MODEL || "gpt-5.1"

export async function getAIVideoInsights(videoId: string): Promise<{
    insights: string[]
    recommendations: string[]
    problemAreas: { position: number; severity: "low" | "medium" | "high"; issue: string }[]
} | null> {
    try {
        const analytics = await getVideoAnalytics(videoId)
        if (!analytics) return null

        // Prepare data summary for AI
        const dataSummary = {
            videoTitle: analytics.videoTitle,
            totalViews: analytics.totalViews,
            uniqueViewers: analytics.uniqueViewers,
            avgWatchTime: Math.round(analytics.avgWatchTime),
            completionRate: analytics.completionRate,
            pauseEvents: analytics.pauseEvents.map(e => ({
                position: `${Math.floor(e.position / 60)}:${(e.position % 60).toString().padStart(2, "0")}`,
                count: e.count
            })),
            seekEvents: analytics.seekEvents.length,
            forwardSeeks: analytics.seekEvents.filter(e => e.toPosition > e.fromPosition).length,
            backwardSeeks: analytics.seekEvents.filter(e => e.toPosition < e.fromPosition).length
        }

        const prompt = `Kamu adalah ahli analisis pembelajaran video. Analisis data berikut dan berikan insights dalam Bahasa Indonesia:

DATA VIDEO:
- Judul: ${dataSummary.videoTitle}
- Total Views: ${dataSummary.totalViews}
- Unique Viewers: ${dataSummary.uniqueViewers}
- Rata-rata Watch Time: ${dataSummary.avgWatchTime} detik
- Completion Rate: ${dataSummary.completionRate}%
- Area Pause: ${JSON.stringify(dataSummary.pauseEvents)}
- Forward Seeks (skip): ${dataSummary.forwardSeeks}
- Backward Seeks (replay): ${dataSummary.backwardSeeks}

Berikan analisis dalam format JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["rekomendasi 1", "rekomendasi 2", ...],
  "problemAreas": [
    {"position": 180, "severity": "high/medium/low", "issue": "deskripsi masalah"}
  ]
}

ATURAN:
- Maksimal 3-4 insights
- Maksimal 3 rekomendasi yang actionable
- problemAreas hanya jika ada pause tinggi (>2 kali di posisi yang sama)
- Gunakan emoji untuk insights (✅ positif, ⚠️ warning, 📍 lokasi, ⏭️ skip, 🔄 replay)
- Jawab HANYA dengan JSON, tanpa teks lain`

        console.log("Calling AI proxy for video insights...")

        const aiResponse = await fetch(`${PROXY_BASE}/v1/responses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                input: prompt
            })
        })

        if (!aiResponse.ok) {
            console.error("AI proxy error:", await aiResponse.text())
            // Fallback to rule-based if AI fails
            return getFallbackInsights(analytics)
        }

        const aiData = await aiResponse.json()
        const content = aiData.output?.[0]?.content?.[0]?.text ||
            aiData.choices?.[0]?.message?.content ||
            aiData.content ||
            ""

        try {
            // Extract JSON from response
            let jsonStr = content
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                jsonStr = jsonMatch[1]
            } else {
                const objMatch = content.match(/\{[\s\S]*\}/)
                if (objMatch) {
                    jsonStr = objMatch[0]
                }
            }

            const result = JSON.parse(jsonStr)
            return {
                insights: result.insights || [],
                recommendations: result.recommendations || [],
                problemAreas: result.problemAreas || []
            }
        } catch (parseError) {
            console.error("Failed to parse AI response:", content)
            return getFallbackInsights(analytics)
        }

    } catch (error) {
        console.error("Error generating AI insights:", error)
        return null
    }
}

// Fallback rule-based insights if AI fails
function getFallbackInsights(analytics: any) {
    const insights: string[] = []
    const recommendations: string[] = []
    const problemAreas: { position: number; severity: "low" | "medium" | "high"; issue: string }[] = []

    // Analyze completion rate
    if (analytics.completionRate < 50) {
        insights.push(`⚠️ Tingkat penyelesaian rendah (${analytics.completionRate}%)`)
        recommendations.push("Pertimbangkan memecah video menjadi bagian lebih pendek")
    } else if (analytics.completionRate >= 80) {
        insights.push(`✅ Tingkat penyelesaian baik (${analytics.completionRate}%)`)
    }

    // Analyze pause patterns
    const highPauseAreas = analytics.pauseEvents.filter((e: any) => e.count >= 3)
    highPauseAreas.forEach((area: any) => {
        problemAreas.push({
            position: area.position,
            severity: area.count >= 5 ? "high" : "medium",
            issue: `Banyak pause (${area.count}x)`
        })
    })

    if (highPauseAreas.length > 0) {
        insights.push(`📍 ${highPauseAreas.length} area dengan pause tinggi`)
        recommendations.push("Review bagian dengan banyak pause")
    }

    if (insights.length === 0) {
        insights.push("📊 Data terbatas, insights akan lebih akurat dengan lebih banyak aktivitas")
    }

    return { insights, recommendations, problemAreas }
}

