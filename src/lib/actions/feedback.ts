"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// ============================================
// TYPES
// ============================================

export interface FeedbackSurveyInput {
    courseId: string
    sessionId?: string
    title: string
    description?: string
    startsAt?: Date
    endsAt?: Date
}

export interface FeedbackResponseInput {
    surveyId: string
    instructorRating?: number
    materialRating?: number
    facilityRating?: number
    overallRating: number
    strengths?: string
    improvements?: string
    suggestions?: string
    isAnonymous?: boolean
}

export interface FeedbackAnalytics {
    totalResponses: number
    averageOverall: number
    averageInstructor: number
    averageMaterial: number
    averageFacility: number
    ratingDistribution: { rating: number; count: number }[]
    recentFeedback: {
        id: string
        overallRating: number
        strengths: string | null
        improvements: string | null
        suggestions: string | null
        submittedAt: Date
        userName: string | null
        isAnonymous: boolean
    }[]
}

// ============================================
// SURVEY MANAGEMENT
// ============================================

/**
 * Create a new feedback survey for a course
 */
export async function createFeedbackSurvey(input: FeedbackSurveyInput) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        // Verify user is instructor of the course or admin
        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: { instructorId: true }
        })

        if (!course) {
            return { success: false, error: "Course not found" }
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        if (
            course.instructorId !== session.user.id &&
            user?.role !== "SUPER_ADMIN" &&
            user?.role !== "ADMIN_UNIT"
        ) {
            return { success: false, error: "Not authorized to create survey for this course" }
        }

        const survey = await prisma.feedbackSurvey.create({
            data: {
                courseId: input.courseId,
                sessionId: input.sessionId,
                title: input.title,
                description: input.description,
                startsAt: input.startsAt,
                endsAt: input.endsAt,
            }
        })

        revalidatePath(`/dashboard/instructor/${input.courseId}/feedback`)
        return { success: true, survey }
    } catch (error) {
        console.error("Error creating feedback survey:", error)
        return { success: false, error: "Failed to create survey" }
    }
}

/**
 * Get survey for a course (active survey)
 */
export async function getActiveSurvey(courseId: string, sessionId?: string) {
    try {
        const now = new Date()

        const survey = await prisma.feedbackSurvey.findFirst({
            where: {
                courseId,
                sessionId: sessionId || null,
                isActive: true,
                OR: [
                    { startsAt: null, endsAt: null },
                    {
                        startsAt: { lte: now },
                        endsAt: { gte: now }
                    },
                    { startsAt: { lte: now }, endsAt: null },
                    { startsAt: null, endsAt: { gte: now } }
                ]
            },
            orderBy: { createdAt: "desc" }
        })

        return { success: true, survey }
    } catch (error) {
        console.error("Error getting active survey:", error)
        return { success: false, error: "Failed to get survey" }
    }
}

/**
 * Get all surveys for a course
 */
export async function getSurveysByCourse(courseId: string) {
    try {
        const surveys = await prisma.feedbackSurvey.findMany({
            where: { courseId },
            include: {
                _count: { select: { FeedbackResponse: true } },
                CourseSession: { select: { title: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        return { success: true, surveys }
    } catch (error) {
        console.error("Error getting surveys:", error)
        return { success: false, error: "Failed to get surveys" }
    }
}

// ============================================
// FEEDBACK SUBMISSION
// ============================================

/**
 * Submit feedback response
 */
export async function submitFeedbackResponse(input: FeedbackResponseInput) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        // Check if user already submitted
        const existing = await prisma.feedbackResponse.findUnique({
            where: {
                surveyId_userId: {
                    surveyId: input.surveyId,
                    userId: session.user.id
                }
            }
        })

        if (existing) {
            return { success: false, error: "Anda sudah mengisi feedback untuk survey ini" }
        }

        // Verify survey exists and is active
        const survey = await prisma.feedbackSurvey.findUnique({
            where: { id: input.surveyId },
            include: { Course: { select: { id: true } } }
        })

        if (!survey || !survey.isActive) {
            return { success: false, error: "Survey tidak ditemukan atau tidak aktif" }
        }

        // Verify user is enrolled in the course
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: survey.Course.id
                }
            }
        })

        if (!enrollment) {
            return { success: false, error: "Anda tidak terdaftar di kursus ini" }
        }

        const response = await prisma.feedbackResponse.create({
            data: {
                surveyId: input.surveyId,
                userId: session.user.id,
                instructorRating: input.instructorRating,
                materialRating: input.materialRating,
                facilityRating: input.facilityRating,
                overallRating: input.overallRating,
                strengths: input.strengths,
                improvements: input.improvements,
                suggestions: input.suggestions,
                isAnonymous: input.isAnonymous ?? false
            }
        })

        return { success: true, response }
    } catch (error) {
        console.error("Error submitting feedback:", error)
        return { success: false, error: "Gagal mengirim feedback" }
    }
}

/**
 * Check if user has submitted feedback
 */
