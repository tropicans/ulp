/**
 * Centralized Authorization Policies
 * 
 * All authorization logic should go here instead of inline role checks.
 * This makes authz testable, reusable, and auditable.
 * 
 * Usage:
 * ```ts
 * import { canEditCourse, canSubmitToMilestone } from "@/lib/auth/policies"
 * 
 * const authz = await canEditCourse(session.user.id, courseId)
 * if (!authz.allowed) {
 *   return forbidden(authz.reason)
 * }
 * ```
 */

import { prisma } from "@/lib/db"
import { Role } from "@/generated/prisma"

export interface AuthzResult {
    allowed: boolean
    reason?: string
}

// ===========================================
// HELPERS
// ===========================================

const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN_UNIT"]

function isAdmin(role: Role): boolean {
    return ADMIN_ROLES.includes(role)
}

// ===========================================
// COURSE POLICIES
// ===========================================

/**
 * Check if user can view a course
 * - Anyone can view published courses
 * - Instructor and admins can view unpublished courses
 */
export async function canViewCourse(
    userId: string,
    userRole: Role,
    courseId: string
): Promise<AuthzResult> {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { isPublished: true, instructorId: true }
    })

    if (!course) {
        return { allowed: false, reason: "Kursus tidak ditemukan" }
    }

    // Published courses are viewable by anyone
    if (course.isPublished) {
        return { allowed: true }
    }

    // Unpublished: only instructor or admin
    if (course.instructorId === userId || isAdmin(userRole)) {
        return { allowed: true }
    }

    return { allowed: false, reason: "Kursus belum dipublikasi" }
}

/**
 * Check if user can edit a course
 * - Only instructor (owner) or admins
 */
export async function canEditCourse(
    userId: string,
    userRole: Role,
    courseId: string
): Promise<AuthzResult> {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true }
    })

    if (!course) {
        return { allowed: false, reason: "Kursus tidak ditemukan" }
    }

    if (course.instructorId === userId || isAdmin(userRole)) {
        return { allowed: true }
    }

    return { allowed: false, reason: "Anda tidak memiliki akses untuk mengedit kursus ini" }
}

/**
 * Check if user can delete a course
 * - Only instructor (owner) or SUPER_ADMIN
 */
export async function canDeleteCourse(
    userId: string,
    userRole: Role,
    courseId: string
): Promise<AuthzResult> {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true }
    })

    if (!course) {
        return { allowed: false, reason: "Kursus tidak ditemukan" }
    }

    if (course.instructorId === userId || userRole === "SUPER_ADMIN") {
        return { allowed: true }
    }

    return { allowed: false, reason: "Anda tidak memiliki akses untuk menghapus kursus ini" }
}

// ===========================================
// PBGM POLICIES (Project-Based Growth Module)
// Uses Wblm* tables as underlying data model
// ===========================================

/**
 * Check if user can submit to a milestone
 * - Must be enrolled in the program with ENROLLED or ACTIVE status
 */
export async function canSubmitToMilestone(
    userId: string,
    milestoneId: string
): Promise<AuthzResult> {
    const milestone = await prisma.wblmMilestone.findUnique({
        where: { id: milestoneId },
        include: {
            Program: {
                include: {
                    Enrollments: {
                        where: { participantUserId: userId }
                    }
                }
            }
        }
    })

    if (!milestone) {
        return { allowed: false, reason: "Milestone tidak ditemukan" }
    }

    if (milestone.Program.Enrollments.length === 0) {
        return { allowed: false, reason: "Anda tidak terdaftar pada program ini" }
    }

    const enrollment = milestone.Program.Enrollments[0]
    if (!["ENROLLED", "ACTIVE"].includes(enrollment.status)) {
        return { allowed: false, reason: "Status enrollment Anda tidak aktif" }
    }

    return { allowed: true }
}

/**
 * Check if user can review a submission
 * - Must be assigned as reviewer for the participant
 * - Or be SUPER_ADMIN/ADMIN_UNIT
 * - Or be program owner
 */
