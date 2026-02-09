"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { WblmReviewDecision, WblmMilestoneStatus } from "@/generated/prisma"
import {
    ExpertFeedback,
    AddFeedbackInput,
    FeedbackDecision
} from "@/lib/pbgm/types"
import {
    toExpertFeedback,
    toProjectChallenge,
    mapFeedbackDecisionToReviewDecision,
    checkProjectAccess
} from "@/lib/pbgm/mapper"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const addFeedbackSchema = z.object({
    decision: z.enum(["COMMENT", "REQUEST_REVISION", "ACCEPT"]),
    comment: z.string().max(5000).optional()
})

// ============================================
// FEEDBACK OPERATIONS
// ============================================

/**
 * Add expert feedback to an artifact/submission
 */
export async function addFeedback(submissionId: string, data: AddFeedbackInput) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validation = addFeedbackSchema.safeParse(data)
    if (!validation.success) {
        return { error: validation.error.issues[0]?.message || "Data tidak valid" }
    }

    try {
        // Get submission and project
        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: submissionId },
            include: {
                Milestone: {
                    include: {
                        Program: {
                            include: { Owner: true }
                        }
                    }
                }
            }
        })

        if (!submission) {
            return { error: "Submission tidak ditemukan" }
        }

        const program = submission.Milestone?.Program
        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        // Check if user is an expert for this project
        const reviewerIds = program.reviewerPoolIds || []
        if (!reviewerIds.includes(session.user.id)) {
            return { error: "Hanya expert yang dapat memberikan feedback" }
        }

        // Check project is in UNDER_REVIEW status
        const settings = program.settings as Record<string, any> || {}
        if (settings.pbgmStatus !== "UNDER_REVIEW") {
            return { error: "Feedback hanya dapat diberikan pada project yang sedang dalam review" }
        }

        // Create review
        const review = await prisma.wblmReview.create({
            data: {
                submissionId,
                reviewerUserId: session.user.id,
                decision: mapFeedbackDecisionToReviewDecision(validation.data.decision as FeedbackDecision),
                commentsRichtext: validation.data.comment || null
            },
            include: {
                Reviewer: true
            }
        })

        // Update submission status based on decision
        let newStatus = submission.status
        if (validation.data.decision === "ACCEPT") {
            newStatus = WblmMilestoneStatus.APPROVED_FINAL
        } else if (validation.data.decision === "REQUEST_REVISION") {
            newStatus = WblmMilestoneStatus.REVISION_REQUESTED
        } else {
            newStatus = WblmMilestoneStatus.UNDER_REVIEW
        }

        await prisma.wblmSubmission.update({
            where: { id: submissionId },
            data: { status: newStatus }
        })

        // If revision requested, update project status
        if (validation.data.decision === "REQUEST_REVISION") {
            await prisma.wblmProgram.update({
                where: { id: program.id },
                data: {
                    settings: {
                        ...settings,
                        pbgmStatus: "REVISION"
                    }
                }
            })
        }

        revalidatePath(`/dashboard/pbgm/projects/${program.id}`)
        return { success: true, feedback: toExpertFeedback(review) }
    } catch (error) {
        console.error("Error adding feedback:", error)
        return { error: "Gagal menambahkan feedback" }
    }
}

/**
 * Add expert feedback at the project level (for PBGM)
 * This creates a pseudo-submission if none exists, allowing feedback without artifacts
 */
