"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
    WblmProgramStatus,
    WblmEnrollmentStatus,
    WblmReviewerRole
} from "@/generated/prisma"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const enrollParticipantsSchema = z.object({
    userIds: z.array(z.string()).min(1, "Minimal satu peserta diperlukan"),
    supervisorMappings: z.record(z.string(), z.string()).optional() // participantId -> supervisorId
})

const assignReviewerSchema = z.object({
    participantUserId: z.string().min(1, "Participant diperlukan"),
    reviewerUserId: z.string().min(1, "Reviewer diperlukan"),
    milestoneId: z.string().optional().nullable(),
    role: z.nativeEnum(WblmReviewerRole).default(WblmReviewerRole.REVIEWER)
})

// ============================================
// ENROLLMENT OPERATIONS
// ============================================

/**
 * Enroll participants in a WBLM program (bulk)
 */
export async function enrollWblmParticipants(
    programId: string,
    data: z.infer<typeof enrollParticipantsSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            select: { ownerUserId: true, status: true }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        // Can only enroll in DRAFT or PUBLISHED programs
        if (program.status !== WblmProgramStatus.DRAFT &&
            program.status !== WblmProgramStatus.PUBLISHED) {
            return { error: "Tidak dapat mendaftarkan peserta pada program yang sudah berjalan" }
        }

        const validatedData = enrollParticipantsSchema.parse(data)

        // Get existing enrollments to avoid duplicates
        const existing = await prisma.wblmEnrollment.findMany({
            where: {
                programId,
                participantUserId: { in: validatedData.userIds }
            },
            select: { participantUserId: true }
        })

        const existingIds = new Set(existing.map(e => e.participantUserId))
        const newUserIds = validatedData.userIds.filter(id => !existingIds.has(id))

        if (newUserIds.length === 0) {
            return { error: "Semua peserta sudah terdaftar" }
        }

        // Create enrollments
        await prisma.wblmEnrollment.createMany({
            data: newUserIds.map(userId => ({
                programId,
                participantUserId: userId,
                supervisorUserId: validatedData.supervisorMappings?.[userId] || null,
                status: program.status === WblmProgramStatus.PUBLISHED
                    ? WblmEnrollmentStatus.ENROLLED
                    : WblmEnrollmentStatus.INVITED
            }))
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`)
        revalidatePath(`/dashboard/admin/wblm/programs/${programId}/enrollments`)

        return {
            success: true,
            message: `Berhasil mendaftarkan ${newUserIds.length} peserta`,
            enrolledCount: newUserIds.length,
            skippedCount: existingIds.size
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error enrolling participants:", error)
        return { error: "Gagal mendaftarkan peserta" }
    }
}

/**
 * Get enrollments for a program
 */
export async function getWblmEnrollments(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        const enrollments = await prisma.wblmEnrollment.findMany({
            where: { programId },
            include: {
                Participant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        unitKerja: true,
                        jabatan: true
                    }
                },
                Supervisor: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { joinedAt: "asc" }
        })

        return enrollments
    } catch (error) {
        console.error("Error fetching enrollments:", error)
        return []
    }
}

/**
 * Update enrollment status
 */
export async function updateWblmEnrollmentStatus(
    enrollmentId: string,
    status: WblmEnrollmentStatus
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const enrollment = await prisma.wblmEnrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                Program: {
                    select: { ownerUserId: true, id: true }
                }
            }
        })

        if (!enrollment) {
            return { error: "Enrollment tidak ditemukan" }
        }

        if (enrollment.Program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        const updated = await prisma.wblmEnrollment.update({
            where: { id: enrollmentId },
            data: {
                status,
                completedAt: status === WblmEnrollmentStatus.COMPLETED ? new Date() : null
            }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${enrollment.Program.id}/enrollments`)

        return { success: true, enrollment: updated }
    } catch (error) {
        console.error("Error updating enrollment:", error)
        return { error: "Gagal mengupdate status enrollment" }
    }
}

/**
 * Remove a participant from program
 */
