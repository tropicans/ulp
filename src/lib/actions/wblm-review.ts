"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
    WblmMilestoneStatus,
    WblmReviewDecision
} from "@/generated/prisma"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createReviewSchema = z.object({
    decision: z.nativeEnum(WblmReviewDecision),
    commentsRichtext: z.string().optional(),
    inlineComments: z.any().optional(), // JSON for doc annotations
    score: z.any().optional() // JSON for rubric scores
})

// ============================================
// REVIEW OPERATIONS
// ============================================

/**
 * Get reviewer queue (pending reviews for current user)
 */
export async function getWblmReviewerQueue() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        // Get assigned participants
        const assignments = await prisma.wblmReviewAssignment.findMany({
            where: { reviewerUserId: session.user.id },
            select: {
                programId: true,
                participantUserId: true,
                milestoneId: true
            }
        })

        if (assignments.length === 0) return []

        // Get submissions that need review
        const pendingSubmissions = await prisma.wblmSubmission.findMany({
            where: {
                OR: assignments.map(a => ({
                    programId: a.programId,
                    participantUserId: a.participantUserId,
                    ...(a.milestoneId && { milestoneId: a.milestoneId })
                })),
                status: {
                    in: [WblmMilestoneStatus.SUBMITTED, WblmMilestoneStatus.RESUBMITTED]
                }
            },
            include: {
                Milestone: {
                    include: {
                        Program: {
                            select: { id: true, title: true }
                        }
                    }
                },
                Participant: {
                    select: { id: true, name: true, email: true, image: true }
                },
                Reviews: {
                    where: { reviewerUserId: session.user.id },
                    take: 1
                }
            },
            orderBy: { createdAt: "asc" }
        })

        // Filter out already reviewed (by current user)
        return pendingSubmissions.filter(s => s.Reviews.length === 0)
    } catch (error) {
        console.error("Error fetching reviewer queue:", error)
        return []
    }
}

/**
 * Create a review for a submission
 */
export async function createWblmReview(
    submissionId: string,
    data: z.infer<typeof createReviewSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: submissionId },
            include: {
                Milestone: {
                    include: {
                        Program: { select: { id: true, ownerUserId: true } }
                    }
                }
            }
        })

        if (!submission) {
            return { error: "Submission tidak ditemukan" }
        }

        // Check authorization
        const isAssigned = await prisma.wblmReviewAssignment.findFirst({
            where: {
                programId: submission.Milestone.Program.id,
                participantUserId: submission.participantUserId,
                reviewerUserId: session.user.id
            }
        })

        const isOwner = submission.Milestone.Program.ownerUserId === session.user.id
        const isAdmin = ["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)

        if (!isAssigned && !isOwner && !isAdmin) {
            return { error: "Anda tidak ditugaskan untuk review submission ini" }
        }

        // Check if already reviewed by this reviewer
        const existingReview = await prisma.wblmReview.findFirst({
            where: {
                submissionId,
                reviewerUserId: session.user.id
            }
        })

        if (existingReview) {
            return { error: "Anda sudah memberikan review untuk submission ini" }
        }

        const validatedData = createReviewSchema.parse(data)

        // Determine new status based on decision
        let newStatus: WblmMilestoneStatus
        switch (validatedData.decision) {
            case WblmReviewDecision.ACCEPT:
                newStatus = WblmMilestoneStatus.APPROVED_FINAL
                break
            case WblmReviewDecision.REQUEST_REVISION:
                newStatus = WblmMilestoneStatus.REVISION_REQUESTED
                break
            default:
                newStatus = WblmMilestoneStatus.UNDER_REVIEW
        }

        // Create review and update statuses
        const [review] = await prisma.$transaction([
            prisma.wblmReview.create({
                data: {
                    submissionId,
                    reviewerUserId: session.user.id,
                    decision: validatedData.decision,
                    commentsRichtext: validatedData.commentsRichtext,
                    inlineComments: validatedData.inlineComments,
                    score: validatedData.score
                }
            }),
            prisma.wblmSubmission.update({
                where: { id: submissionId },
                data: { status: newStatus }
            }),
            prisma.wblmParticipantMilestone.update({
                where: {
                    milestoneId_participantId: {
                        milestoneId: submission.milestoneId,
                        participantId: submission.participantUserId
                    }
                },
                data: { status: newStatus }
            })
        ])

        revalidatePath("/dashboard/wblm/reviewer")
        revalidatePath(`/dashboard/wblm/programs/${submission.Milestone.Program.id}`)

        return {
            success: true,
            review,
            message: validatedData.decision === WblmReviewDecision.ACCEPT
                ? "Submission disetujui!"
                : validatedData.decision === WblmReviewDecision.REQUEST_REVISION
                    ? "Revisi diminta"
                    : "Review berhasil disimpan"
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error creating review:", error)
        return { error: "Gagal membuat review" }
    }
}

/**
 * Get reviews for a submission
 */
export async function getWblmReviews(submissionId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        const reviews = await prisma.wblmReview.findMany({
            where: { submissionId },
            include: {
                Reviewer: {
                    select: { id: true, name: true, email: true, image: true }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        return reviews
    } catch (error) {
        console.error("Error fetching reviews:", error)
        return []
    }
}

/**
 * Get review statistics for a program (owner view)
 */
export async function getWblmReviewStats(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const [
            totalSubmissions,
            pendingReviews,
            approvedCount,
            revisionRequestedCount
        ] = await Promise.all([
            prisma.wblmSubmission.count({ where: { programId } }),
            prisma.wblmSubmission.count({
                where: {
                    programId,
                    status: { in: [WblmMilestoneStatus.SUBMITTED, WblmMilestoneStatus.RESUBMITTED] }
                }
            }),
            prisma.wblmSubmission.count({
                where: { programId, status: WblmMilestoneStatus.APPROVED_FINAL }
            }),
            prisma.wblmSubmission.count({
                where: { programId, status: WblmMilestoneStatus.REVISION_REQUESTED }
            })
        ])

        return {
            totalSubmissions,
            pendingReviews,
            approvedCount,
            revisionRequestedCount,
            reviewRate: totalSubmissions > 0
                ? Math.round(((approvedCount + revisionRequestedCount) / totalSubmissions) * 100)
                : 0
        }
    } catch (error) {
        console.error("Error fetching review stats:", error)
        return null
    }
}
