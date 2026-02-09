"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
    WblmProgramStatus,
    WblmEnrollmentStatus,
    WblmMilestoneStatus
} from "@/generated/prisma"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createProgramSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter"),
    description: z.string().optional(),
    targetRoles: z.array(z.string()).default([]),
    durationWeeks: z.number().min(1, "Durasi minimal 1 minggu"),
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),
    reviewerPoolIds: z.array(z.string()).default([]),
    settings: z.object({
        allowSupervisorReview: z.boolean().default(false),
        reviewerScoringEnabled: z.boolean().default(true),
        maxRevisionCycles: z.number().nullable().default(null),
        evidenceVisibility: z.enum(["participant_only", "org", "org_plus_auditor"]).default("participant_only"),
        safeToLearnStatement: z.string().optional()
    }).optional()
})

const updateProgramSchema = createProgramSchema.partial().extend({
    status: z.nativeEnum(WblmProgramStatus).optional()
})

// ============================================
// PROGRAM CRUD OPERATIONS
// ============================================

/**
 * Create a new WBLM Program
 */
export async function createWblmProgram(data: z.infer<typeof createProgramSchema>) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        // Only admins, instructors can create programs
        if (!["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses untuk membuat program WBLM" }
        }

        const validatedData = createProgramSchema.parse(data)

        const program = await prisma.wblmProgram.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                targetRoles: validatedData.targetRoles,
                durationWeeks: validatedData.durationWeeks,
                startDate: validatedData.startDate,
                endDate: validatedData.endDate,
                ownerUserId: session.user.id,
                reviewerPoolIds: validatedData.reviewerPoolIds,
                settings: validatedData.settings || {},
                status: WblmProgramStatus.DRAFT
            }
        })

        revalidatePath("/dashboard/admin/wblm")
        revalidatePath("/dashboard/wblm")

        return { success: true, program }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error creating WBLM program:", error)
        return { error: "Gagal membuat program WBLM" }
    }
}

/**
 * Get WBLM programs based on user role
 */
