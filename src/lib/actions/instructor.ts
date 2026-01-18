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
        // Find all courses by this instructor
        const instructorCourses = await prisma.course.findMany({
            where: { instructorId: session.user.id },
            select: { id: true, title: true }
        })

        const courseIds = instructorCourses.map(c => c.id)

        // Find all enrollments for these courses
        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId: { in: courseIds }
            },
            include: {
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
                        title: true
                    }
                }
            },
            orderBy: { enrolledAt: "desc" }
        })

        // Group by user to show aggregate stats if needed
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
                courseTitle: en.Course.title,
                enrolledAt: en.enrolledAt,
                progress: 0 // Placeholder, calculation needed
            })
        })

        return { students: Array.from(studentsMap.values()) }
    } catch (error) {
        console.error("Error fetching instructor students:", error)
        return { error: "Failed to fetch student data" }
    }
}
