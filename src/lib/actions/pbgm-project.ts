"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { WblmProgramStatus, WblmMilestoneStatus } from "@/generated/prisma"
import {
    ProjectChallenge,
    ProjectStatus,
    CreateProjectInput,
    UpdateProjectInput,
    ProjectAccessResult,
    PbgmRole,
    ROLE_PERMISSIONS
} from "@/lib/pbgm/types"
import {
    toProjectChallenge,
    mapProjectStatusToProgramStatus,
    checkProjectAccess,
    determineProjectRole
} from "@/lib/pbgm/mapper"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createProjectSchema = z.object({
    title: z.string().min(1, "Judul wajib diisi").max(200),
    purpose: z.string().max(2000).optional(),
    context: z.string().max(2000).optional(),
    safeToLearnNote: z.string().max(1000).optional(),
    expectedOutputs: z.string().max(2000).optional()
})

const updateProjectSchema = createProjectSchema.partial()

// ============================================
// PROJECT CRUD OPERATIONS
// ============================================

/**
 * Create a new PBGM Project Challenge
 * User is automatically the creator (no enrollment required)
 */
export async function createProject(data: CreateProjectInput) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validation = createProjectSchema.safeParse(data)
    if (!validation.success) {
        return { error: validation.error.issues[0]?.message || "Data tidak valid" }
    }

    try {
        const program = await prisma.wblmProgram.create({
            data: {
                title: validation.data.title,
                description: validation.data.purpose || null,
                ownerUserId: session.user.id,
                status: WblmProgramStatus.DRAFT,
                durationWeeks: 0,  // PBGM doesn't use duration
                targetRoles: [],
                reviewerPoolIds: [],
                settings: {
                    isPbgmProject: true,
                    pbgmStatus: "DRAFT" as ProjectStatus,
                    purpose: validation.data.purpose || null,
                    context: validation.data.context || null,
                    safeToLearnNote: validation.data.safeToLearnNote || null,
                    expectedOutputs: validation.data.expectedOutputs || null
                }
            },
            include: {
                Owner: true
            }
        })

        revalidatePath("/dashboard/pbgm")
        return { success: true, project: toProjectChallenge(program) }
    } catch (error) {
        console.error("Error creating project:", error)
        return { error: "Gagal membuat project" }
    }
}

/**
 * Get all PBGM projects for the current user
 */
export async function getProjects(filters?: {
    status?: ProjectStatus
    limit?: number
    offset?: number
}) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const where: any = {
            ownerUserId: session.user.id,
            settings: {
                path: ["isPbgmProject"],
                equals: true
            }
        }

        // Filter by PBGM status if provided
        if (filters?.status) {
            where.settings = {
                ...where.settings,
                path: ["pbgmStatus"],
                equals: filters.status
            }
        }

        const programs = await prisma.wblmProgram.findMany({
            where,
            include: {
                Owner: true,
                _count: {
                    select: {
                        Milestones: true,
                        Enrollments: true
                    }
                }
            },
            orderBy: { updatedAt: "desc" },
            take: filters?.limit || 50,
            skip: filters?.offset || 0
        })

        const projects = programs.map(toProjectChallenge)
        return { success: true, projects }
    } catch (error) {
        console.error("Error fetching projects:", error)
        return { error: "Gagal mengambil data project" }
    }
}

/**
 * Get all PBGM projects where the current user is an Expert (reviewer)
 */
export async function getExpertProjects(filters?: {
    limit?: number
    offset?: number
}) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Find all projects where the user is in reviewerPoolIds
        const programs = await prisma.wblmProgram.findMany({
            where: {
                reviewerPoolIds: {
                    has: session.user.id
                }
            },
            include: {
                Owner: true,
                _count: {
                    select: {
                        Milestones: true,
                        Enrollments: true
                    }
                }
            },
            orderBy: { updatedAt: "desc" },
            take: filters?.limit || 50,
            skip: filters?.offset || 0
        })

        // Filter client-side for PBGM projects if settings has isPbgmProject
        const pbgmPrograms = programs.filter(p => {
            const settings = p.settings as any
            return settings?.isPbgmProject === true
        })

        const projects = pbgmPrograms.map(toProjectChallenge)
        return { success: true, projects }
    } catch (error) {
        console.error("Error fetching expert projects:", error)
        return { error: "Gagal mengambil data project" }
    }
}

/**
 * Check if the current user is an Expert for a specific project
 */
