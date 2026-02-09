"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { WblmProgramStatus, WblmReflectionStatus, WblmEvidenceStatus, WblmMilestoneStatus } from "@/generated/prisma"
import {
    ProjectReflection,
    ProjectPortfolio,
    SubmitReflectionInput,
    ProjectStatus
} from "@/lib/pbgm/types"
import {
    toProjectChallenge,
    toProjectReflection,
    toProjectArtifact,
    toExpertFeedback,
    toProjectPortfolio
} from "@/lib/pbgm/mapper"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const submitReflectionSchema = z.object({
    assumptions: z.string().min(10, "Refleksi asumsi awal minimal 10 karakter").max(2000),
    keyFeedback: z.string().min(10, "Refleksi feedback utama minimal 10 karakter").max(2000),
    whatChanged: z.string().min(10, "Refleksi perubahan minimal 10 karakter").max(2000),
    whatLearned: z.string().min(10, "Refleksi pembelajaran minimal 10 karakter").max(2000)
})

// ============================================
// REFLECTION OPERATIONS
// ============================================

/**
 * Submit or update reflection
 */
export async function submitReflection(projectId: string, data: SubmitReflectionInput) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validation = submitReflectionSchema.safeParse(data)
    if (!validation.success) {
        return { error: validation.error.issues[0]?.message || "Data tidak valid" }
    }

    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id) {
            return { error: "Hanya pemilik project yang dapat mengisi refleksi" }
        }

        // Upsert reflection
        const reflection = await prisma.wblmReflection.upsert({
            where: {
                programId_participantUserId_milestoneId: {
                    programId: projectId,
                    participantUserId: session.user.id,
                    milestoneId: ""  // Top-level reflection (no specific milestone)
                }
            },
            create: {
                programId: projectId,
                participantUserId: session.user.id,
                milestoneId: null,
                answers: {
                    initialAssumptions: validation.data.assumptions,
                    keyFeedback: validation.data.keyFeedback,
                    whatChanged: validation.data.whatChanged,
                    whatWouldDoDifferently: validation.data.whatLearned
                },
                status: WblmReflectionStatus.SUBMITTED,
                submittedAt: new Date()
            },
            update: {
                answers: {
                    initialAssumptions: validation.data.assumptions,
                    keyFeedback: validation.data.keyFeedback,
                    whatChanged: validation.data.whatChanged,
                    whatWouldDoDifferently: validation.data.whatLearned
                },
                status: WblmReflectionStatus.SUBMITTED,
                submittedAt: new Date()
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        return { success: true, reflection: toProjectReflection(reflection) }
    } catch (error) {
        console.error("Error submitting reflection:", error)
        return { error: "Gagal menyimpan refleksi" }
    }
}

/**
 * Get reflection for a project
 */
export async function getReflection(projectId: string): Promise<ProjectReflection | null | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId },
            include: { Owner: true }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        // Check access - only creator can see their own reflection before finalization
        const settings = program.settings as Record<string, any> || {}
        const isCreator = program.ownerUserId === session.user.id
        const isExpert = (program.reviewerPoolIds || []).includes(session.user.id)
        const isFinalized = settings.pbgmStatus === "FINAL"

        if (!isCreator && !isExpert && !isFinalized) {
            return { error: "Tidak memiliki akses ke refleksi project ini" }
        }

        const reflection = await prisma.wblmReflection.findFirst({
            where: {
                programId: projectId,
                participantUserId: program.ownerUserId,
                milestoneId: null
            }
        })

        if (!reflection) {
            return null
        }

        return toProjectReflection(reflection)
    } catch (error) {
        console.error("Error fetching reflection:", error)
        return { error: "Gagal mengambil data refleksi" }
    }
}

// ============================================
// FINALIZATION OPERATIONS
// ============================================

/**
 * Finalize project (creates evidence portfolio)
 * Requires: all artifacts accepted + reflection submitted
 */
