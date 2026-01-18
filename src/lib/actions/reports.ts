"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createAuditLog } from "@/lib/actions/admin"

/**
 * Get Instructor Analytics
 */
export async function getInstructorAnalytics() {
    const session = await auth()
    if (!session || session.user.role !== "INSTRUCTOR") {
        return { error: "Unauthorized" }
    }

    try {
        const courses = await prisma.course.findMany({
            where: { instructorId: session.user.id },
            include: {
                _count: {
                    select: { Enrollment: true }
                },
                Module: {
                    include: {
                        Lesson: {
                            include: {
                                Progress: true
                            }
                        }
                    }
                }
            }
        })

        // Simple stats for now
        const totalEnrollments = courses.reduce((acc, c) => acc + c._count.Enrollment, 0)

        return {
            courses: courses.map(c => ({
                id: c.id,
                title: c.title,
                enrollments: c._count.Enrollment,
                isPublished: c.isPublished
            })),
            totalEnrollments,
            courseCount: courses.length
        }
    } catch (error) {
        return { error: "Failed to fetch analytics" }
    }
}

/**
 * Get Admin Reports (Unit or Platform wide)
 */
export async function getAdminReports() {
    const session = await auth()
    if (!session || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const isSuper = session.user.role === "SUPER_ADMIN"
        const unitKerja = session.user.unitKerja

        const enrollments = await prisma.enrollment.findMany({
            where: !isSuper ? {
                User: { unitKerja }
            } : {},
            include: {
                User: {
                    select: { name: true, unitKerja: true }
                },
                Course: {
                    select: { title: true, category: true }
                }
            },
            orderBy: { enrolledAt: "desc" },
            take: 100
        })

        const courseStatsRaw = await prisma.course.findMany({
            where: !isSuper ? {
                User: { unitKerja }
            } : {},
            select: { category: true }
        })

        const statsMap = new Map()
        courseStatsRaw.forEach(c => {
            const cat = c.category || "Uncategorized"
            statsMap.set(cat, (statsMap.get(cat) || 0) + 1)
        })

        const courseStats = Array.from(statsMap.entries()).map(([category, count]) => ({
            category,
            _count: { _all: count }
        }))

        return {
            latestEnrollments: enrollments,
            categoryDistribution: courseStats
        }
    } catch (error) {
        return { error: "Failed to fetch reports" }
    }
}