export async function checkExpertRole(projectId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId },
            select: { reviewerPoolIds: true }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        const isExpert = program.reviewerPoolIds.includes(session.user.id)
        return { isExpert }
    } catch (error) {
        console.error("Error checking expert role:", error)
        return { error: "Gagal memeriksa role" }
    }
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: string): Promise<ProjectChallenge | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: projectId },
            include: {
                Owner: true,
                Milestones: {
                    orderBy: { orderIndex: "asc" }
                },
                _count: {
                    select: {
                        Milestones: true,
                        Enrollments: true
                    }
                }
            }
        })

        if (!program) {
            return { error: "Project tidak ditemukan" }
        }

        // Check access
        const settings = program.settings as Record<string, any> || {}
        const reviewerIds = program.reviewerPoolIds || []
        const assessorIds = settings.assessorIds || []
        const supervisorIds = settings.supervisorIds || []

        const project = toProjectChallenge(program)
        const access = checkProjectAccess(
            session.user.id,
            project,
            reviewerIds,
            assessorIds,
            supervisorIds
        )

        if (!access.hasAccess) {
            return { error: "Tidak memiliki akses ke project ini" }
        }

        return project
    } catch (error) {
        console.error("Error fetching project:", error)
        return { error: "Gagal mengambil data project" }
    }
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, data: UpdateProjectInput) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validation = updateProjectSchema.safeParse(data)
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
            return { error: "Tidak memiliki akses untuk mengedit project ini" }
        }

        const currentSettings = program.settings as Record<string, any> || {}
        const updatedSettings = {
            ...currentSettings,
            purpose: validation.data.purpose ?? currentSettings.purpose,
            context: validation.data.context ?? currentSettings.context,
            safeToLearnNote: validation.data.safeToLearnNote ?? currentSettings.safeToLearnNote,
            expectedOutputs: validation.data.expectedOutputs ?? currentSettings.expectedOutputs
        }

        const updated = await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                title: validation.data.title,
                description: validation.data.purpose,
                settings: updatedSettings
            },
            include: {
                Owner: true
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        revalidatePath("/dashboard/pbgm")
        return { success: true, project: toProjectChallenge(updated) }
    } catch (error) {
        console.error("Error updating project:", error)
        return { error: "Gagal mengupdate project" }
    }
}

/**
 * Activate a project (DRAFT → ACTIVE)
 * User-controlled, no admin approval needed
 */
export async function activateProject(projectId: string) {
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
            return { error: "Tidak memiliki akses untuk mengaktifkan project ini" }
        }

        const settings = program.settings as Record<string, any> || {}
        if (settings.pbgmStatus !== "DRAFT") {
            return { error: "Project harus dalam status DRAFT untuk diaktifkan" }
        }

        const updated = await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                status: WblmProgramStatus.RUNNING,
                settings: {
                    ...settings,
                    pbgmStatus: "ACTIVE" as ProjectStatus
                }
            },
            include: {
                Owner: true
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        revalidatePath("/dashboard/pbgm")
        return { success: true, project: toProjectChallenge(updated) }
    } catch (error) {
        console.error("Error activating project:", error)
        return { error: "Gagal mengaktifkan project" }
    }
}

/**
 * Submit project for review (ACTIVE → UNDER_REVIEW)
 */
export async function submitForReview(projectId: string) {
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
            return { error: "Tidak memiliki akses" }
        }

        const settings = program.settings as Record<string, any> || {}
        if (settings.pbgmStatus !== "ACTIVE") {
            return { error: "Project harus dalam status ACTIVE untuk di-submit" }
        }

        // Check if there are any artifacts
        const artifactCount = await prisma.wblmSubmission.count({
            where: { programId: projectId }
        })

        if (artifactCount === 0) {
            return { error: "Upload minimal satu artifact sebelum submit untuk review" }
        }

        const updated = await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                settings: {
                    ...settings,
                    pbgmStatus: "UNDER_REVIEW" as ProjectStatus
                }
            },
            include: {
                Owner: true
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        revalidatePath("/dashboard/pbgm")
        return { success: true, project: toProjectChallenge(updated) }
    } catch (error) {
        console.error("Error submitting for review:", error)
        return { error: "Gagal submit untuk review" }
    }
}

/**
 * Request revision (UNDER_REVIEW → REVISION) - Expert action
 */
