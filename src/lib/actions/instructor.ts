"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * Get all students enrolled in an instructor's courses
 */
export async function getInstructorStudents() {
    const session = await auth()
    if (!session || session.user.role !== "INSTRUCTOR") {
        return { error: "Unauthorized" }
    }

    try {
        // Single optimized query instead of N+1
        const enrollments = await prisma.enrollment.findMany({
            where: {
                Course: {
                    instructorId: session.user.id
                }
            },
            select: {
                enrolledAt: true,
                progressPercent: true,
                User: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        unitKerja: true,
                        nip: true
                    }
                },
                Course: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: { enrolledAt: "desc" }
        })

        // Group by user to show aggregate stats
        const studentsMap = new Map()
        enrollments.forEach(en => {
            const studentId = en.User.id
            if (!studentsMap.has(studentId)) {
                studentsMap.set(studentId, {
                    ...en.User,
                    courses: []
                })
            }
            studentsMap.get(studentId).courses.push({
                courseId: en.Course.id,
                courseTitle: en.Course.title,
                enrolledAt: en.enrolledAt,
                progress: en.progressPercent
            })
        })

        return { students: Array.from(studentsMap.values()) }
    } catch (error) {
        console.error("Error fetching instructor students:", error)
        return { error: "Failed to fetch student data" }
    }
}
