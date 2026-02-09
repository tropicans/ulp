// PBGM Mapper Functions - Pure utility functions for converting between WBLM and PBGM types

import {
    WblmProgram,
    WblmMilestone,
    WblmSubmission,
    WblmReview,
    WblmReflection,
    WblmEvidencePackage,
    WblmProgramStatus,
    WblmMilestoneStatus,
    WblmReviewDecision,
    WblmLearningLink,
    User
} from "@/generated/prisma"

import {
    ProjectChallenge,
    ProjectStatus,
    OptionalStep,
    ProjectArtifact,
    SubmissionStatus,
    ArtifactFile,
    ExpertFeedback,
    FeedbackDecision,
    ProjectReflection,
    LearningLink,
    ProjectPortfolio,
    PbgmRole,
    ProjectAccessResult,
    ROLE_PERMISSIONS
} from "./types"

// ============================================
// STATUS MAPPERS
// ============================================

/**
 * Map WblmProgramStatus to PBGM ProjectStatus
 */
export function mapProgramStatusToProjectStatus(status: WblmProgramStatus): ProjectStatus {
    const mapping: Record<WblmProgramStatus, ProjectStatus> = {
        [WblmProgramStatus.DRAFT]: "DRAFT",
        [WblmProgramStatus.PUBLISHED]: "ACTIVE",   // PUBLISHED maps to ACTIVE in PBGM
        [WblmProgramStatus.RUNNING]: "ACTIVE",     // RUNNING also maps to ACTIVE
        [WblmProgramStatus.CLOSED]: "FINAL",       // CLOSED maps to FINAL
        [WblmProgramStatus.ARCHIVED]: "ARCHIVED"
    }
    return mapping[status] || "DRAFT"
}

/**
 * Map PBGM ProjectStatus to WblmProgramStatus for storage
 */
export function mapProjectStatusToProgramStatus(status: ProjectStatus): WblmProgramStatus {
    const mapping: Record<ProjectStatus, WblmProgramStatus> = {
        "DRAFT": WblmProgramStatus.DRAFT,
        "ACTIVE": WblmProgramStatus.RUNNING,
        "UNDER_REVIEW": WblmProgramStatus.RUNNING,    // Store as RUNNING with settings flag
        "REVISION": WblmProgramStatus.RUNNING,        // Store as RUNNING with settings flag
        "FINAL": WblmProgramStatus.CLOSED,
        "ARCHIVED": WblmProgramStatus.ARCHIVED
    }
    return mapping[status] || WblmProgramStatus.DRAFT
}

/**
 * Map WblmMilestoneStatus to PBGM SubmissionStatus
 */
export function mapMilestoneStatusToSubmissionStatus(status: WblmMilestoneStatus): SubmissionStatus {
    const mapping: Record<WblmMilestoneStatus, SubmissionStatus> = {
        [WblmMilestoneStatus.NOT_STARTED]: "SUBMITTED",
        [WblmMilestoneStatus.IN_PROGRESS]: "SUBMITTED",
        [WblmMilestoneStatus.SUBMITTED]: "SUBMITTED",
        [WblmMilestoneStatus.RESUBMITTED]: "SUBMITTED",
        [WblmMilestoneStatus.UNDER_REVIEW]: "UNDER_REVIEW",
        [WblmMilestoneStatus.REVISION_REQUESTED]: "REVISION_REQUESTED",
        [WblmMilestoneStatus.APPROVED_FINAL]: "ACCEPTED",
        [WblmMilestoneStatus.LOCKED]: "ACCEPTED"
    }
    return mapping[status] || "SUBMITTED"
}

/**
 * Map PBGM SubmissionStatus to WblmMilestoneStatus for storage
 */
export function mapSubmissionStatusToMilestoneStatus(status: SubmissionStatus): WblmMilestoneStatus {
    const mapping: Record<SubmissionStatus, WblmMilestoneStatus> = {
        "SUBMITTED": WblmMilestoneStatus.SUBMITTED,
        "UNDER_REVIEW": WblmMilestoneStatus.UNDER_REVIEW,
        "REVISION_REQUESTED": WblmMilestoneStatus.REVISION_REQUESTED,
        "ACCEPTED": WblmMilestoneStatus.APPROVED_FINAL
    }
    return mapping[status] || WblmMilestoneStatus.SUBMITTED
}