export async function finalizeProject(projectId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id) {
            return { error: "Hanya pemilik project yang dapat finalisasi" }
        }

        const settings = program.settings as Record<string, any> || {}

        // Check status - must be UNDER_REVIEW or all artifacts accepted
        if (!["UNDER_REVIEW", "ACTIVE"].includes(settings.pbgmStatus)) {
            return { error: "Project tidak dalam status yang dapat difinalisasi" }
        }

        // Check if reflection exists and is complete
        const reflection = await prisma.wblmReflection.findFirst({
            where: {
                programId: projectId,
                participantUserId: session.user.id,
                milestoneId: null,
                status: { in: [WblmReflectionStatus.SUBMITTED, WblmReflectionStatus.LOCKED] }
            }
        })

        if (!reflection) {
            return { error: "Refleksi harus diisi sebelum finalisasi" }
        }

        // Check if there are artifacts
        const artifacts = await prisma.wblmSubmission.findMany({
            where: { programId: projectId }
        })

        if (artifacts.length === 0) {
            return { error: "Minimal satu artifact diperlukan sebelum finalisasi" }
        }

        // Get final (accepted) submissions - or latest versions
        const finalSubmissionIds = artifacts
            .filter(a => a.status === WblmMilestoneStatus.APPROVED_FINAL)
            .map(a => a.id)

        // If no approved, use all latest versions
        const submissionIds = finalSubmissionIds.length > 0
            ? finalSubmissionIds
            : artifacts.map(a => a.id)

        // Get all reviews
        const reviews = await prisma.wblmReview.findMany({
            where: {
                submissionId: { in: artifacts.map(a => a.id) }
            }
        })
        const reviewTrailIds = reviews.map(r => r.id)

        // Create or update evidence package
        const evidence = await prisma.wblmEvidencePackage.upsert({
            where: {
                programId_participantUserId: {
                    programId: projectId,
                    participantUserId: session.user.id
                }
            },
            create: {
                programId: projectId,
                participantUserId: session.user.id,
                finalSubmissionIds: submissionIds,
                reviewTrailIds,
                reflectionId: reflection.id,
                status: WblmEvidenceStatus.READY,
                publishedAt: new Date()
            },
            update: {
                finalSubmissionIds: submissionIds,
                reviewTrailIds,
                reflectionId: reflection.id,
                status: WblmEvidenceStatus.READY,
                publishedAt: new Date()
            }
        })

        // Lock reflection
        await prisma.wblmReflection.update({
            where: { id: reflection.id },
            data: {
                status: WblmReflectionStatus.LOCKED,
                lockedAt: new Date()
            }
        })

        // Update project status to FINAL
        await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                status: WblmProgramStatus.CLOSED,
                settings: {
                    ...settings,
                    pbgmStatus: "FINAL" as ProjectStatus,
                    finalizedAt: new Date().toISOString()
                }
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        revalidatePath("/dashboard/pbgm")
        return { success: true, evidenceId: evidence.id }
    } catch (error) {
        console.error("Error finalizing project:", error)
        return { error: "Gagal finalisasi project" }
    }
}

/**
 * Get project portfolio (for assessors and finalized projects)
 */
export async function getProjectPortfolio(projectId: string): Promise<ProjectPortfolio | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId },
            include: { Owner: true }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        const settings = program.settings as Record<string, any> || {}

        // Portfolio only accessible if project is finalized
        if (settings.pbgmStatus !== "FINAL") {
            // Allow creator to see draft portfolio
            if (program.ownerUserId !== session.user.id) {
                return { error: "Portfolio hanya tersedia setelah project difinalisasi" }
            }
        }

        // Check access
        const project = toProjectChallenge(program)
        const isCreator = program.ownerUserId === session.user.id
        const isExpert = (program.reviewerPoolIds || []).includes(session.user.id)
        const isAssessor = (settings.assessorIds || []).includes(session.user.id)
        const isSupervisor = (settings.supervisorIds || []).includes(session.user.id)

        if (!isCreator && !isExpert && !isAssessor && !isSupervisor) {
            return { error: "Tidak memiliki akses ke portfolio ini" }
        }

        // Get evidence package
        const evidence = await prisma.wblmEvidencePackage.findUnique({
            where: {
                programId_participantUserId: {
                    programId: projectId,
                    participantUserId: program.ownerUserId
                }
            },
            include: {
                Participant: true
            }
        })

        if (!evidence) {
            return { error: "Portfolio belum tersedia" }
        }

        // Get final artifacts
        const submissions = await prisma.wblmSubmission.findMany({
            where: {
                id: { in: evidence.finalSubmissionIds }
            },
            include: {
                Reviews: {
                    include: { Reviewer: true }
                }
            }
        })

        // Get reviews
        const reviews = await prisma.wblmReview.findMany({
            where: {
                id: { in: evidence.reviewTrailIds }
            },
            include: {
                Reviewer: true
            },
            orderBy: { createdAt: "asc" }
        })

        // Get reflection
        const reflection = await prisma.wblmReflection.findFirst({
            where: {
                programId: projectId,
                participantUserId: program.ownerUserId,
                milestoneId: null
            }
        })

        if (!reflection) {
            return { error: "Refleksi tidak ditemukan" }
        }

        return toProjectPortfolio(
            evidence,
            submissions.map(toProjectArtifact),
            reviews.map(toExpertFeedback),
            toProjectReflection(reflection)
        )
    } catch (error) {
        console.error("Error fetching portfolio:", error)
        return { error: "Gagal mengambil portfolio" }
    }
}

/**
 * Check if project can be finalized
 */
export async function canFinalizeProject(projectId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        if (program.ownerUserId !== session.user.id) {
            return { canFinalize: false, reasons: ["Bukan pemilik project"] }
        }

        const settings = program.settings as Record<string, any> || {}
        const reasons: string[] = []

        // Check status
        if (!["UNDER_REVIEW", "ACTIVE"].includes(settings.pbgmStatus)) {
            reasons.push("Project tidak dalam status yang dapat difinalisasi")
        }

        // Check reflection
        const reflection = await prisma.wblmReflection.findFirst({
            where: {
                programId: projectId,
                participantUserId: session.user.id,
                milestoneId: null,
                status: { in: [WblmReflectionStatus.SUBMITTED, WblmReflectionStatus.LOCKED] }
            }
        })

        if (!reflection) {
            reasons.push("Refleksi belum diisi")
        }

        // Check artifacts
        const artifactCount = await prisma.wblmSubmission.count({
            where: { programId: projectId }
        })

        if (artifactCount === 0) {
            reasons.push("Minimal satu artifact diperlukan")
        }

        return {
            canFinalize: reasons.length === 0,
            reasons
        }
    } catch (error) {
        console.error("Error checking finalization:", error)
        return { error: "Gagal mengecek status finalisasi" }
    }
}