export async function withdrawWblmEnrollment(enrollmentId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const enrollment = await prisma.wblmEnrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                Program: {
                    select: { ownerUserId: true, id: true, status: true }
                }
            }
        })

        if (!enrollment) {
            return { error: "Enrollment tidak ditemukan" }
        }

        // Allow self-withdrawal or admin withdrawal
        const isSelf = enrollment.participantUserId === session.user.id
        const isOwner = enrollment.Program.ownerUserId === session.user.id
        const isAdmin = ["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)

        if (!isSelf && !isOwner && !isAdmin) {
            return { error: "Anda tidak memiliki akses" }
        }

        // Can't withdraw from completed programs
        if (enrollment.status === WblmEnrollmentStatus.COMPLETED) {
            return { error: "Tidak dapat mengundurkan diri dari program yang sudah selesai" }
        }

        await prisma.wblmEnrollment.update({
            where: { id: enrollmentId },
            data: { status: WblmEnrollmentStatus.WITHDRAWN }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${enrollment.Program.id}/enrollments`)
        revalidatePath("/dashboard/wblm")

        return { success: true, message: "Berhasil mengundurkan diri dari program" }
    } catch (error) {
        console.error("Error withdrawing enrollment:", error)
        return { error: "Gagal mengundurkan diri" }
    }
}

// ============================================
// REVIEWER ASSIGNMENT OPERATIONS
// ============================================

/**
 * Assign a reviewer to a participant
 */
export async function assignWblmReviewer(
    programId: string,
    data: z.infer<typeof assignReviewerSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            select: { ownerUserId: true }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        const validatedData = assignReviewerSchema.parse(data)

        // Check if assignment already exists
        const existing = await prisma.wblmReviewAssignment.findFirst({
            where: {
                programId,
                participantUserId: validatedData.participantUserId,
                reviewerUserId: validatedData.reviewerUserId,
                milestoneId: validatedData.milestoneId || null
            }
        })

        if (existing) {
            return { error: "Reviewer sudah ditugaskan untuk peserta ini" }
        }

        const assignment = await prisma.wblmReviewAssignment.create({
            data: {
                programId,
                participantUserId: validatedData.participantUserId,
                reviewerUserId: validatedData.reviewerUserId,
                milestoneId: validatedData.milestoneId || null,
                role: validatedData.role
            },
            include: {
                Reviewer: {
                    select: { name: true, email: true }
                },
                Participant: {
                    select: { name: true, email: true }
                }
            }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}/enrollments`)

        return { success: true, assignment }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error assigning reviewer:", error)
        return { error: "Gagal menugaskan reviewer" }
    }
}

/**
 * Bulk assign reviewers (auto-assign from pool)
 */
export async function autoAssignWblmReviewers(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            include: {
                Enrollments: {
                    where: { status: { in: [WblmEnrollmentStatus.ENROLLED, WblmEnrollmentStatus.ACTIVE] } }
                },
                ReviewAssignments: true
            }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (program.reviewerPoolIds.length === 0) {
            return { error: "Tidak ada reviewer pool yang dikonfigurasi" }
        }

        // Find participants without reviewers
        const participantsWithReviewers = new Set(
            program.ReviewAssignments.map(ra => ra.participantUserId)
        )
        const participantsNeedingReviewers = program.Enrollments.filter(
            e => !participantsWithReviewers.has(e.participantUserId)
        )

        if (participantsNeedingReviewers.length === 0) {
            return { success: true, message: "Semua peserta sudah memiliki reviewer" }
        }

        // Round-robin assignment
        const reviewerIds = program.reviewerPoolIds
        let assignmentCount = 0

        for (let i = 0; i < participantsNeedingReviewers.length; i++) {
            const participant = participantsNeedingReviewers[i]
            const reviewerId = reviewerIds[i % reviewerIds.length]

            // Don't assign someone as their own reviewer
            if (reviewerId === participant.participantUserId) continue

            await prisma.wblmReviewAssignment.create({
                data: {
                    programId,
                    participantUserId: participant.participantUserId,
                    reviewerUserId: reviewerId,
                    role: WblmReviewerRole.REVIEWER
                }
            })
            assignmentCount++
        }

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}/enrollments`)

        return {
            success: true,
            message: `Berhasil menugaskan ${assignmentCount} reviewer`
        }
    } catch (error) {
        console.error("Error auto-assigning reviewers:", error)
        return { error: "Gagal menugaskan reviewer secara otomatis" }
    }
}

/**
 * Remove reviewer assignment
 */
export async function removeWblmReviewerAssignment(assignmentId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const assignment = await prisma.wblmReviewAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                Program: {
                    select: { ownerUserId: true, id: true }
                }
            }
        })

        if (!assignment) {
            return { error: "Assignment tidak ditemukan" }
        }

        if (assignment.Program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        await prisma.wblmReviewAssignment.delete({
            where: { id: assignmentId }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${assignment.Program.id}/enrollments`)

        return { success: true, message: "Reviewer assignment berhasil dihapus" }
    } catch (error) {
        console.error("Error removing reviewer assignment:", error)
        return { error: "Gagal menghapus reviewer assignment" }
    }
}

/**
 * Get potential reviewers (for selection UI)
 */
export async function getWblmPotentialReviewers(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            select: { reviewerPoolIds: true }
        })

        if (!program) return []

        // If pool is defined, use it; otherwise get instructors
        if (program.reviewerPoolIds.length > 0) {
            return await prisma.user.findMany({
                where: { id: { in: program.reviewerPoolIds } },
                select: { id: true, name: true, email: true, image: true, unitKerja: true }
            })
        }

        // Default: return instructors and admins
        return await prisma.user.findMany({
            where: { role: { in: ["INSTRUCTOR", "ADMIN_UNIT", "SUPER_ADMIN"] } },
            select: { id: true, name: true, email: true, image: true, unitKerja: true },
            take: 50
        })
    } catch (error) {
        console.error("Error fetching potential reviewers:", error)
        return []
    }
}
