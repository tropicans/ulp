"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getXAPIStatements } from "./xapi-analytics"

// Types
interface FilterOptions {
    dateFrom?: string
    dateTo?: string
    verb?: string
    courseId?: string
    actorEmail?: string
    limit?: number
}

interface LeaderboardEntry {
    userId: string
    name: string
    email: string
    image?: string
    activityCount: number
    enrollments: number
    completions: number
    trend: "up" | "down" | "stable"
}

interface CourseAnalyticsItem {
    courseId: string
    title: string
    enrollments: number
    completions: number
    completionRate: number
    avgProgress: number
}

interface QuizAnalyticsItem {
    quizId: string
    title: string
    attempts: number
    passes: number
    passRate: number
    avgScore: number
}

interface HistoricalDataPoint {
    date: string
    count: number
    enrollments: number
    completions: number
    videoEvents: number
}

// LRS Configuration
const LRS_ENDPOINT = process.env.LRS_ENDPOINT || "http://lrsql:8080/xapi/statements"
const LRS_API_KEY = process.env.LRS_API_KEY || ""
const LRS_SECRET_KEY = process.env.LRS_SECRET_KEY || ""

/**
 * Check admin authorization
 */
async function checkAdminAuth(): Promise<{ authorized: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { authorized: false, error: "Unauthorized" }
    }
    if (!["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { authorized: false, error: "Access denied" }
    }
    return { authorized: true }
}

/**
 * Get filtered xAPI statements with advanced filtering
 */
export async function getFilteredStatements(options: FilterOptions = {}): Promise<{
    statements: any[]
    total: number
    error?: string
}> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) {
        return { statements: [], total: 0, error: authCheck.error }
    }

    try {
        const result = await getXAPIStatements({
            limit: options.limit || 500,
            verb: options.verb,
            agent: options.actorEmail,
            since: options.dateFrom,
            until: options.dateTo
        })

        let statements = result.statements || []

        // Filter by courseId if specified (check object.id contains courseId)
        if (options.courseId) {
            statements = statements.filter((stmt: any) => {
                const objectId = stmt.object?.id || ""
                return objectId.includes(options.courseId)
            })
        }

        return { statements, total: statements.length }
    } catch (error) {
        console.error("[xAPI Extended] Error fetching filtered statements:", error)
        return { statements: [], total: 0, error: "Failed to fetch statements" }
    }
}

/**
 * Get top active learners leaderboard
 */
export async function getLearnerLeaderboard(limit: number = 10): Promise<{
    leaderboard: LeaderboardEntry[]
    error?: string
}> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) {
        return { leaderboard: [], error: authCheck.error }
    }

    try {
        const result = await getXAPIStatements({ limit: 1000 })
        const statements = result.statements || []

        // Aggregate by actor
        const actorStats = new Map<string, {
            name: string
            email: string
            count: number
            enrollments: number
            completions: number
        }>()

        statements.forEach((stmt: any) => {
            const email = stmt.actor?.mbox?.replace("mailto:", "") || ""
            const name = stmt.actor?.name || email.split("@")[0] || "Unknown"

            if (!email) return

            const existing = actorStats.get(email) || {
                name,
                email,
                count: 0,
                enrollments: 0,
                completions: 0
            }

            existing.count++
            const verbId = stmt.verb?.id || ""
            if (verbId.includes("registered")) existing.enrollments++
            if (verbId.includes("completed")) existing.completions++

            actorStats.set(email, existing)
        })

        // Convert to array and sort
        const sortedLearners = Array.from(actorStats.entries())
            .map(([email, stats]) => ({
                userId: email,
                name: stats.name,
                email: stats.email,
                activityCount: stats.count,
                enrollments: stats.enrollments,
                completions: stats.completions,
                trend: "stable" as const // Could be enhanced with historical comparison
            }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, limit)

        // Enrich with user data from database
        const emails = sortedLearners.map(l => l.email)
        const users = await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true, email: true, name: true, image: true }
        })

        const userMap = new Map(users.map(u => [u.email, u]))

        const leaderboard: LeaderboardEntry[] = sortedLearners.map(learner => {
            const user = userMap.get(learner.email)
            return {
                ...learner,
                userId: user?.id || learner.email,
                name: user?.name || learner.name,
                image: user?.image || undefined
            }
        })

        return { leaderboard }
    } catch (error) {
        console.error("[xAPI Extended] Error getting leaderboard:", error)
        return { leaderboard: [], error: "Failed to get leaderboard" }
    }
}

/**
 * Get course-level analytics
 */
