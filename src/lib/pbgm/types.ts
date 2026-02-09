// PBGM Type Definitions - Core types for Project-Based Growth Model

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
    WblmReflectionStatus,
    WblmEvidenceStatus,
    WblmLearningLinkType
} from "@/generated/prisma"

// ============================================
// PBGM STATUS TYPES
// ============================================

/**
 * PBGM Project Status (maps from WblmProgramStatus)
 * User-controlled lifecycle: DRAFT → ACTIVE → UNDER_REVIEW → REVISION → FINAL → ARCHIVED
 */
export type ProjectStatus =
    | "DRAFT"           // Initial state, editable
    | "ACTIVE"          // User activated, work in progress
    | "UNDER_REVIEW"    // Submitted for expert review
    | "REVISION"        // Revision requested by expert
    | "FINAL"           // Finalized with reflection
    | "ARCHIVED"        // Admin archived

/**
 * PBGM Submission Status (maps from WblmMilestoneStatus)
 */
export type SubmissionStatus =
    | "SUBMITTED"           // Artifact submitted
    | "UNDER_REVIEW"        // Being reviewed by expert
    | "REVISION_REQUESTED"  // Expert requested changes
    | "ACCEPTED"            // Expert accepted

/**
 * PBGM Feedback Decision
 */
export type FeedbackDecision =
    | "COMMENT"             // Just a comment, no action required
    | "REQUEST_REVISION"    // Request changes
    | "ACCEPT"              // Accept the submission

/**
 * PBGM User Role in a project
 */
export type PbgmRole =
    | "CREATOR"     // Full owner access
    | "EXPERT"      // Can provide feedback
    | "ASSESSOR"    // Read-only portfolio view
    | "SUPERVISOR"  // Read-only project view

// ============================================
// PBGM ENTITY TYPES
// ============================================

/**
 * ProjectChallenge - The main PBGM entity (maps from WblmProgram)
 */
export interface ProjectChallenge {
    id: string
    title: string
    purpose: string | null
    context: string | null
    safeToLearnNote: string | null
    expectedOutputs: string | null
    status: ProjectStatus
    creatorId: string
    creatorName: string | null
    createdAt: Date
    updatedAt: Date
    // Optional relationships
    steps?: OptionalStep[]
    artifacts?: ProjectArtifact[]
    feedbackTrail?: ExpertFeedback[]
    reflection?: ProjectReflection | null
    learningLinks?: LearningLink[]
    // Counts for list views
    _count?: {
        artifacts?: number
        feedbackItems?: number
        steps?: number
    }
}

/**
 * OptionalStep - Optional checkpoint (maps from WblmMilestone)
 * Default 0..n steps, not required
 */
export interface OptionalStep {
    id: string
    projectId: string
    name: string
    description: string | null
    orderIndex: number
    dueDate: Date | null
    // Steps are purely organizational, no required artifacts
}

/**
 * ProjectArtifact - Versioned artifact upload (maps from WblmSubmission)
 */
export interface ProjectArtifact {
    id: string
    projectId: string
    stepId: string | null  // Optional step association
    title: string | null
    notes: string | null
    files: ArtifactFile[]
    versionNumber: number
    status: SubmissionStatus
    createdAt: Date
    // Version history
    previousVersions?: ProjectArtifact[]
}

/**
 * File within an artifact
 */
export interface ArtifactFile {
    id: string
    storageUrl: string
    filename: string
    mimeType: string
    size: number
    checksum?: string
}

/**
 * ExpertFeedback - Feedback on an artifact (maps from WblmReview)
 */
export interface ExpertFeedback {
    id: string
    artifactId: string
    expertId: string
    expertName: string | null
    decision: FeedbackDecision
    comment: string | null
    createdAt: Date
}

/**
 * ProjectReflection - Required for finalization (maps from WblmReflection)
 */
export interface ProjectReflection {
    id: string
    projectId: string
    assumptions: string | null      // Initial assumptions
    keyFeedback: string | null      // Key feedback received
    whatChanged: string | null      // What changed in approach
    whatLearned: string | null      // What was learned
    submittedAt: Date | null
    isComplete: boolean
}

/**
 * LearningLink - Optional attached resources (maps from WblmLearningLink)
 */
export interface LearningLink {
    id: string
    projectId: string
    type: "ASYNC" | "SYNC" | "WEBINAR" | "CLASSROOM" | "HYBRID"
    resourceId: string
    title: string
    url: string | null
    notes: string | null
}

/**
 * ProjectPortfolio - Final evidence bundle (maps from WblmEvidencePackage)
 */
export interface ProjectPortfolio {
    id: string
    projectId: string
    creatorId: string
    creatorName: string | null
    // Final accepted artifacts
    finalArtifacts: ProjectArtifact[]
    // Complete feedback trail
    feedbackTrail: ExpertFeedback[]
    // Required reflection
    reflection: ProjectReflection
    // Status
    status: "NOT_READY" | "READY" | "PUBLISHED" | "EXPORTED"
    publishedAt: Date | null
    exportedAt: Date | null
    exportFileRef: string | null
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
    title: string
    purpose?: string
    context?: string
    safeToLearnNote?: string
    expectedOutputs?: string
}

/**
 * Input for updating a project
 */
export interface UpdateProjectInput {
    title?: string
    purpose?: string
    context?: string
    safeToLearnNote?: string
    expectedOutputs?: string
}

/**
 * Input for uploading an artifact
 */
export interface UploadArtifactInput {
    stepId?: string | null
    title?: string
    notes?: string
    files: ArtifactFile[]
}

/**
 * Input for providing feedback
 */
export interface AddFeedbackInput {
    decision: FeedbackDecision
    comment?: string
}

/**
 * Input for submitting reflection
 */
export interface SubmitReflectionInput {
    assumptions: string
    keyFeedback: string
    whatChanged: string
    whatLearned: string
}

// ============================================
// ACCESS CONTROL
// ============================================

/**
 * Project access check result
 */
export interface ProjectAccessResult {
    hasAccess: boolean
    role: PbgmRole | null
    permissions: ProjectPermission[]
}

/**
 * Available permissions
 */
export type ProjectPermission =
    | "READ"                // View project
    | "EDIT"                // Edit project details
    | "UPLOAD_ARTIFACT"     // Upload artifacts
    | "ADD_FEEDBACK"        // Add expert feedback
    | "SUBMIT_REFLECTION"   // Submit reflection
    | "FINALIZE"            // Finalize project
    | "ARCHIVE"             // Archive project
    | "MANAGE_EXPERTS"      // Invite/remove experts
    | "VIEW_PORTFOLIO"      // View final portfolio

/**
 * Permission matrix by role
 */
export const ROLE_PERMISSIONS: Record<PbgmRole, ProjectPermission[]> = {
    CREATOR: [
        "READ", "EDIT", "UPLOAD_ARTIFACT", "SUBMIT_REFLECTION",
        "FINALIZE", "MANAGE_EXPERTS", "VIEW_PORTFOLIO"
    ],
    EXPERT: ["READ", "ADD_FEEDBACK", "VIEW_PORTFOLIO"],
    ASSESSOR: ["READ", "VIEW_PORTFOLIO"],
    SUPERVISOR: ["READ"]
}