export async function canReviewSubmission(
    userId: string,
    userRole: Role,
    submissionId: string
): Promise<AuthzResult> {
    const submission = await prisma.wblmSubmission.findUnique({
        where: { id: submissionId },
        include: {
            Milestone: {
                include: {
                    Program: {
                        select: { id: true, ownerUserId: true }
                    }
                }
            }
        }
    })

    if (!submission) {
        return { allowed: false, reason: "Submission tidak ditemukan" }
    }

    // Admin can review anything
    if (isAdmin(userRole)) {
        return { allowed: true }
    }

    // Program owner can review
    if (submission.Milestone.Program.ownerUserId === userId) {
        return { allowed: true }
    }

    // Check reviewer assignment
    const assignment = await prisma.wblmReviewAssignment.findFirst({
        where: {
            programId: submission.Milestone.Program.id,
            participantUserId: submission.participantUserId,
            reviewerUserId: userId
        }
    })

    if (assignment) {
        return { allowed: true }
    }

    return { allowed: false, reason: "Anda tidak ditugaskan sebagai reviewer" }
}

/**
 * Check if user can view submissions of another participant
 * - Own submissions: always allowed
 * - Assigned reviewer, program owner, or admin
 */
export async function canViewParticipantSubmissions(
    userId: string,
    userRole: Role,
    programId: string,
    targetParticipantId: string
): Promise<AuthzResult> {
    // Viewing own submissions
    if (userId === targetParticipantId) {
        return { allowed: true }
    }

    // Admin can view all
    if (isAdmin(userRole)) {
        return { allowed: true }
    }

    // Check if program owner
    const program = await prisma.wblmProgram.findUnique({
        where: { id: programId },
        select: { ownerUserId: true }
    })

    if (program?.ownerUserId === userId) {
        return { allowed: true }
    }

    // Check reviewer assignment
    const assignment = await prisma.wblmReviewAssignment.findFirst({
        where: {
            programId,
            participantUserId: targetParticipantId,
            reviewerUserId: userId
        }
    })

    if (assignment) {
        return { allowed: true }
    }

    return { allowed: false, reason: "Anda tidak memiliki akses ke submission ini" }
}

// ===========================================
// QUIZ POLICIES
// ===========================================

/**
 * Check if user can take a quiz
 * - Must be enrolled in the course that owns the quiz
 */
export async function canTakeQuiz(
    userId: string,
    quizId: string
): Promise<AuthzResult> {
    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
            Module: {
                include: {
                    Course: {
                        include: {
                            Enrollment: {
                                where: { userId }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!quiz) {
        return { allowed: false, reason: "Quiz tidak ditemukan" }
    }

    if (quiz.Module.Course.Enrollment.length === 0) {
        return { allowed: false, reason: "Anda belum terdaftar di kursus ini" }
    }

    return { allowed: true }
}

/**
 * Check if user can edit a quiz
 * - Course instructor or admin
 */
export async function canEditQuiz(
    userId: string,
    userRole: Role,
    quizId: string
): Promise<AuthzResult> {
    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
            Module: {
                include: {
                    Course: {
                        select: { instructorId: true }
                    }
                }
            }
        }
    })

    if (!quiz) {
        return { allowed: false, reason: "Quiz tidak ditemukan" }
    }

    if (quiz.Module.Course.instructorId === userId || isAdmin(userRole)) {
        return { allowed: true }
    }

    return { allowed: false, reason: "Anda tidak memiliki akses untuk mengedit quiz ini" }
}

// ===========================================
// ADMIN POLICIES
// ===========================================

/**
 * Check if user is admin (SUPER_ADMIN or ADMIN_UNIT)
 */
export function requireAdmin(userRole: Role): AuthzResult {
    if (isAdmin(userRole)) {
        return { allowed: true }
    }
    return { allowed: false, reason: "Akses khusus admin" }
}

/**
 * Check if user is SUPER_ADMIN only
 */
export function requireSuperAdmin(userRole: Role): AuthzResult {
    if (userRole === "SUPER_ADMIN") {
        return { allowed: true }
    }
    return { allowed: false, reason: "Akses khusus Super Admin" }
}