/**
 * Map WblmReviewDecision to PBGM FeedbackDecision
 */
export function mapReviewDecisionToFeedbackDecision(decision: WblmReviewDecision): FeedbackDecision {
    const mapping: Record<WblmReviewDecision, FeedbackDecision> = {
        [WblmReviewDecision.ACCEPT]: "ACCEPT",
        [WblmReviewDecision.REQUEST_REVISION]: "REQUEST_REVISION",
        [WblmReviewDecision.COMMENT_ONLY]: "COMMENT",
        [WblmReviewDecision.ESCALATE]: "COMMENT"  // Escalate treated as comment in PBGM
    }
    return mapping[decision] || "COMMENT"
}

/**
 * Map PBGM FeedbackDecision to WblmReviewDecision for storage
 */
export function mapFeedbackDecisionToReviewDecision(decision: FeedbackDecision): WblmReviewDecision {
    const mapping: Record<FeedbackDecision, WblmReviewDecision> = {
        "COMMENT": WblmReviewDecision.COMMENT_ONLY,
        "REQUEST_REVISION": WblmReviewDecision.REQUEST_REVISION,
        "ACCEPT": WblmReviewDecision.ACCEPT
    }
    return mapping[decision] || WblmReviewDecision.COMMENT_ONLY
}

// ============================================
// ENTITY MAPPERS
// ============================================

type WblmProgramWithRelations = WblmProgram & {
    Owner?: User | null
    Milestones?: WblmMilestone[]
    _count?: {
        Milestones?: number
        Enrollments?: number
    }
}

/**
 * Map WblmProgram to ProjectChallenge
 */
export function toProjectChallenge(program: WblmProgramWithRelations): ProjectChallenge {
    const settings = program.settings as Record<string, any> || {}

    // Determine actual project status from settings if available
    const pbgmStatus = settings.pbgmStatus as ProjectStatus | undefined
    const status = pbgmStatus || mapProgramStatusToProjectStatus(program.status)

    return {
        id: program.id,
        title: program.title,
        purpose: settings.purpose || program.description,
        context: settings.context || null,
        safeToLearnNote: settings.safeToLearnStatement || settings.safeToLearnNote || null,
        expectedOutputs: settings.expectedOutputs || null,
        status,
        creatorId: program.ownerUserId,
        creatorName: program.Owner?.name || null,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
        _count: {
            steps: program._count?.Milestones || program.Milestones?.length || 0
        }
    }
}

/**
 * Map WblmMilestone to OptionalStep
 */
export function toOptionalStep(milestone: WblmMilestone): OptionalStep {
    return {
        id: milestone.id,
        projectId: milestone.programId,
        name: milestone.name,
        description: milestone.description,
        orderIndex: milestone.orderIndex,
        dueDate: milestone.dueDate
    }
}

type WblmSubmissionWithRelations = WblmSubmission & {
    Reviews?: (WblmReview & { Reviewer?: User | null })[]
    Participant?: User | null
}

/**
 * Map WblmSubmission to ProjectArtifact
 */
export function toProjectArtifact(submission: WblmSubmissionWithRelations): ProjectArtifact {
    const files = (submission.files as any[] || []).map((f: any) => ({
        id: f.id || f.storageUrl,
        storageUrl: f.storageUrl,
        filename: f.filename,
        mimeType: f.mime || f.mimeType,
        size: f.size,
        checksum: f.checksum
    })) as ArtifactFile[]

    return {
        id: submission.id,
        projectId: submission.programId,
        stepId: submission.milestoneId,
        title: submission.title,
        notes: submission.notes,
        files,
        versionNumber: submission.versionNumber,
        status: mapMilestoneStatusToSubmissionStatus(submission.status),
        createdAt: submission.createdAt
    }
}

type WblmReviewWithRelations = WblmReview & {
    Reviewer?: User | null
}