export async function addProjectFeedback(projectId: string, data: AddFeedbackInput) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validation = addFeedbackSchema.safeParse(data)
    if (!validation.success) {
        return { error: validation.error.issues[0]?.message || "Data tidak valid" }
    }

    try {
        // Get project
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId },
            include: { Owner: true }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        // Check if user is an expert for this project
        const reviewerIds = program.reviewerPoolIds || []
        if (!reviewerIds.includes(session.user.id)) {
            return { error: "Hanya expert yang dapat memberikan feedback" }
        }

        const settings = program.settings as Record<string, any> || {}

        // Find or create a default milestone for project-level feedback
        let milestone = await prisma.wblmMilestone.findFirst({
            where: { programId: projectId }
        })

        if (!milestone) {
            milestone = await prisma.wblmMilestone.create({
                data: {
                    programId: projectId,
                    name: "Project Review",
                    orderIndex: 0,
                    requiresReview: true
                }
            })
        }

        // Find or create a default submission for project-level feedback
        let submission = await prisma.wblmSubmission.findFirst({
            where: {
                programId: projectId,
                milestoneId: milestone.id
            }
        })

        if (!submission) {
            submission = await prisma.wblmSubmission.create({
                data: {
                    programId: projectId,
                    milestoneId: milestone.id,
                    participantUserId: program.ownerUserId,
                    status: "SUBMITTED",
                    notes: "Project review submission"
                }
            })
        }

        // Create review
        const review = await prisma.wblmReview.create({
            data: {
                submissionId: submission.id,
                reviewerUserId: session.user.id,
                decision: mapFeedbackDecisionToReviewDecision(validation.data.decision as FeedbackDecision),
                commentsRichtext: validation.data.comment || null
            },
            include: {
                Reviewer: true
            }
        })

        // Update project status based on decision
        if (validation.data.decision === "REQUEST_REVISION") {
            await prisma.wblmProgram.update({
                where: { id: projectId },
                data: {
                    settings: {
                        ...settings,
                        pbgmStatus: "REVISION"
                    }
                }
            })
        } else if (validation.data.decision === "ACCEPT") {
            // Optionally mark as ready for finalization
            await prisma.wblmProgram.update({
                where: { id: projectId },
                data: {
                    settings: {
                        ...settings,
                        expertApproved: true
                    }
                }
            })
        }

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        return { success: true, feedback: toExpertFeedback(review) }
    } catch (error) {
        console.error("Error adding project feedback:", error)
        return { error: "Gagal menambahkan feedback" }
    }
}

/**
 * Get feedback trail for a project
 */
export async function getFeedbackTrail(projectId: string): Promise<ExpertFeedback[] | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Check project access
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId },
            include: { Owner: true }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        const settings = program.settings as Record<string, any> || {}
        const project = toProjectChallenge(program)
        const access = checkProjectAccess(
            session.user.id,
            project,
            program.reviewerPoolIds || [],
            settings.assessorIds || [],
            settings.supervisorIds || []
        )

        if (!access.hasAccess) {
            return { error: "Tidak memiliki akses ke project ini" }
        }

        // Get all reviews for submissions in this project
        const submissions = await prisma.wblmSubmission.findMany({
            where: { programId: projectId },
            select: { id: true }
        })

        const submissionIds = submissions.map(s => s.id)

        const reviews = await prisma.wblmReview.findMany({
            where: {
                submissionId: { in: submissionIds }
            },
            include: {
                Reviewer: true
            },
            orderBy: { createdAt: "desc" }
        })

        return reviews.map(toExpertFeedback)
    } catch (error) {
        console.error("Error fetching feedback trail:", error)
        return { error: "Gagal mengambil data feedback" }
    }
}

/**
 * Get feedback for a specific submission
 */
export async function getSubmissionFeedback(submissionId: string): Promise<ExpertFeedback[] | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: submissionId }
        })

        if (!submission) {
            return { error: "Submission tidak ditemukan" }
        }

        // Check project access
        const program = await prisma.wblmProgram.findUnique({
            where: { id: submission.programId },
            include: { Owner: true }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        const settings = program.settings as Record<string, any> || {}
        const project = toProjectChallenge(program)
        const access = checkProjectAccess(
            session.user.id,
            project,
            program.reviewerPoolIds || [],
            settings.assessorIds || [],
            settings.supervisorIds || []
        )

        if (!access.hasAccess) {
            return { error: "Tidak memiliki akses" }
        }

        const reviews = await prisma.wblmReview.findMany({
            where: { submissionId },
            include: {
                Reviewer: true
            },
            orderBy: { createdAt: "desc" }
        })

        return reviews.map(toExpertFeedback)
    } catch (error) {
        console.error("Error fetching submission feedback:", error)
        return { error: "Gagal mengambil data feedback" }
    }
}
