"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

/**
 * Delete a course - only owner (instructor) or admin can delete
 */
export async function deleteCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Get course to check ownership
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true, title: true }
        })

        if (!course) {
            return { success: false, error: "Course not found" }
        }

        // Only instructor owner or admin can delete
        const isOwner = course.instructorId === session.user.id
        const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN_UNIT"

        if (!isOwner && !isAdmin) {
            return { success: false, error: "Forbidden - not authorized to delete this course" }
        }

        // Delete related records first (cascade delete)
        await prisma.$transaction([
            // Delete enrollments
            prisma.enrollment.deleteMany({ where: { courseId } }),
            // Delete sync progress
            prisma.syncCourseProgress.deleteMany({ where: { courseId } }),
            // Delete modules and lessons
            prisma.lesson.deleteMany({
                where: { Module: { courseId } }
            }),
            prisma.module.deleteMany({ where: { courseId } }),
            // Finally delete the course
            prisma.course.delete({ where: { id: courseId } })
        ])

        console.log(`[Course] Deleted course: ${courseId} - ${course.title}`)

        revalidatePath("/dashboard/instructor")
        revalidatePath("/courses")

        return { success: true }
    } catch (error: any) {
        console.error("[Course] Error deleting course:", error)
        return { success: false, error: error.message }
    }
}