export async function getCourseAnalytics(): Promise<{
    courses: CourseAnalyticsItem[]
    totalEnrollments: number
    totalCompletions: number
    avgCompletionRate: number
    error?: string
}> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) {
        return { courses: [], totalEnrollments: 0, totalCompletions: 0, avgCompletionRate: 0, error: authCheck.error }
    }

    try {
        // Get data from database (more reliable than LRS for course-level stats)
        const enrollments = await prisma.enrollment.groupBy({
            by: ["courseId"],
            _count: { id: true },
            where: { status: { in: ["ENROLLED", "COMPLETED"] } }
        })

        const completions = await prisma.enrollment.groupBy({
            by: ["courseId"],
            _count: { id: true },
            where: { status: "COMPLETED" }
        })

        const avgProgress = await prisma.enrollment.groupBy({
            by: ["courseId"],
            _avg: { progressPercent: true }
        })

        // Get course titles
        const courseIds = [...new Set([
            ...enrollments.map(e => e.courseId),
            ...completions.map(c => c.courseId)
        ])]

        const courses = await prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true }
        })

        const courseMap = new Map(courses.map(c => [c.id, c.title]))
        const enrollmentMap = new Map(enrollments.map(e => [e.courseId, e._count.id]))
        const completionMap = new Map(completions.map(c => [c.courseId, c._count.id]))
        const progressMap = new Map(avgProgress.map(p => [p.courseId, p._avg.progressPercent || 0]))

        const courseAnalytics: CourseAnalyticsItem[] = courseIds.map(courseId => {
            const enrolled = enrollmentMap.get(courseId) || 0
            const completed = completionMap.get(courseId) || 0
            return {
                courseId,
                title: courseMap.get(courseId) || "Unknown Course",
                enrollments: enrolled,
                completions: completed,
                completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
                avgProgress: Math.round(progressMap.get(courseId) || 0)
            }
        }).sort((a, b) => b.enrollments - a.enrollments).slice(0, 10)

        const totalEnrollments = enrollments.reduce((sum, e) => sum + e._count.id, 0)
        const totalCompletions = completions.reduce((sum, c) => sum + c._count.id, 0)
        const avgCompletionRate = totalEnrollments > 0 ? Math.round((totalCompletions / totalEnrollments) * 100) : 0

        return { courses: courseAnalytics, totalEnrollments, totalCompletions, avgCompletionRate }
    } catch (error) {
        console.error("[xAPI Extended] Error getting course analytics:", error)
        return { courses: [], totalEnrollments: 0, totalCompletions: 0, avgCompletionRate: 0, error: "Failed to get course analytics" }
    }
}

/**
 * Get quiz/assessment analytics
 */
export async function getQuizAnalytics(): Promise<{
    quizzes: QuizAnalyticsItem[]
    totalAttempts: number
    overallPassRate: number
    avgScore: number
    error?: string
}> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) {
        return { quizzes: [], totalAttempts: 0, overallPassRate: 0, avgScore: 0, error: authCheck.error }
    }

    try {
        // Get quiz attempt data from database
        const attempts = await prisma.quizAttempt.groupBy({
            by: ["quizId"],
            _count: { id: true },
            _avg: { score: true },
            where: { submittedAt: { not: null } }
        })

        const passes = await prisma.quizAttempt.groupBy({
            by: ["quizId"],
            _count: { id: true },
            where: { isPassed: true }
        })

        // Get quiz titles
        const quizIds = attempts.map(a => a.quizId)
        const quizzes = await prisma.quiz.findMany({
            where: { id: { in: quizIds } },
            select: { id: true, title: true }
        })

        const quizMap = new Map(quizzes.map(q => [q.id, q.title]))
        const passMap = new Map(passes.map(p => [p.quizId, p._count.id]))

        const quizAnalytics: QuizAnalyticsItem[] = attempts.map(attempt => {
            const passCount = passMap.get(attempt.quizId) || 0
            return {
                quizId: attempt.quizId,
                title: quizMap.get(attempt.quizId) || "Unknown Quiz",
                attempts: attempt._count.id,
                passes: passCount,
                passRate: attempt._count.id > 0 ? Math.round((passCount / attempt._count.id) * 100) : 0,
                avgScore: Math.round(attempt._avg.score || 0)
            }
        }).sort((a, b) => b.attempts - a.attempts).slice(0, 10)

        const totalAttempts = attempts.reduce((sum, a) => sum + a._count.id, 0)
        const totalPasses = passes.reduce((sum, p) => sum + p._count.id, 0)
        const overallPassRate = totalAttempts > 0 ? Math.round((totalPasses / totalAttempts) * 100) : 0
        const avgScore = attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + (a._avg.score || 0), 0) / attempts.length)
            : 0

        return { quizzes: quizAnalytics, totalAttempts, overallPassRate, avgScore }
    } catch (error) {
        console.error("[xAPI Extended] Error getting quiz analytics:", error)
        return { quizzes: [], totalAttempts: 0, overallPassRate: 0, avgScore: 0, error: "Failed to get quiz analytics" }
    }
}

