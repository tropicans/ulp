"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Role, UserStatus } from "@/generated/prisma"

/**
 * Get all users with filters (Admin only)
 */
export async function getUsers(filters?: {
    role?: Role
    status?: UserStatus
    unitKerja?: string
    search?: string
}) {
    const session = await auth()
    if (!session || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                ...(filters?.role && { role: filters.role }),
                ...(filters?.status && { status: filters.status }),
                ...(filters?.unitKerja && { unitKerja: filters.unitKerja }),
                ...(filters?.search && {
                    OR: [
                        { name: { contains: filters.search, mode: "insensitive" } },
                        { email: { contains: filters.search, mode: "insensitive" } },
                        { nip: { contains: filters.search, mode: "insensitive" } },
                    ]
                }),
                // Unit admins can only see users in their unit
                ...(session.user.role === "ADMIN_UNIT" && { unitKerja: session.user.unitKerja || undefined })
            },
            orderBy: { createdAt: "desc" }
        })

        return { users }
    } catch (error) {
        console.error("Error fetching users:", error)
        return { error: "Failed to fetch users" }
    }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: Role) {
    const session = await auth()
    if (!session || session.user.role !== "SUPER_ADMIN") {
        return { error: "Only Super Admins can change roles" }
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role, updatedAt: new Date() }
        })

        // Log action
        await createAuditLog({
            action: "UPDATE_USER_ROLE",
            entity: "User",
            entityId: userId,
            details: { newRole: role }
        })

        revalidatePath("/dashboard/admin/users")
        return { success: true, user: updatedUser }
    } catch (error) {
        return { error: "Failed to update role" }
    }
}

/**
 * Update user status (Active/Inactive/Suspended)
 */
export async function updateUserStatus(userId: string, status: UserStatus) {
    const session = await auth()
    if (!session || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        // Find user to check unit if Admin Unit
        const userToUpdate = await prisma.user.findUnique({ where: { id: userId } })
        if (!userToUpdate) return { error: "User not found" }

        if (session.user.role === "ADMIN_UNIT" && userToUpdate.unitKerja !== session.user.unitKerja) {
            return { error: "You can only manage users in your unit" }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { status, updatedAt: new Date() }
        })

        await createAuditLog({
            action: "UPDATE_USER_STATUS",
            entity: "User",
            entityId: userId,
            details: { newStatus: status }
        })

        revalidatePath("/dashboard/admin/users")
        return { success: true, user: updatedUser }
    } catch (error) {
        return { error: "Failed to update status" }
    }
}

/**
 * Get Audit Logs
 */
export async function getAuditLogs(limit = 50) {
    const session = await auth()
    if (!session || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        // If admin unit, first get user IDs in their unit
        let whereClause = {}
        if (session.user.role === "ADMIN_UNIT" && session.user.unitKerja) {
            const usersInUnit = await prisma.user.findMany({
                where: { unitKerja: session.user.unitKerja },
                select: { id: true }
            })
            whereClause = { userId: { in: usersInUnit.map(u => u.id) } }
        }

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: limit
        })

        // Manually fetch user info for each log
        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))]
        const users = await prisma.user.findMany({
            where: { id: { in: userIds as string[] } },
            select: { id: true, name: true, email: true }
        })
        const userMap = new Map(users.map(u => [u.id, u]))

        const logsWithUser = logs.map(log => ({
            ...log,
            User: log.userId ? userMap.get(log.userId) || { name: 'Unknown', email: '' } : { name: 'System', email: '' }
        }))

        return { logs: logsWithUser }
    } catch (error) {
        return { error: "Failed to fetch logs" }
    }
}

/**
 * Create Audit Log (Internal)
 */
export async function createAuditLog(data: {
    action: string
    entity: string
    entityId?: string
    details?: any
}) {
    const session = await auth()
    if (!session?.user?.id) return

    try {
        await prisma.auditLog.create({
            data: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                details: data.details || {},
            }
        })
    } catch (error) {
        console.error("Audit log creation failed:", error)
    }
}

/**
 * System Settings
 */
export async function getSystemSettings() {
    try {
        const settings = await prisma.systemSetting.findMany()
        return { settings }
    } catch (error) {
        return { error: "Failed to fetch settings" }
    }
}

export async function updateSystemSetting(key: string, value: string) {
    const session = await auth()
    if (!session || session.user.role !== "SUPER_ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const setting = await prisma.systemSetting.upsert({
            where: { key },
            update: { value, updatedAt: new Date() },
            create: {
                id: crypto.randomUUID(),
                key,
                value,
                updatedAt: new Date()
            }
        })

        await createAuditLog({
            action: "UPDATE_SYSTEM_SETTING",
            entity: "SystemSetting",
            entityId: key,
            details: { value }
        })

        return { success: true, setting }
    } catch (error) {
        return { error: "Failed to update setting" }
    }
}
/**
 * Get Platform Analytics (HUD & Charts)
 */
/**
 * Get Platform Analytics (HUD & Charts)
 */
