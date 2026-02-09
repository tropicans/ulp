"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
    WblmMilestoneStatus,
    WblmEnrollmentStatus
} from "@/generated/prisma"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const fileRefSchema = z.object({
    id: z.string(),
    storageUrl: z.string(),
    filename: z.string(),
    mime: z.string(),
    size: z.number(),
    checksum: z.string().optional()
})

const createSubmissionSchema = z.object({
    title: z.string().optional(),
    notes: z.string().optional(),
    files: z.array(fileRefSchema).min(1, "Minimal satu file diperlukan")
})

// ============================================
// SUBMISSION OPERATIONS
// ============================================

/**
 * Create a new submission for a milestone (v1)
 */
export async function createWblmSubmission(
    milestoneId: string,
    data: z.infer<typeof createSubmissionSchema>
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
                    select: {
                        id: true,
                        status: true,
                        settings: true
                    },
                    include: {
                        Enrollments: {
                            where: { participantUserId: session.user.id }
                        }
                    }
                },
                Submissions: {
                    where: { participantUserId: session.user.id },
                    orderBy: { versionNumber: "desc" },
                    take: 1
                }
            }
        })

        if (!milestone) {
            return { error: "Milestone tidak ditemukan" }
        }

        // Check enrollment
        if (milestone.Program.Enrollments.length === 0) {
            return { error: "Anda tidak terdaftar pada program ini" }
        }

        const enrollment = milestone.Program.Enrollments[0]
        if (enrollment.status !== WblmEnrollmentStatus.ENROLLED &&
            enrollment.status !== WblmEnrollmentStatus.ACTIVE) {
            return { error: "Status enrollment Anda tidak aktif" }
        }

        // Check if already has a submission (should use revision endpoint instead)
        if (milestone.Submissions.length > 0) {
            return { error: "Gunakan revisi untuk mengupdate submission yang sudah ada" }
        }

        const validatedData = createSubmissionSchema.parse(data)

        // Create submission and update participant milestone status
        const [submission] = await prisma.$transaction([
            prisma.wblmSubmission.create({
                data: {
                    programId: milestone.Program.id,
                    milestoneId,
                    participantUserId: session.user.id,
                    versionNumber: 1,
                    title: validatedData.title,
                    notes: validatedData.notes,
                    files: validatedData.files,
                    status: WblmMilestoneStatus.SUBMITTED
                }
            }),
            prisma.wblmParticipantMilestone.upsert({
                where: {
                    milestoneId_participantId: {
                        milestoneId,
                        participantId: session.user.id
                    }
                },
                create: {
                    milestoneId,
                    participantId: session.user.id,
                    status: WblmMilestoneStatus.SUBMITTED
                },
                update: {
                    status: WblmMilestoneStatus.SUBMITTED
                }
            })
        ])

        revalidatePath(`/dashboard/wblm/programs/${milestone.Program.id}/milestones/${milestoneId}`)

        return { success: true, submission }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error creating submission:", error)
        return { error: "Gagal membuat submission" }
    }
}

/**
 * Create a revision (v+1) for an existing submission
 */
export async function createWblmRevision(
    submissionId: string,
    data: z.infer<typeof createSubmissionSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const originalSubmission = await prisma.wblmSubmission.findUnique({
            where: { id: submissionId },
            include: {
                Milestone: {
                    include: {
                        Program: {
                            select: {
                                id: true,
                                status: true,
                                settings: true
                            }
                        }
                    }
                }
            }
        })

        if (!originalSubmission) {
            return { error: "Submission tidak ditemukan" }
        }

        // Must be the owner
        if (originalSubmission.participantUserId !== session.user.id) {
            return { error: "Anda tidak memiliki akses" }
        }

        // Check if revision is allowed
        if (originalSubmission.status === WblmMilestoneStatus.APPROVED_FINAL) {
            return { error: "Submission sudah disetujui, tidak dapat direvisi" }
        }

        if (originalSubmission.status === WblmMilestoneStatus.LOCKED) {
            return { error: "Submission sudah dikunci" }
        }

        // Check max revision cycles if configured
        const settings = originalSubmission.Milestone.Program.settings as Record<string, unknown> | null
        const maxCycles = settings?.maxRevisionCycles as number | null
        if (maxCycles) {
            // Get current version count
            const versionCount = await prisma.wblmSubmission.count({
                where: {
                    milestoneId: originalSubmission.milestoneId,
                    participantUserId: session.user.id
                }
            })
            if (versionCount >= maxCycles) {
                return { error: `Batas revisi (${maxCycles}x) sudah tercapai` }
            }
        }

        const validatedData = createSubmissionSchema.parse(data)

        // Get next version number
        const latestSubmission = await prisma.wblmSubmission.findFirst({
            where: {
                milestoneId: originalSubmission.milestoneId,
                participantUserId: session.user.id
            },
            orderBy: { versionNumber: "desc" }
        })

        const nextVersion = (latestSubmission?.versionNumber || 0) + 1

        const [revision] = await prisma.$transaction([
            prisma.wblmSubmission.create({
                data: {
                    programId: originalSubmission.Milestone.Program.id,
                    milestoneId: originalSubmission.milestoneId,
                    participantUserId: session.user.id,
                    versionNumber: nextVersion,
                    title: validatedData.title,
                    notes: validatedData.notes,
                    files: validatedData.files,
                    status: WblmMilestoneStatus.RESUBMITTED
                }
            }),
            prisma.wblmParticipantMilestone.update({
                where: {
                    milestoneId_participantId: {
                        milestoneId: originalSubmission.milestoneId,
                        participantId: session.user.id
                    }
                },
                data: { status: WblmMilestoneStatus.RESUBMITTED }
            })
        ])

        revalidatePath(`/dashboard/wblm/programs/${originalSubmission.Milestone.Program.id}`)

        return { success: true, submission: revision, version: nextVersion }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error creating revision:", error)
        return { error: "Gagal membuat revisi" }
    }
}