export async function hasSubmittedFeedback(surveyId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: true, hasSubmitted: false }
        }

        const existing = await prisma.feedbackResponse.findUnique({
            where: {
                surveyId_userId: {
                    surveyId,
                    userId: session.user.id
                }
            }
        })

        return { success: true, hasSubmitted: !!existing }
    } catch (error) {
        console.error("Error checking feedback status:", error)
        return { success: false, hasSubmitted: false }
    }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get feedback analytics for a survey
 */
export async function getFeedbackAnalytics(surveyId: string): Promise<{ success: boolean; analytics?: FeedbackAnalytics; error?: string }> {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        // Get all responses for the survey
        const responses = await prisma.feedbackResponse.findMany({
            where: { surveyId },
            include: {
                User: { select: { name: true } }
            },
            orderBy: { submittedAt: "desc" }
        })

        if (responses.length === 0) {
            return {
                success: true,
                analytics: {
                    totalResponses: 0,
                    averageOverall: 0,
                    averageInstructor: 0,
                    averageMaterial: 0,
                    averageFacility: 0,
                    ratingDistribution: [],
                    recentFeedback: []
                }
            }
        }

        // Calculate averages
        const totalResponses = responses.length
        const averageOverall = responses.reduce((sum, r) => sum + r.overallRating, 0) / totalResponses

        const instructorRatings = responses.filter(r => r.instructorRating !== null)
        const averageInstructor = instructorRatings.length > 0
            ? instructorRatings.reduce((sum, r) => sum + (r.instructorRating || 0), 0) / instructorRatings.length
            : 0

        const materialRatings = responses.filter(r => r.materialRating !== null)
        const averageMaterial = materialRatings.length > 0
            ? materialRatings.reduce((sum, r) => sum + (r.materialRating || 0), 0) / materialRatings.length
            : 0

        const facilityRatings = responses.filter(r => r.facilityRating !== null)
        const averageFacility = facilityRatings.length > 0
            ? facilityRatings.reduce((sum, r) => sum + (r.facilityRating || 0), 0) / facilityRatings.length
            : 0

        // Rating distribution
        const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
            rating,
            count: responses.filter(r => r.overallRating === rating).length
        }))

        // Recent feedback with text
        const recentFeedback = responses
            .filter(r => r.strengths || r.improvements || r.suggestions)
            .slice(0, 10)
            .map(r => ({
                id: r.id,
                overallRating: r.overallRating,
                strengths: r.strengths,
                improvements: r.improvements,
                suggestions: r.suggestions,
                submittedAt: r.submittedAt,
                userName: r.isAnonymous ? null : r.User.name,
                isAnonymous: r.isAnonymous
            }))

        return {
            success: true,
            analytics: {
                totalResponses,
                averageOverall: Math.round(averageOverall * 10) / 10,
                averageInstructor: Math.round(averageInstructor * 10) / 10,
                averageMaterial: Math.round(averageMaterial * 10) / 10,
                averageFacility: Math.round(averageFacility * 10) / 10,
                ratingDistribution,
                recentFeedback
            }
        }
    } catch (error) {
        console.error("Error getting feedback analytics:", error)
        return { success: false, error: "Failed to get analytics" }
    }
}

/**
 * Get all responses for a survey (admin/instructor view)
 */
export async function getSurveyResponses(surveyId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        // Verify access
        const survey = await prisma.feedbackSurvey.findUnique({
            where: { id: surveyId },
            include: { Course: { select: { instructorId: true } } }
        })

        if (!survey) {
            return { success: false, error: "Survey not found" }
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        if (
            survey.Course.instructorId !== session.user.id &&
            user?.role !== "SUPER_ADMIN" &&
            user?.role !== "ADMIN_UNIT"
        ) {
            return { success: false, error: "Not authorized to view responses" }
        }

        const responses = await prisma.feedbackResponse.findMany({
            where: { surveyId },
            include: {
                User: { select: { name: true, email: true, unitKerja: true } }
            },
            orderBy: { submittedAt: "desc" }
        })

        // Mask anonymous responses
        const maskedResponses = responses.map(r => ({
            ...r,
            User: r.isAnonymous ? { name: "Anonim", email: null, unitKerja: null } : r.User
        }))

        return { success: true, responses: maskedResponses }
    } catch (error) {
        console.error("Error getting survey responses:", error)
        return { success: false, error: "Failed to get responses" }
    }
}

/**
 * Toggle survey active status
 */
export async function toggleSurveyStatus(surveyId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const survey = await prisma.feedbackSurvey.findUnique({
            where: { id: surveyId },
            include: { Course: { select: { instructorId: true, id: true } } }
        })

        if (!survey) {
            return { success: false, error: "Survey not found" }
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        if (
            survey.Course.instructorId !== session.user.id &&
            user?.role !== "SUPER_ADMIN" &&
            user?.role !== "ADMIN_UNIT"
        ) {
            return { success: false, error: "Not authorized" }
        }

        const updated = await prisma.feedbackSurvey.update({
            where: { id: surveyId },
            data: { isActive: !survey.isActive }
        })

        revalidatePath(`/dashboard/instructor/${survey.Course.id}/feedback`)
        return { success: true, survey: updated }
    } catch (error) {
        console.error("Error toggling survey status:", error)
        return { success: false, error: "Failed to update survey" }
    }
}