/**
 * Map WblmReview to ExpertFeedback
 */
export function toExpertFeedback(review: WblmReviewWithRelations): ExpertFeedback {
    return {
        id: review.id,
        artifactId: review.submissionId,
        expertId: review.reviewerUserId,
        expertName: review.Reviewer?.name || null,
        decision: mapReviewDecisionToFeedbackDecision(review.decision),
        comment: review.commentsRichtext,
        createdAt: review.createdAt
    }
}

/**
 * Map WblmReflection to ProjectReflection
 */
export function toProjectReflection(reflection: WblmReflection): ProjectReflection {
    const answers = reflection.answers as Record<string, any> || {}

    return {
        id: reflection.id,
        projectId: reflection.programId,
        assumptions: answers.initialAssumptions || answers.assumptions || null,
        keyFeedback: answers.keyFeedback || null,
        whatChanged: answers.whatChanged || null,
        whatLearned: answers.whatWouldDoDifferently || answers.whatLearned || null,
        submittedAt: reflection.submittedAt,
        isComplete: reflection.status === "SUBMITTED" || reflection.status === "LOCKED"
    }
}

/**
 * Map WblmLearningLink to LearningLink
 */
export function toLearningLink(link: WblmLearningLink): LearningLink {
    return {
        id: link.id,
        projectId: link.programId,
        type: link.type as LearningLink["type"],
        resourceId: link.resourceId,
        title: link.title,
        url: link.url,
        notes: link.notes
    }
}

type WblmEvidencePackageWithRelations = WblmEvidencePackage & {
    Program?: WblmProgramWithRelations | null
    Participant?: User | null
}

/**
 * Map WblmEvidencePackage to ProjectPortfolio
 */
export function toProjectPortfolio(
    evidence: WblmEvidencePackageWithRelations,
    artifacts: ProjectArtifact[],
    feedbackTrail: ExpertFeedback[],
    reflection: ProjectReflection
): ProjectPortfolio {
    const statusMap: Record<string, ProjectPortfolio["status"]> = {
        "NOT_READY": "NOT_READY",
        "READY": "READY",
        "PUBLISHED": "PUBLISHED",
        "EXPORTED": "EXPORTED"
    }

    return {
        id: evidence.id,
        projectId: evidence.programId,
        creatorId: evidence.participantUserId,
        creatorName: evidence.Participant?.name || null,
        finalArtifacts: artifacts,
        feedbackTrail,
        reflection,
        status: statusMap[evidence.status] || "NOT_READY",
        publishedAt: evidence.publishedAt,
        exportedAt: evidence.exportedAt,
        exportFileRef: evidence.exportFileRef
    }
}

// ============================================
// ACCESS CONTROL HELPERS
// ============================================

/**
 * Determine user's role in a project
 */
export function determineProjectRole(
    userId: string,
    project: ProjectChallenge,
    reviewerIds: string[] = [],
    assessorIds: string[] = [],
    supervisorIds: string[] = []
): PbgmRole | null {
    if (project.creatorId === userId) {
        return "CREATOR"
    }
    if (reviewerIds.includes(userId)) {
        return "EXPERT"
    }
    if (assessorIds.includes(userId)) {
        return "ASSESSOR"
    }
    if (supervisorIds.includes(userId)) {
        return "SUPERVISOR"
    }
    return null
}

/**
 * Check project access for a user
 */
export function checkProjectAccess(
    userId: string,
    project: ProjectChallenge,
    reviewerIds: string[] = [],
    assessorIds: string[] = [],
    supervisorIds: string[] = []
): ProjectAccessResult {
    const role = determineProjectRole(userId, project, reviewerIds, assessorIds, supervisorIds)

    if (!role) {
        return {
            hasAccess: false,
            role: null,
            permissions: []
        }
    }

    return {
        hasAccess: true,
        role,
        permissions: ROLE_PERMISSIONS[role]
    }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
    accessResult: ProjectAccessResult,
    permission: (typeof ROLE_PERMISSIONS)[PbgmRole][number]
): boolean {
    return accessResult.permissions.includes(permission)
}