export async function getPlatformAnalytics(timeframe: 'REALTIME' | 'DAILY' | 'MONTHLY' = 'REALTIME') {
    const session = await auth()
    if (!session || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const isSuper = session.user.role === "SUPER_ADMIN"
        const unitKerja = session.user.unitKerja

        // Calculate date ranges based on timeframe
        const now = new Date()
        const startDate = new Date()
        const prevStartDate = new Date()
        const prevEndDate = new Date()

        if (timeframe === 'REALTIME') {
            startDate.setHours(now.getHours() - 24)
            prevEndDate.setHours(now.getHours() - 24)
            prevStartDate.setHours(now.getHours() - 48)
        } else if (timeframe === 'DAILY') {
            startDate.setDate(now.getDate() - 7)
            prevEndDate.setDate(now.getDate() - 7)
            prevStartDate.setDate(now.getDate() - 14)
        } else {
            startDate.setMonth(now.getMonth() - 6)
            prevEndDate.setMonth(now.getMonth() - 6)
            prevStartDate.setMonth(now.getMonth() - 12)
        }

        // 1. HUD Stats - Current Period
        const [learnerCount, totalEnrollments, completionCount, pointsSum, coursesCount] = await Promise.all([
            prisma.user.count({
                where: {
                    role: "LEARNER",
                    ...(!isSuper && { unitKerja })
                }
            }),
            prisma.enrollment.count({
                where: {
                    enrolledAt: { gte: startDate },
                    ...(!isSuper && { User: { unitKerja } })
                }
            }),
            prisma.enrollment.count({
                where: {
                    status: "COMPLETED",
                    completedAt: { gte: startDate },
                    ...(!isSuper && { User: { unitKerja } })
                }
            }),
            prisma.user.aggregate({
                where: {
                    role: "LEARNER",
                    ...(!isSuper && { unitKerja })
                },
                _sum: { points: true }
            }),
            prisma.course.count({
                where: !isSuper ? { User: { unitKerja } } : {}
            })
        ])

        // 2. Previous Period Stats for Growth Calculation
        const [prevEnrollments, prevCompletions] = await Promise.all([
            prisma.enrollment.count({
                where: {
                    enrolledAt: { gte: prevStartDate, lt: prevEndDate },
                    ...(!isSuper && { User: { unitKerja } })
                }
            }),
            prisma.enrollment.count({
                where: {
                    status: "COMPLETED",
                    completedAt: { gte: prevStartDate, lt: prevEndDate },
                    ...(!isSuper && { User: { unitKerja } })
                }
            })
        ])

        // Calculate real growth percentages
        const enrollmentGrowth = prevEnrollments > 0
            ? (((totalEnrollments - prevEnrollments) / prevEnrollments) * 100).toFixed(1)
            : totalEnrollments > 0 ? '100' : '0'
        const completionGrowth = prevCompletions > 0
            ? (((completionCount - prevCompletions) / prevCompletions) * 100).toFixed(1)
            : completionCount > 0 ? '100' : '0'

        // 3. Trending (Popular) Courses with real enrollment counts
        const popularCourses = await prisma.course.findMany({
            where: !isSuper ? { User: { unitKerja } } : {},
            include: {
                _count: {
                    select: { Enrollment: true }
                }
            },
            orderBy: {
                Enrollment: {
                    _count: "desc"
                }
            },
            take: 5
        })

        // 4. Real Activity Trend Data (Progress records)
        const recentActivity = await prisma.progress.findMany({
            where: {
                createdAt: { gte: startDate },
                ...(!isSuper && { User: { unitKerja } })
            },
            select: { createdAt: true }
        })

        // Generate trend buckets with REAL data (no random)
        const trend: number[] = []
        const bucketCount = timeframe === 'MONTHLY' ? 6 : (timeframe === 'DAILY' ? 7 : 12)

        for (let i = 0; i < bucketCount; i++) {
            let count = 0
            const d = new Date(now)
            if (timeframe === 'REALTIME') {
                d.setHours(now.getHours() - (bucketCount - 1 - i))
                count = recentActivity.filter(a =>
                    a.createdAt.getHours() === d.getHours() &&
                    a.createdAt.getDate() === d.getDate()
                ).length
            } else if (timeframe === 'DAILY') {
                d.setDate(now.getDate() - (bucketCount - 1 - i))
                count = recentActivity.filter(a => a.createdAt.getDate() === d.getDate()).length
            } else {
                d.setMonth(now.getMonth() - (bucketCount - 1 - i))
                count = recentActivity.filter(a => a.createdAt.getMonth() === d.getMonth()).length
            }
            // Scale for visual representation but keep real proportions
            trend.push(Math.max(count * 10, 5))
        }

        // Calculate completion rate
        const completionRate = totalEnrollments > 0
            ? ((completionCount / totalEnrollments) * 100).toFixed(1)
            : '0'

        return {
            stats: {
                learners: learnerCount,
                enrollments: totalEnrollments,
                completions: completionCount,
                points: pointsSum._sum.points || 0,
                courses: coursesCount,
                completionRate: parseFloat(completionRate),
                growth: enrollmentGrowth.startsWith('-') ? enrollmentGrowth + '%' : '+' + enrollmentGrowth + '%',
                completionGrowth: completionGrowth.startsWith('-') ? completionGrowth + '%' : '+' + completionGrowth + '%'
            },
            popularCourses: popularCourses.map(c => ({
                id: c.id,
                title: c.title,
                count: c._count.Enrollment,
                category: c.category
            })),
            trend
        }
    } catch (error) {
        console.error("Analytics fetch failed:", error)
        return { error: "Failed to fetch analytics" }
    }
}