/**
 * Get historical trend data
 */
export async function getHistoricalTrends(days: number = 30): Promise<{
    data: HistoricalDataPoint[]
    error?: string
}> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) {
        return { data: [], error: authCheck.error }
    }

    try {
        const result = await getXAPIStatements({ limit: 2000 })
        const statements = result.statements || []

        const today = new Date()
        today.setHours(23, 59, 59, 999)

        // Initialize data points for each day
        const dataPoints = new Map<string, HistoricalDataPoint>()
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            const dateKey = date.toISOString().split("T")[0]
            dataPoints.set(dateKey, {
                date: dateKey,
                count: 0,
                enrollments: 0,
                completions: 0,
                videoEvents: 0
            })
        }

        // Aggregate statements by date
        statements.forEach((stmt: any) => {
            if (!stmt.timestamp) return

            const stmtDate = new Date(stmt.timestamp).toISOString().split("T")[0]
            const point = dataPoints.get(stmtDate)
            if (!point) return

            point.count++
            const verbId = stmt.verb?.id || ""
            if (verbId.includes("registered")) point.enrollments++
            if (verbId.includes("completed")) point.completions++
            if (verbId.includes("played") || verbId.includes("paused") || verbId.includes("seeked")) {
                point.videoEvents++
            }
        })

        return { data: Array.from(dataPoints.values()) }
    } catch (error) {
        console.error("[xAPI Extended] Error getting historical trends:", error)
        return { data: [], error: "Failed to get historical trends" }
    }
}

/**
 * Check LRS connection status
 */
export async function getLRSConnectionStatus(): Promise<{
    connected: boolean
    latencyMs?: number
    lastCheck: string
    error?: string
}> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) {
        return { connected: false, lastCheck: new Date().toISOString(), error: authCheck.error }
    }

    try {
        const startTime = Date.now()
        const auth = Buffer.from(`${LRS_API_KEY}:${LRS_SECRET_KEY}`).toString("base64")

        const response = await fetch(`${LRS_ENDPOINT}?limit=1`, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "X-Experience-API-Version": "1.0.3",
                "Accept": "application/json"
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
        })

        const latencyMs = Date.now() - startTime

        return {
            connected: response.ok,
            latencyMs,
            lastCheck: new Date().toISOString()
        }
    } catch (error) {
        console.error("[xAPI Extended] LRS health check failed:", error)
        return {
            connected: false,
            lastCheck: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Connection failed"
        }
    }
}

/**
 * Export statements to CSV format
 */
export async function exportStatementsToCSV(options: FilterOptions = {}): Promise<{
    csv: string
    filename: string
    error?: string
}> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) {
        return { csv: "", filename: "", error: authCheck.error }
    }

    try {
        const { statements } = await getFilteredStatements({ ...options, limit: 5000 })

        // Build CSV header
        const headers = ["Timestamp", "Actor Name", "Actor Email", "Verb", "Object", "Score", "Success"]
        const rows: string[] = [headers.join(",")]

        // Build CSV rows
        statements.forEach((stmt: any) => {
            const timestamp = stmt.timestamp || ""
            const actorName = (stmt.actor?.name || "").replace(/,/g, ";")
            const actorEmail = (stmt.actor?.mbox?.replace("mailto:", "") || "").replace(/,/g, ";")
            const verb = stmt.verb?.display?.en || stmt.verb?.id?.split("/").pop() || ""
            const object = (stmt.object?.definition?.name?.en || stmt.object?.id?.split("/").pop() || "").replace(/,/g, ";")
            const score = stmt.result?.score?.scaled !== undefined ? Math.round(stmt.result.score.scaled * 100) + "%" : ""
            const success = stmt.result?.success !== undefined ? (stmt.result.success ? "Yes" : "No") : ""

            rows.push([timestamp, actorName, actorEmail, verb, object, score, success].join(","))
        })

        const dateStr = new Date().toISOString().split("T")[0]
        return {
            csv: rows.join("\n"),
            filename: `xapi-statements-${dateStr}.csv`
        }
    } catch (error) {
        console.error("[xAPI Extended] Error exporting CSV:", error)
        return { csv: "", filename: "", error: "Failed to export" }
    }
}

/**
 * Get list of courses for filter dropdown
 */
export async function getCourseListForFilter(): Promise<{ id: string; title: string }[]> {
    const authCheck = await checkAdminAuth()
    if (!authCheck.authorized) return []

    try {
        const courses = await prisma.course.findMany({
            select: { id: true, title: true },
            orderBy: { title: "asc" },
            take: 100
        })
        return courses
    } catch (error) {
        console.error("[xAPI Extended] Error getting course list:", error)
        return []
    }
}