export async function getWblmPrograms(filters?: {
    role?: "owner" | "participant" | "reviewer"
    status?: WblmProgramStatus
    limit?: number
    offset?: number
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        const limit = filters?.limit || 20
        const offset = filters?.offset || 0

        let whereClause: Record<string, unknown> = {}

        // Filter by status if provided
        if (filters?.status) {
            whereClause.status = filters.status
        }

        // Role-based filtering
        if (filters?.role === "owner") {
            whereClause.ownerUserId = session.user.id
        } else if (filters?.role === "participant") {
            whereClause.Enrollments = {
                some: { participantUserId: session.user.id }
            }
        } else if (filters?.role === "reviewer") {
            whereClause.ReviewAssignments = {
                some: { reviewerUserId: session.user.id }
            }
        } else {
            // Default: show programs user has access to
            if (!["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
                whereClause.OR = [
                    { ownerUserId: session.user.id },
                    { Enrollments: { some: { participantUserId: session.user.id } } },
                    { ReviewAssignments: { some: { reviewerUserId: session.user.id } } }
                ]
            }
        }

        const programs = await prisma.wblmProgram.findMany({
            where: whereClause,
            include: {
                Owner: {
                    select: { name: true, email: true, image: true }
                },
                _count: {
                    select: {
                        Milestones: true,
                        Enrollments: true,
                        Tasks: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset
        })

        return programs
    } catch (error) {
        console.error("Error fetching WBLM programs:", error)
        return []
    }
}

/**
 * Get a single WBLM program by ID
 */
export async function getWblmProgramById(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            include: {
                Owner: {
                    select: { name: true, email: true, image: true }
                },
                Tasks: {
                    orderBy: { createdAt: "asc" }
                },
                Milestones: {
                    orderBy: { orderIndex: "asc" },
                    include: {
                        LearningLinks: true,
                        _count: {
                            select: { Submissions: true }
                        }
                    }
                },
                Enrollments: {
                    include: {
                        Participant: {
                            select: { id: true, name: true, email: true, image: true }
                        },
                        Supervisor: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                _count: {
                    select: {
                        Enrollments: true,
                        ReviewAssignments: true
                    }
                }
            }
        })

        if (!program) return null

        // Check access
        const isOwner = program.ownerUserId === session.user.id
        const isAdmin = ["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        const isEnrolled = program.Enrollments.some(e => e.participantUserId === session.user.id)

        if (!isOwner && !isAdmin && !isEnrolled) {
            // Check if reviewer
            const isReviewer = await prisma.wblmReviewAssignment.findFirst({
                where: {
                    programId,
                    reviewerUserId: session.user.id
                }
            })

            if (!isReviewer && program.status === WblmProgramStatus.DRAFT) {
                return null
            }
        }

        return program
    } catch (error) {
        console.error("Error fetching WBLM program:", error)
        return null
    }
}

/**
 * Update a WBLM program
 */
export async function updateWblmProgram(
    programId: string,
    data: z.infer<typeof updateProgramSchema>
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

        // Check ownership or admin
        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses untuk mengedit program ini" }
        }

        // Cannot edit CLOSED/ARCHIVED programs
        if (program.status === WblmProgramStatus.CLOSED ||
            program.status === WblmProgramStatus.ARCHIVED) {
            return { error: "Program yang sudah ditutup tidak dapat diedit" }
        }

        const validatedData = updateProgramSchema.parse(data)

        const updatedProgram = await prisma.wblmProgram.update({
            where: { id: programId },
            data: {
                ...validatedData,
                settings: validatedData.settings || undefined
            }
        })

        revalidatePath("/dashboard/admin/wblm")
        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`)
        revalidatePath("/dashboard/wblm")

        return { success: true, program: updatedProgram }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error updating WBLM program:", error)
        return { error: "Gagal mengupdate program WBLM" }
    }
}

/**
 * Publish a WBLM program (DRAFT -> PUBLISHED)
 */
export async function publishWblmProgram(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            include: {
                Milestones: true,
                Tasks: true
            }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses untuk mempublish program ini" }
        }

        if (program.status !== WblmProgramStatus.DRAFT) {
            return { error: "Hanya program DRAFT yang dapat dipublish" }
        }

        // Validation: must have at least one milestone
        if (program.Milestones.length === 0) {
            return { error: "Program harus memiliki minimal satu milestone sebelum dipublish" }
        }

        // Validation: each milestone must have required artifact types
        const invalidMilestones = program.Milestones.filter(m => m.requiredArtifactTypes.length === 0)
        if (invalidMilestones.length > 0) {
            return { error: "Setiap milestone harus memiliki minimal satu artifact type yang wajib" }
        }

        await prisma.wblmProgram.update({
            where: { id: programId },
            data: { status: WblmProgramStatus.PUBLISHED }
        })

        revalidatePath("/dashboard/admin/wblm")
        revalidatePath("/dashboard/wblm")

        return { success: true, message: "Program berhasil dipublish!" }
    } catch (error) {
        console.error("Error publishing WBLM program:", error)
        return { error: "Gagal mempublish program WBLM" }
    }
}

/**
 * Start a WBLM program (PUBLISHED -> RUNNING)
 */
export async function startWblmProgram(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (program.status !== WblmProgramStatus.PUBLISHED) {
            return { error: "Hanya program PUBLISHED yang dapat dimulai" }
        }

        await prisma.wblmProgram.update({
            where: { id: programId },
            data: {
                status: WblmProgramStatus.RUNNING,
                startDate: program.startDate || new Date()
            }
        })

        // Update enrolled participants to ACTIVE
        await prisma.wblmEnrollment.updateMany({
            where: {
                programId,
                status: WblmEnrollmentStatus.ENROLLED
            },
            data: { status: WblmEnrollmentStatus.ACTIVE }
        })

        revalidatePath("/dashboard/admin/wblm")
        revalidatePath("/dashboard/wblm")

        return { success: true, message: "Program berhasil dimulai!" }
    } catch (error) {
        console.error("Error starting WBLM program:", error)
        return { error: "Gagal memulai program WBLM" }
    }
}

/**
 * Close a WBLM program (RUNNING -> CLOSED)
 */
export async function closeWblmProgram(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (program.status !== WblmProgramStatus.RUNNING) {
            return { error: "Hanya program RUNNING yang dapat ditutup" }
        }

        await prisma.$transaction([
            // Update program status
            prisma.wblmProgram.update({
                where: { id: programId },
                data: {
                    status: WblmProgramStatus.CLOSED,
                    endDate: program.endDate || new Date()
                }
            }),
            // Lock all milestone statuses
            prisma.wblmParticipantMilestone.updateMany({
                where: {
                    Milestone: { programId }
                },
                data: { status: WblmMilestoneStatus.LOCKED }
            })
        ])

        revalidatePath("/dashboard/admin/wblm")
        revalidatePath("/dashboard/wblm")

        return { success: true, message: "Program berhasil ditutup!" }
    } catch (error) {
        console.error("Error closing WBLM program:", error)
        return { error: "Gagal menutup program WBLM" }
    }
}

/**
 * Archive a WBLM program (CLOSED -> ARCHIVED)
 */
export async function archiveWblmProgram(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (program.status !== WblmProgramStatus.CLOSED) {
            return { error: "Hanya program CLOSED yang dapat diarsipkan" }
        }

        await prisma.wblmProgram.update({
            where: { id: programId },
            data: { status: WblmProgramStatus.ARCHIVED }
        })

        revalidatePath("/dashboard/admin/wblm")

        return { success: true, message: "Program berhasil diarsipkan!" }
    } catch (error) {
        console.error("Error archiving WBLM program:", error)
        return { error: "Gagal mengarsipkan program WBLM" }
    }
}

/**
 * Delete a WBLM program (only DRAFT)
 */
export async function deleteWblmProgram(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (program.status !== WblmProgramStatus.DRAFT) {
            return { error: "Hanya program DRAFT yang dapat dihapus" }
        }

        await prisma.wblmProgram.delete({
            where: { id: programId }
        })

        revalidatePath("/dashboard/admin/wblm")

        return { success: true, message: "Program berhasil dihapus!" }
    } catch (error) {
        console.error("Error deleting WBLM program:", error)
        return { error: "Gagal menghapus program WBLM" }
    }
}

/**
 * Get program statistics for owner/admin dashboard
 */
export async function getWblmProgramStats(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const [
            enrollmentCount,
            completedCount,
            submissionCount,
            pendingReviewCount
        ] = await Promise.all([
            prisma.wblmEnrollment.count({
                where: { programId }
            }),
            prisma.wblmEnrollment.count({
                where: { programId, status: WblmEnrollmentStatus.COMPLETED }
            }),
            prisma.wblmSubmission.count({
                where: { programId }
            }),
            prisma.wblmSubmission.count({
                where: {
                    programId,
                    status: WblmMilestoneStatus.SUBMITTED
                }
            })
        ])

        return {
            enrollmentCount,
            completedCount,
            completionRate: enrollmentCount > 0 ? Math.round((completedCount / enrollmentCount) * 100) : 0,
            submissionCount,
            pendingReviewCount
        }
    } catch (error) {
        console.error("Error fetching program stats:", error)
        return null
    }
}
