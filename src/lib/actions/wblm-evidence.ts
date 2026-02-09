"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@/generated/prisma"
import {
    WblmEvidenceStatus,
    WblmMilestoneStatus,
    WblmReflectionStatus,
    WblmEnrollmentStatus
} from "@/generated/prisma"

// ============================================
// EVIDENCE PACKAGE OPERATIONS
// ============================================

/**
 * Publish evidence package for a participant
 */
export async function publishWblmEvidence(
    programId: string,
    participantUserId: string
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            select: { ownerUserId: true, settings: true }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        // Check if all milestones are approved
        const milestones = await prisma.wblmMilestone.findMany({
            where: { programId },
            include: {
                ParticipantMilestones: {
                    where: { participantId: participantUserId }
                }
            }
        })

        const allApproved = milestones.every(m =>
            m.ParticipantMilestones.some(pm => pm.status === WblmMilestoneStatus.APPROVED_FINAL)
        )

        if (!allApproved) {
            return { error: "Tidak semua milestone disetujui. Evidence tidak dapat dipublish." }
        }

        // Check final reflection
        const finalReflection = await prisma.wblmReflection.findFirst({
            where: {
                programId,
                participantUserId,
                milestoneId: null
            }
        })

        if (!finalReflection || finalReflection.status !== WblmReflectionStatus.SUBMITTED) {
            return { error: "Refleksi akhir belum disubmit" }
        }

        // Get all final submissions
        const submissions = await prisma.wblmSubmission.findMany({
            where: {
                programId,
                participantUserId,
                status: WblmMilestoneStatus.APPROVED_FINAL
            },
            select: { id: true }
        })

        // Get all reviews
        const reviews = await prisma.wblmReview.findMany({
            where: {
                Submission: {
                    programId,
                    participantUserId
                }
            },
            select: { id: true }
        })

        // Calculate final score (average of all rubric scores)
        const reviewsWithScores = await prisma.wblmReview.findMany({
            where: {
                Submission: {
                    programId,
                    participantUserId
                },
                score: {
                    not: Prisma.JsonNull
                }
            },
            select: { score: true }
        })

        let finalScore: Prisma.InputJsonValue | undefined = undefined
        if (reviewsWithScores.length > 0) {
            // Aggregate scores - simplified version
            finalScore = {
                reviewCount: reviewsWithScores.length,
                scores: reviewsWithScores.map(r => r.score)
            } as Prisma.InputJsonValue
        }

        // Create or update evidence package
        const evidence = await prisma.wblmEvidencePackage.upsert({
            where: {
                programId_participantUserId: {
                    programId,
                    participantUserId
                }
            },
            create: {
                programId,
                participantUserId,
                finalSubmissionIds: submissions.map(s => s.id),
                reviewTrailIds: reviews.map(r => r.id),
                reflectionId: finalReflection.id,
                finalScore,
                status: WblmEvidenceStatus.PUBLISHED,
                publishedAt: new Date()
            },
            update: {
                finalSubmissionIds: submissions.map(s => s.id),
                reviewTrailIds: reviews.map(r => r.id),
                reflectionId: finalReflection.id,
                finalScore,
                status: WblmEvidenceStatus.PUBLISHED,
                publishedAt: new Date()
            }
        })

        // Update enrollment status to COMPLETED
        await prisma.wblmEnrollment.updateMany({
            where: {
                programId,
                participantUserId
            },
            data: {
                status: WblmEnrollmentStatus.COMPLETED,
                completedAt: new Date()
            }
        })

        // Lock reflections
        await prisma.wblmReflection.updateMany({
            where: {
                programId,
                participantUserId
            },
            data: {
                status: WblmReflectionStatus.LOCKED,
                lockedAt: new Date()
            }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`)
        revalidatePath(`/dashboard/wblm/programs/${programId}/evidence`)

        return { success: true, evidence, message: "Evidence package berhasil dipublish!" }
    } catch (error) {
        console.error("Error publishing evidence:", error)
        return { error: "Gagal mempublish evidence package" }
    }
}

/**
 * Get evidence package for a participant
 */
export async function getWblmEvidencePackage(
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
            const program = await prisma.wblmProgram.findUnique({
                where: { id: programId },
                select: { ownerUserId: true, settings: true }
            })

            // Check visibility settings
            const settings = program?.settings as Record<string, unknown> | null
            const visibility = settings?.evidenceVisibility || "participant_only"

            if (visibility === "participant_only" && program?.ownerUserId !== session.user.id) {
                return null
            }
        }

        const evidence = await prisma.wblmEvidencePackage.findUnique({
            where: {
                programId_participantUserId: {
                    programId,
                    participantUserId: userId
                }
            },
            include: {
                Program: {
                    select: { id: true, title: true }
                },
                Participant: {
                    select: { id: true, name: true, email: true, image: true, unitKerja: true, jabatan: true }
                }
            }
        })

        if (!evidence) return null

        // Fetch related data
        const [submissions, reviews, reflection] = await Promise.all([
            prisma.wblmSubmission.findMany({
                where: { id: { in: evidence.finalSubmissionIds } },
                include: {
                    Milestone: { select: { id: true, name: true } }
                }
            }),
            prisma.wblmReview.findMany({
                where: { id: { in: evidence.reviewTrailIds } },
                include: {
                    Reviewer: { select: { name: true } }
                }
            }),
            evidence.reflectionId
                ? prisma.wblmReflection.findUnique({ where: { id: evidence.reflectionId } })
                : null
        ])

        return {
            ...evidence,
            submissions,
            reviews,
            reflection
        }
    } catch (error) {
        console.error("Error fetching evidence package:", error)
        return null
    }
}

/**
 * Export evidence packages (bulk) - returns data for export
 */
export async function exportWblmEvidence(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            select: { ownerUserId: true, title: true }
        })

        if (!program) {
            return { error: "Program tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        const packages = await prisma.wblmEvidencePackage.findMany({
            where: {
                programId,
                status: WblmEvidenceStatus.PUBLISHED
            },
            include: {
                Participant: {
                    select: { id: true, name: true, email: true, unitKerja: true, jabatan: true }
                }
            }
        })

        // Mark as exported
        await prisma.wblmEvidencePackage.updateMany({
            where: {
                programId,
                status: WblmEvidenceStatus.PUBLISHED
            },
            data: {
                status: WblmEvidenceStatus.EXPORTED,
                exportedAt: new Date()
            }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`)

        return {
            success: true,
            programTitle: program.title,
            exportedCount: packages.length,
            packages: packages.map(p => ({
                participantId: p.Participant.id,
                participantName: p.Participant.name,
                participantEmail: p.Participant.email,
                unitKerja: p.Participant.unitKerja,
                jabatan: p.Participant.jabatan,
                finalScore: p.finalScore,
                publishedAt: p.publishedAt,
                exportedAt: new Date()
            }))
        }
    } catch (error) {
        console.error("Error exporting evidence:", error)
        return { error: "Gagal mengekspor evidence" }
    }
}

/**
 * Get evidence status summary for a program
 */
export async function getWblmEvidenceSummary(programId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const [
            totalEnrollments,
            readyCount,
            publishedCount,
            exportedCount
        ] = await Promise.all([
            prisma.wblmEnrollment.count({
                where: {
                    programId,
                    status: { in: [WblmEnrollmentStatus.ACTIVE, WblmEnrollmentStatus.COMPLETED] }
                }
            }),
            prisma.wblmEvidencePackage.count({
                where: { programId, status: WblmEvidenceStatus.READY }
            }),
            prisma.wblmEvidencePackage.count({
                where: { programId, status: WblmEvidenceStatus.PUBLISHED }
            }),
            prisma.wblmEvidencePackage.count({
                where: { programId, status: WblmEvidenceStatus.EXPORTED }
            })
        ])

        return {
            totalEnrollments,
            readyCount,
            publishedCount,
            exportedCount,
            notReadyCount: totalEnrollments - readyCount - publishedCount - exportedCount
        }
    } catch (error) {
        console.error("Error fetching evidence summary:", error)
        return null
    }
}
