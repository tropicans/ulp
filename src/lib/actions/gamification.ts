"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type GamificationAction =
    | "LESSON_COMPLETE"
    | "QUIZ_PASS"
    | "DAILY_LOGIN"
    | "COURSE_COMPLETE"
    | "ATTENDANCE_PRESENT"

const POINT_VALUES: Record<GamificationAction, number> = {
    LESSON_COMPLETE: 10,
    QUIZ_PASS: 30,
    COURSE_COMPLETE: 100,
    DAILY_LOGIN: 5,
    ATTENDANCE_PRESENT: 20
}

/**
 * Award points to a user for a specific action
 */
export async function awardPoints(userId: string, action: GamificationAction) {
    try {
        const pointsToAdd = POINT_VALUES[action]

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                points: { increment: pointsToAdd },
                lastActiveAt: new Date()
            }
        })

        // Simple level up logic: every 200 points is a level
        const newLevel = Math.floor(user.points / 200) + 1
        if (newLevel > user.level) {
            await prisma.user.update({
                where: { id: userId },
                data: { level: newLevel }
            })

            // Award level-up badge if applicable
            await checkAndAwardLevelBadges(userId, newLevel)
        }

        return { success: true, pointsEarned: pointsToAdd, currentPoints: user.points }
    } catch (error) {
        console.error("Error awarding points:", error)
        return { error: "Failed to award points" }
    }
}

/**
 * Update user activity streak
 */
export async function updateActivityStreak(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { lastActiveAt: true, streak: true }
        })

        if (!user) return { error: "User not found" }

        const now = new Date()
        const lastActive = user.lastActiveAt

        if (!lastActive) {
            // First activity
            await prisma.user.update({
                where: { id: userId },
                data: { streak: 1, lastActiveAt: now }
            })
            return { streak: 1 }
        }

        const diffTime = Math.abs(now.getTime() - lastActive.getTime())
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
            // Consecutive day
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    streak: { increment: 1 },
                    lastActiveAt: now
                }
            })

            // Award points for daily activity
            await awardPoints(userId, "DAILY_LOGIN")

            return { streak: updatedUser.streak }
        } else if (diffDays > 1) {
            // Streak broken
            await prisma.user.update({
                where: { id: userId },
                data: {
                    streak: 1,
                    lastActiveAt: now
                }
            })
            return { streak: 1 }
        }

        // Still same day, just update timestamp
        await prisma.user.update({
            where: { id: userId },
            data: { lastActiveAt: now }
        })

        return { streak: user.streak }
    } catch (error) {
        console.error("Error updating streak:", error)
        return { error: "Failed to update streak" }
    }
}

/**
 * Common level-based badges
 */
async function checkAndAwardLevelBadges(userId: string, level: number) {
    // Logic to award level-specific badges
    // This would look for badges with type 'MILESTONE' and criteria matching the level
    // For now, let's keep it simple as we need to seed the badges first
}

/**
 * Get user gamification statistics
 */
export async function getUserGamificationStats() {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                points: true,
                level: true,
                streak: true,
                UserBadge: {
                    include: {
                        Badge: true
                    }
                }
            }
        })

        if (!user) return { error: "User not found" }

        return {
            points: user.points,
            level: user.level,
            streak: user.streak,
            badges: user.UserBadge.map((ub) => ub.Badge),
            nextLevelExp: (user.level || 1) * 200,
            currentProgress: (user.points || 0) % 200
        }
    } catch (error) {
        return { error: "Failed to fetch stats" }
    }
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(limit = 10, unitKerja?: string) {
    try {
        const players = await prisma.user.findMany({
            where: unitKerja ? { unitKerja } : undefined,
            orderBy: { points: "desc" },
            take: limit,
            select: {
                id: true,
                name: true,
                image: true,
                points: true,
                level: true,
                unitKerja: true
            }
        })

        return { players }
    } catch (error) {
        return { error: "Failed to fetch leaderboard" }
    }
}
