"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { WblmProgramStatus, WblmLearningLinkType } from "@/generated/prisma"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createMilestoneSchema = z.object({
    name: z.string().min(2, "Nama milestone minimal 2 karakter"),
    description: z.string().optional(),
    dueDate: z.date().optional().nullable(),
    requiredArtifactTypes: z.array(z.string()).min(1, "Minimal satu artifact type diperlukan"),
    requiresReview: z.boolean().default(true),
    requiresReflection: z.boolean().default(false),
    orderIndex: z.number().default(0)
})

const updateMilestoneSchema = createMilestoneSchema.partial()

const learningLinkSchema = z.object({
    type: z.nativeEnum(WblmLearningLinkType),
    resourceId: z.string().min(1, "Resource ID diperlukan"),
    title: z.string().min(2, "Judul minimal 2 karakter"),
    scheduleTime: z.date().optional().nullable(),
    url: z.string().optional(),
    notes: z.string().optional()
})

// ============================================
// MILESTONE CRUD OPERATIONS
// ============================================

/**
 * Create a new milestone for a program
 */
export async function createWblmMilestone(
    programId: string,
    data: z.infer<typeof createMilestoneSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            select: { ownerUserId: true, status: true, _count: { select: { Milestones: true } } }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (program.status !== WblmProgramStatus.DRAFT) {
            return { error: "Milestone hanya dapat ditambahkan saat program DRAFT" }
        }

        const validatedData = createMilestoneSchema.parse(data)

        const milestone = await prisma.wblmMilestone.create({
            data: {
                programId,
                name: validatedData.name,
                description: validatedData.description,
                dueDate: validatedData.dueDate,
                requiredArtifactTypes: validatedData.requiredArtifactTypes,
                requiresReview: validatedData.requiresReview,
                requiresReflection: validatedData.requiresReflection,
                orderIndex: validatedData.orderIndex || program._count.Milestones
            }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`)

        return { success: true, milestone }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error creating milestone:", error)
        return { error: "Gagal membuat milestone" }
    }
}

/**
 * Get milestones for a program
 */
export async function getWblmMilestones(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        const milestones = await prisma.wblmMilestone.findMany({
            where: { programId },
            include: {
                LearningLinks: true,
                _count: {
                    select: {
                        Submissions: true,
                        ParticipantMilestones: true
                    }
                }
            },
            orderBy: { orderIndex: "asc" }
        })

        return milestones
    } catch (error) {
        console.error("Error fetching milestones:", error)
        return []
    }
}

/**
 * Get a single milestone with participant status
 */
export async function getWblmMilestoneById(milestoneId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const milestone = await prisma.wblmMilestone.findUnique({
            where: { id: milestoneId },
            include: {
                Program: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        ownerUserId: true,
                        settings: true
                    }
                },
                LearningLinks: true,
                ParticipantMilestones: {
                    where: { participantId: session.user.id }
                },
                Submissions: {
                    where: { participantUserId: session.user.id },
                    include: {
                        Reviews: {
                            include: {
                                Reviewer: {
                                    select: { name: true, email: true, image: true }
                                }
                            },
                            orderBy: { createdAt: "desc" }
                        }
                    },
                    orderBy: { versionNumber: "desc" }
                }
            }
        })

        return milestone
    } catch (error) {
        console.error("Error fetching milestone:", error)
        return null
    }
}

/**
 * Update a milestone
 */
export async function updateWblmMilestone(
    milestoneId: string,
    data: z.infer<typeof updateMilestoneSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const milestone = await prisma.wblmMilestone.findUnique({
            where: { id: milestoneId },
            include: {
                Program: {
                    select: { ownerUserId: true, status: true }
                }
            }
        })

        if (!milestone) {
            return { error: "Milestone tidak ditemukan" }
        }

        if (milestone.Program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (milestone.Program.status !== WblmProgramStatus.DRAFT) {
            return { error: "Milestone hanya dapat diedit saat program DRAFT" }
        }

        const validatedData = updateMilestoneSchema.parse(data)

        const updated = await prisma.wblmMilestone.update({
            where: { id: milestoneId },
            data: validatedData
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${milestone.programId}`)

        return { success: true, milestone: updated }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error updating milestone:", error)
        return { error: "Gagal mengupdate milestone" }
    }
}

/**
 * Delete a milestone
 */
export async function deleteWblmMilestone(milestoneId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const milestone = await prisma.wblmMilestone.findUnique({
            where: { id: milestoneId },
            include: {
                Program: {
                    select: { ownerUserId: true, status: true, id: true }
                }
            }
        })

        if (!milestone) {
            return { error: "Milestone tidak ditemukan" }
        }

        if (milestone.Program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        if (milestone.Program.status !== WblmProgramStatus.DRAFT) {
            return { error: "Milestone hanya dapat dihapus saat program DRAFT" }
        }

        await prisma.wblmMilestone.delete({
            where: { id: milestoneId }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${milestone.Program.id}`)

        return { success: true, message: "Milestone berhasil dihapus!" }
    } catch (error) {
        console.error("Error deleting milestone:", error)
        return { error: "Gagal menghapus milestone" }
    }
}

/**
 * Reorder milestones
 */
export async function reorderWblmMilestones(
    programId: string,
    orderedIds: string[]
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

        // Update order indexes
        await prisma.$transaction(
            orderedIds.map((id, index) =>
                prisma.wblmMilestone.update({
                    where: { id },
                    data: { orderIndex: index }
                })
            )
        )

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`)

        return { success: true }
    } catch (error) {
        console.error("Error reordering milestones:", error)
        return { error: "Gagal mengurutkan ulang milestone" }
    }
}

// ============================================
// LEARNING LINK OPERATIONS
// ============================================

/**
 * Add a learning link to a milestone
 */
export async function addWblmLearningLink(
    milestoneId: string,
    data: z.infer<typeof learningLinkSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const milestone = await prisma.wblmMilestone.findUnique({
            where: { id: milestoneId },
            include: {
                Program: {
                    select: { ownerUserId: true, status: true, id: true }
                }
            }
        })

        if (!milestone) {
            return { error: "Milestone tidak ditemukan" }
        }

        if (milestone.Program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        const validatedData = learningLinkSchema.parse(data)

        const link = await prisma.wblmLearningLink.create({
            data: {
                programId: milestone.Program.id,
                milestoneId,
                ...validatedData
            }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${milestone.Program.id}`)

        return { success: true, link }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error adding learning link:", error)
        return { error: "Gagal menambah learning link" }
    }
}

/**
 * Remove a learning link
 */
export async function removeWblmLearningLink(linkId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const link = await prisma.wblmLearningLink.findUnique({
            where: { id: linkId },
            include: {
                Milestone: {
                    include: {
                        Program: {
                            select: { ownerUserId: true, id: true }
                        }
                    }
                }
            }
        })

        if (!link) {
            return { error: "Learning link tidak ditemukan" }
        }

        if (link.Milestone.Program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        await prisma.wblmLearningLink.delete({
            where: { id: linkId }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${link.Milestone.Program.id}`)

        return { success: true, message: "Learning link berhasil dihapus!" }
    } catch (error) {
        console.error("Error removing learning link:", error)
        return { error: "Gagal menghapus learning link" }
    }
}