export async function requestRevision(projectId: string) {
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

        const settings = program.settings as Record<string, any> || {}
        const reviewerIds = program.reviewerPoolIds || []

        if (!reviewerIds.includes(session.user.id)) {
            return { error: "Hanya expert yang dapat meminta revisi" }
        }

        if (settings.pbgmStatus !== "UNDER_REVIEW") {
            return { error: "Project harus dalam status UNDER_REVIEW" }
        }

        const updated = await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                settings: {
                    ...settings,
                    pbgmStatus: "REVISION" as ProjectStatus
                }
            },
            include: {
                Owner: true
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        return { success: true, project: toProjectChallenge(updated) }
    } catch (error) {
        console.error("Error requesting revision:", error)
        return { error: "Gagal meminta revisi" }
    }
}

/**
 * Resubmit after revision (REVISION → UNDER_REVIEW)
 */
export async function resubmitProject(projectId: string) {
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
            return { error: "Tidak memiliki akses" }
        }

        const settings = program.settings as Record<string, any> || {}
        if (settings.pbgmStatus !== "REVISION") {
            return { error: "Project harus dalam status REVISION untuk di-submit ulang" }
        }

        const updated = await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                settings: {
                    ...settings,
                    pbgmStatus: "UNDER_REVIEW" as ProjectStatus
                }
            },
            include: {
                Owner: true
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        revalidatePath("/dashboard/pbgm")
        return { success: true, project: toProjectChallenge(updated) }
    } catch (error) {
        console.error("Error resubmitting project:", error)
        return { error: "Gagal submit ulang project" }
    }
}

/**
 * Archive a project (any status → ARCHIVED) - Admin action
 */
export async function archiveProject(projectId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    // Only admin can archive
    if (!["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        return { error: "Hanya admin yang dapat mengarsipkan project" }
    }

    try {
        const updated = await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                status: WblmProgramStatus.ARCHIVED,
                settings: {
                    pbgmStatus: "ARCHIVED" as ProjectStatus
                }
            },
            include: {
                Owner: true
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        revalidatePath("/dashboard/pbgm")
        revalidatePath("/dashboard/admin/pbgm")
        return { success: true, project: toProjectChallenge(updated) }
    } catch (error) {
        console.error("Error archiving project:", error)
        return { error: "Gagal mengarsipkan project" }
    }
}

/**
 * Delete a project (only DRAFT)
 */
export async function deleteProject(projectId: string) {
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
            return { error: "Tidak memiliki akses untuk menghapus project ini" }
        }

        const settings = program.settings as Record<string, any> || {}
        if (settings.pbgmStatus !== "DRAFT") {
            return { error: "Hanya project DRAFT yang dapat dihapus" }
        }

        await prisma.wblmProgram.delete({
            where: { id: projectId }
        })

        revalidatePath("/dashboard/pbgm")
        return { success: true }
    } catch (error) {
        console.error("Error deleting project:", error)
        return { error: "Gagal menghapus project" }
    }
}

/**
 * Invite expert to project
 */
export async function inviteExpert(projectId: string, expertUserId: string) {
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
            return { error: "Hanya pemilik project yang dapat mengundang expert" }
        }

        // Add to reviewer pool
        const currentReviewers = program.reviewerPoolIds || []
        if (currentReviewers.includes(expertUserId)) {
            return { error: "Expert sudah diundang ke project ini" }
        }

        await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                reviewerPoolIds: [...currentReviewers, expertUserId]
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("Error inviting expert:", error)
        return { error: "Gagal mengundang expert" }
    }
}

/**
 * Remove expert from project
 */
export async function removeExpert(projectId: string, expertUserId: string) {
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
            return { error: "Hanya pemilik project yang dapat menghapus expert" }
        }

        const currentReviewers = program.reviewerPoolIds || []
        const updatedReviewers = currentReviewers.filter(id => id !== expertUserId)

        await prisma.wblmProgram.update({
            where: { id: projectId },
            data: {
                reviewerPoolIds: updatedReviewers
            }
        })

        revalidatePath(`/dashboard/pbgm/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("Error removing expert:", error)
        return { error: "Gagal menghapus expert" }
    }
}

/**
 * Get project access info for current user
 */
export async function getProjectAccess(projectId: string): Promise<ProjectAccessResult | { error: string }> {
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
        const project = toProjectChallenge(program)

        return checkProjectAccess(
            session.user.id,
            project,
            program.reviewerPoolIds || [],
            settings.assessorIds || [],
            settings.supervisorIds || []
        )
    } catch (error) {
        console.error("Error getting project access:", error)
        return { error: "Gagal mengambil info akses" }
    }
}