/**
 * Get submissions for a milestone (participant view)
 */
export async function getWblmSubmissions(
    milestoneId: string,
    participantUserId?: string
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        // Default to current user if not specified
        const userId = participantUserId || session.user.id

        // If viewing someone else's submissions, check authorization
        if (userId !== session.user.id) {
            // Check if reviewer or admin
            const milestone = await prisma.wblmMilestone.findUnique({
                where: { id: milestoneId },
                select: { programId: true }
            })

            if (!milestone) return []

            const isAuthorized = await prisma.wblmReviewAssignment.findFirst({
                where: {
                    programId: milestone.programId,
                    participantUserId: userId,
                    reviewerUserId: session.user.id
                }
            })

            if (!isAuthorized && !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
                return []
            }
        }

        const submissions = await prisma.wblmSubmission.findMany({
            where: {
                milestoneId,
                participantUserId: userId
            },
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
        })

        return submissions
    } catch (error) {
        console.error("Error fetching submissions:", error)
        return []
    }
}

/**
 * Get participant timeline (all milestones + submissions)
 */
export async function getWblmParticipantTimeline(
    programId: string,
    participantUserId?: string
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const userId = participantUserId || session.user.id

        // Authorization check
        if (userId !== session.user.id && !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            const isReviewer = await prisma.wblmReviewAssignment.findFirst({
                where: {
                    programId,
                    participantUserId: userId,
                    reviewerUserId: session.user.id
                }
            })

            const isOwner = await prisma.wblmProgram.findFirst({
                where: { id: programId, ownerUserId: session.user.id }
            })

            if (!isReviewer && !isOwner) {
                return null
            }
        }

        // Get program with milestones and submissions
        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            include: {
                Milestones: {
                    orderBy: { orderIndex: "asc" },
                    include: {
                        ParticipantMilestones: {
                            where: { participantId: userId }
                        },
                        Submissions: {
                            where: { participantUserId: userId },
                            include: {
                                Reviews: {
                                    include: {
                                        Reviewer: { select: { name: true, email: true, image: true } }
                                    },
                                    orderBy: { createdAt: "desc" }
                                }
                            },
                            orderBy: { versionNumber: "desc" }
                        }
                    }
                },
                Reflections: {
                    where: { participantUserId: userId }
                },
                EvidencePackages: {
                    where: { participantUserId: userId }
                }
            }
        })

        if (!program) return null

        // Calculate progress
        const totalMilestones = program.Milestones.length
        const completedMilestones = program.Milestones.filter(m =>
            m.ParticipantMilestones.some(pm => pm.status === WblmMilestoneStatus.APPROVED_FINAL)
        ).length

        return {
            program: {
                id: program.id,
                title: program.title,
                status: program.status
            },
            progress: {
                total: totalMilestones,
                completed: completedMilestones,
                percentage: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
            },
            milestones: program.Milestones.map(m => ({
                id: m.id,
                name: m.name,
                description: m.description,
                dueDate: m.dueDate,
                status: m.ParticipantMilestones[0]?.status || WblmMilestoneStatus.NOT_STARTED,
                submissions: m.Submissions,
                requiresReview: m.requiresReview,
                requiresReflection: m.requiresReflection
            })),
            reflection: program.Reflections[0] || null,
            evidence: program.EvidencePackages[0] || null
        }
    } catch (error) {
        console.error("Error fetching participant timeline:", error)
        return null
    }
}

/**
 * Get submission by ID with full details
 */
export async function getWblmSubmissionById(submissionId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: submissionId },
            include: {
                Milestone: {
                    include: {
                        Program: {
                            select: { id: true, title: true, ownerUserId: true, settings: true }
                        }
                    }
                },
                Participant: {
                    select: { id: true, name: true, email: true, image: true }
                },
                Reviews: {
                    include: {
                        Reviewer: {
                            select: { name: true, email: true, image: true }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                }
            }
        })

        if (!submission) return null

        // Check access
        const isParticipant = submission.participantUserId === session.user.id
        const isOwner = submission.Milestone.Program.ownerUserId === session.user.id
        const isAdmin = ["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)

        if (!isParticipant && !isOwner && !isAdmin) {
            // Check if reviewer
            const isReviewer = await prisma.wblmReviewAssignment.findFirst({
                where: {
                    programId: submission.Milestone.Program.id,
                    participantUserId: submission.participantUserId,
                    reviewerUserId: session.user.id
                }
            })
            if (!isReviewer) return null
        }

        return submission
    } catch (error) {
        console.error("Error fetching submission:", error)
        return null
    }
}
