"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { WblmMilestoneStatus } from "@/generated/prisma"
import {
    ProjectArtifact,
    UploadArtifactInput,
    ArtifactFile
} from "@/lib/pbgm/types"
import {
    toProjectArtifact,
    mapSubmissionStatusToMilestoneStatus,
    checkProjectAccess,
    toProjectChallenge
} from "@/lib/pbgm/mapper"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const fileRefSchema = z.object({
    id: z.string(),
    storageUrl: z.string().url(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number().positive(),
    checksum: z.string().optional()
})

const uploadArtifactSchema = z.object({
    stepId: z.string().nullable().optional(),
    title: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    files: z.array(fileRefSchema).min(1, "Minimal satu file diperlukan")
})

// ============================================
// ARTIFACT OPERATIONS
// ============================================

/**
 * Upload a new artifact (or new version)
 */
export async function uploadArtifact(projectId: string, data: UploadArtifactInput) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validation = uploadArtifactSchema.safeParse(data)
    if (!validation.success) {
        return { error: validation.error.issues[0]?.message || "Data tidak valid" }
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

        if (program.ownerUserId !== session.user.id) {
            return { error: "Hanya pemilik project yang dapat upload artifact" }
        }

        const settings = program.settings as Record<string, any> || {}
        const pbgmStatus = settings.pbgmStatus

        // Can only upload in DRAFT, ACTIVE, or REVISION status
        if (!["DRAFT", "ACTIVE", "REVISION"].includes(pbgmStatus)) {
            return { error: "Tidak dapat upload artifact pada status project saat ini" }
        }

        // Determine milestone ID (use stepId or find/create default)
        let milestoneId = validation.data.stepId

        if (!milestoneId) {
            // Find or create default milestone for PBGM projects
            let defaultMilestone = await prisma.wblmMilestone.findFirst({
                where: {
                    programId: projectId,
                    name: "Default Artifacts"
                }
            })

            if (!defaultMilestone) {
                defaultMilestone = await prisma.wblmMilestone.create({
                    data: {
                        programId: projectId,
                        name: "Default Artifacts",
                        description: "Default container for project artifacts",
                        orderIndex: 0,
                        requiresReview: true,
                        requiresReflection: false,
                        requiredArtifactTypes: []
                    }
                })
            }

            milestoneId = defaultMilestone.id
        }

        // Get current version number for this user's submissions
        const latestSubmission = await prisma.wblmSubmission.findFirst({
            where: {
                programId: projectId,
                milestoneId,
                participantUserId: session.user.id
            },
            orderBy: { versionNumber: "desc" }
        })

        const nextVersion = (latestSubmission?.versionNumber || 0) + 1

        // Create submission
        const submission = await prisma.wblmSubmission.create({
            data: {
                programId: projectId,
                milestoneId,
                participantUserId: session.user.id,
                versionNumber: nextVersion,
                title: validation.data.title || `Artifact v${nextVersion}`,
                notes: validation.data.notes,
                files: validation.data.files.map(f => ({
                    id: f.id,
                    storageUrl: f.storageUrl,
                    filename: f.filename,
                    mime: f.mimeType,
                    size: f.size,
                    checksum: f.checksum
                })),
                status: WblmMilestoneStatus.SUBMITTED
            },
            include: {
                Reviews: {
                    include: { Reviewer: true }
                }
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        return { success: true, artifact: toProjectArtifact(submission) }
    } catch (error) {
        console.error("Error uploading artifact:", error)
        return { error: "Gagal upload artifact" }
    }
}

/**
 * Get all artifacts for a project
 */
export async function getArtifacts(projectId: string): Promise<ProjectArtifact[] | { error: string }> {
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

        const submissions = await prisma.wblmSubmission.findMany({
            where: { programId: projectId },
            include: {
                Reviews: {
                    include: { Reviewer: true },
                    orderBy: { createdAt: "desc" }
                }
            },
            orderBy: [
                { milestoneId: "asc" },
                { versionNumber: "desc" }
            ]
        })

        return submissions.map(toProjectArtifact)
    } catch (error) {
        console.error("Error fetching artifacts:", error)
        return { error: "Gagal mengambil data artifact" }
    }
}

/**
 * Get a specific artifact by ID
 */
export async function getArtifactById(artifactId: string): Promise<ProjectArtifact | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: artifactId },
            include: {
                Reviews: {
                    include: { Reviewer: true },
                    orderBy: { createdAt: "desc" }
                }
            }
        })

        if (!submission) {
            return { error: "Artifact tidak ditemukan" }
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
            return { error: "Tidak memiliki akses ke artifact ini" }
        }

        return toProjectArtifact(submission)
    } catch (error) {
        console.error("Error fetching artifact:", error)
        return { error: "Gagal mengambil data artifact" }
    }
}

/**
 * Get artifact version history
 */
export async function getArtifactVersions(
    projectId: string,
    stepId?: string | null
): Promise<ProjectArtifact[] | { error: string }> {
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

        const where: any = {
            programId: projectId,
            participantUserId: program.ownerUserId
        }

        if (stepId) {
            where.milestoneId = stepId
        }

        const submissions = await prisma.wblmSubmission.findMany({
            where,
            include: {
                Reviews: {
                    include: { Reviewer: true },
                    orderBy: { createdAt: "desc" }
                }
            },
            orderBy: { versionNumber: "desc" }
        })

        return submissions.map(toProjectArtifact)
    } catch (error) {
        console.error("Error fetching artifact versions:", error)
        return { error: "Gagal mengambil versi artifact" }
    }
}

/**
 * Delete an artifact (only latest version, only by creator)
 */
export async function deleteArtifact(artifactId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: artifactId }
        })

        if (!submission) {
            return { error: "Artifact tidak ditemukan" }
        }

        if (submission.participantUserId !== session.user.id) {
            return { error: "Hanya pemilik yang dapat menghapus artifact" }
        }

        // Check if this is the latest version
        const latestSubmission = await prisma.wblmSubmission.findFirst({
            where: {
                programId: submission.programId,
                milestoneId: submission.milestoneId,
                participantUserId: session.user.id
            },
            orderBy: { versionNumber: "desc" }
        })

        if (latestSubmission?.id !== artifactId) {
            return { error: "Hanya versi terbaru yang dapat dihapus" }
        }

        // Check if it has been reviewed
        const reviewCount = await prisma.wblmReview.count({
            where: { submissionId: artifactId }
        })

        if (reviewCount > 0) {
            return { error: "Artifact yang sudah direview tidak dapat dihapus" }
        }

        await prisma.wblmSubmission.delete({
            where: { id: artifactId }
        })

        revalidatePath(`/dashboard/pbgm/projects/${submission.programId}`)
        return { success: true }
    } catch (error) {
        console.error("Error deleting artifact:", error)
        return { error: "Gagal menghapus artifact" }
    }
}
