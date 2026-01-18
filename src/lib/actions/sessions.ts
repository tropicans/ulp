"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { generateToken } from "@/lib/utils/qr-tokens"

// Validation schema
const createSessionSchema = z.object({
    courseId: z.string(),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    type: z.enum(["CLASSROOM", "HYBRID", "LIVE_ONLINE", "SELF_PACED"]),
    startTime: z.string().or(z.date()),
    endTime: z.string().or(z.date()),
    location: z.string().optional(),
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    geoRadius: z.number().optional(),
    zoomMeetingId: z.string().optional(),
    zoomJoinUrl: z.string().optional(),
    zoomPassword: z.string().optional(),
    maxParticipants: z.number().optional(),
})

/**
 * Create a new course session
 */
export async function createSession(data: z.infer<typeof createSessionSchema>) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        const validated = createSessionSchema.parse(data)

        // Check if user is instructor of this course
        const course = await prisma.course.findUnique({
            where: { id: validated.courseId },
        })

        if (!course) {
            return { error: "Course not found" }
        }

        if (
            course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Not authorized to create sessions for this course" }
        }

        // Create session
        const newSession = await prisma.courseSession.create({
            data: {
                id: crypto.randomUUID(),
                courseId: validated.courseId,
                title: validated.title,
                description: validated.description,
                type: validated.type,
                startTime: new Date(validated.startTime),
                endTime: new Date(validated.endTime),
                location: validated.location,
                address: validated.address,
                latitude: validated.latitude,
                longitude: validated.longitude,
                geoRadius: validated.geoRadius,
                zoomMeetingId: validated.zoomMeetingId,
                zoomJoinUrl: validated.zoomJoinUrl,
                zoomPassword: validated.zoomPassword,
                maxParticipants: validated.maxParticipants,
                updatedAt: new Date(),
            },
        })

        revalidatePath(`/dashboard/courses/${validated.courseId}`)
        return { success: true, session: newSession }
    } catch (error) {
        console.error("Error creating session:", error)
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        return { error: "Failed to create session" }
    }
}

/**
 * Get all sessions for a course
 */
export async function getSessionsByCourse(courseId: string) {
    try {
        const sessions = await prisma.courseSession.findMany({
            where: { courseId },
            include: {
                _count: {
                    select: { Attendance: true },
                },
            },
            orderBy: { startTime: "asc" },
        })

        return sessions
    } catch (error) {
        console.error("Error fetching sessions:", error)
        return []
    }
}

/**
 * Get session by ID with attendees
 */
export async function getSessionById(sessionId: string) {
    try {
        const session = await prisma.courseSession.findUnique({
            where: { id: sessionId },
            include: {
                Course: {
                    select: {
                        id: true,
                        title: true,
                        instructorId: true,
                    },
                },
                Attendance: {
                    include: {
                        User: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                nip: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: { checkInAt: "desc" },
                },
            },
        })

        return session
    } catch (error) {
        console.error("Error fetching session:", error)
        return null
    }
}

/**
 * Update session
 */
export async function updateSession(
    sessionId: string,
    updates: Partial<z.infer<typeof createSessionSchema>>
) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Check ownership
        const existingSession = await prisma.courseSession.findUnique({
            where: { id: sessionId },
            include: { Course: true },
        })

        if (!existingSession) {
            return { error: "Session not found" }
        }

        if (
            existingSession.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Not authorized" }
        }

        const updated = await prisma.courseSession.update({
            where: { id: sessionId },
            data: {
                ...updates,
                startTime: updates.startTime ? new Date(updates.startTime) : undefined,
                endTime: updates.endTime ? new Date(updates.endTime) : undefined,
                updatedAt: new Date(),
            },
        })

        revalidatePath(`/dashboard/sessions/${sessionId}`)
        return { success: true, session: updated }
    } catch (error) {
        console.error("Error updating session:", error)
        return { error: "Failed to update session" }
    }
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Check ownership
        const existingSession = await prisma.courseSession.findUnique({
            where: { id: sessionId },
            include: { Course: true },
        })

        if (!existingSession) {
            return { error: "Session not found" }
        }

        if (
            existingSession.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Not authorized" }
        }

        await prisma.courseSession.delete({
            where: { id: sessionId },
        })

        revalidatePath(`/dashboard/courses/${existingSession.courseId}`)
        return { success: true }
    } catch (error) {
        console.error("Error deleting session:", error)
        return { error: "Failed to delete session" }
    }
}

/**
 * Generate QR attendance token
 */
export async function generateAttendanceToken(sessionId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Generate new token
        const { token, expiresAt } = generateToken(sessionId)

        // Save to database
        const attendanceToken = await prisma.attendanceToken.create({
            data: {
                id: crypto.randomUUID(),
                sessionId,
                token,
                expiresAt,
            },
        })

        return { success: true, token: attendanceToken.token, expiresAt }
    } catch (error) {
        console.error("Error generating token:", error)
        return { error: "Failed to generate token" }
    }
}

/**
 * Get active (non-expired) token for a session
 */
export async function getActiveToken(sessionId: string) {
    try {
        const token = await prisma.attendanceToken.findFirst({
            where: {
                sessionId,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return token
    } catch (error) {
        console.error("Error fetching active token:", error)
        return null
    }
}
