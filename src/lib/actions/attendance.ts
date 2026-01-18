"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { validateToken } from "@/lib/utils/qr-tokens"
import { isWithinRadius, calculateDistance } from "@/lib/utils/geolocation"
import { awardPoints, updateActivityStreak } from "./gamification"

/**
 * Check in with QR code
 */
export async function checkInWithQR(sessionId: string, token: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Find token in database
        const attendanceToken = await prisma.attendanceToken.findFirst({
            where: {
                sessionId,
                token,
            },
        })

        if (!attendanceToken) {
            return { error: "Invalid QR code" }
        }

        // Validate token expiry
        if (!validateToken(token, attendanceToken.expiresAt)) {
            return { error: "QR code has expired. Please scan the new code." }
        }

        // Check if already checked in
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_sessionId: {
                    userId: session.user.id,
                    sessionId,
                },
            },
        })

        if (existing) {
            return { error: "You have already checked in for this session" }
        }

        // Get session details to check time window
        const courseSession = await prisma.courseSession.findUnique({
            where: { id: sessionId },
        })

        if (!courseSession) {
            return { error: "Session not found" }
        }

        // Determine status based on check-in time
        const now = new Date()
        const graceMinutes = 15
        const lateThreshold = new Date(
            courseSession.startTime.getTime() + graceMinutes * 60000
        )
        const status = now > lateThreshold ? "LATE" : "PRESENT"

        // Create attendance record
        const attendance = await prisma.attendance.create({
            data: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                sessionId,
                status,
                checkInAt: now,
                method: "QR_CODE",
                updatedAt: now,
            },
        })

        revalidatePath(`/dashboard/sessions/${sessionId}`)
        return {
            success: true,
            attendance,
            message:
                status === "LATE"
                    ? "Checked in successfully (marked as late)"
                    : "Checked in successfully!",
        }
    } catch (error) {
        console.error("Error checking in with QR:", error)
        return { error: "Failed to check in" }
    }
}

/**
 * Check in with GPS
 */
export async function checkInWithGPS(
    sessionId: string,
    latitude: number,
    longitude: number
) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Get session details
        const courseSession = await prisma.courseSession.findUnique({
            where: { id: sessionId },
        })

        if (!courseSession) {
            return { error: "Session not found" }
        }

        // Check if session has GPS requirements
        if (!courseSession.latitude || !courseSession.longitude || !courseSession.geoRadius) {
            return { error: "This session does not support GPS check-in" }
        }

        // Validate location
        const distance = calculateDistance(
            latitude,
            longitude,
            courseSession.latitude,
            courseSession.longitude
        )

        if (!isWithinRadius(
            latitude,
            longitude,
            courseSession.latitude,
            courseSession.longitude,
            courseSession.geoRadius
        )) {
            return {
                error: `You are ${Math.round(distance)}m away from the session location. Please move closer (within ${courseSession.geoRadius}m).`,
            }
        }

        // Check if already checked in
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_sessionId: {
                    userId: session.user.id,
                    sessionId,
                },
            },
        })

        if (existing) {
            return { error: "You have already checked in for this session" }
        }

        // Determine status
        const now = new Date()
        const graceMinutes = 15
        const lateThreshold = new Date(
            courseSession.startTime.getTime() + graceMinutes * 60000
        )
        const status = now > lateThreshold ? "LATE" : "PRESENT"

        // Create attendance record
        const attendance = await prisma.attendance.create({
            data: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                sessionId,
                status,
                checkInAt: now,
                method: "GPS",
                latitude,
                longitude,
                updatedAt: now,
            },
        })

        revalidatePath(`/dashboard/sessions/${sessionId}`)
        return {
            success: true,
            attendance,
            message:
                status === "LATE"
                    ? "Checked in successfully (marked as late)"
                    : "Checked in successfully!",
        }
    } catch (error) {
        console.error("Error checking in with GPS:", error)
        return { error: "Failed to check in" }
    }
}

/**
 * Manual check-in by instructor
 */
export async function checkInManual(sessionId: string, userId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Verify instructor permission
        const courseSession = await prisma.courseSession.findUnique({
            where: { id: sessionId },
            include: { Course: true },
        })

        if (!courseSession) {
            return { error: "Session not found" }
        }

        if (
            courseSession.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Not authorized" }
        }

        // Check if already checked in
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_sessionId: {
                    userId,
                    sessionId,
                },
            },
        })

        if (existing) {
            return { error: "User already checked in" }
        }

        // Create attendance
        const attendance = await prisma.attendance.create({
            data: {
                id: crypto.randomUUID(),
                userId,
                sessionId,
                status: "PRESENT",
                checkInAt: new Date(),
                method: "MANUAL",
                updatedAt: new Date(),
            },
        })

        revalidatePath(`/dashboard/sessions/${sessionId}`)
        return { success: true, attendance }
    } catch (error) {
        console.error("Error manual check-in:", error)
        return { error: "Failed to check in user" }
    }
}

/**
 * Get attendance records for a session
 */
export async function getAttendanceBySession(sessionId: string) {
    try {
        const records = await prisma.attendance.findMany({
            where: { sessionId },
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
        })

        return records
    } catch (error) {
        console.error("Error fetching attendance:", error)
        return []
    }
}

/**
 * Get user's attendance history for a course
 */
export async function getUserAttendance(userId: string, courseId: string) {
    try {
        const records = await prisma.attendance.findMany({
            where: {
                userId,
                CourseSession: {
                    courseId,
                },
            },
            include: {
                CourseSession: {
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        type: true,
                    },
                },
            },
            orderBy: { checkInAt: "desc" },
        })

        return records
    } catch (error) {
        console.error("Error fetching user attendance:", error)
        return []
    }
}

/**
 * Update attendance status (for instructor corrections)
 */
export async function updateAttendanceStatus(
    attendanceId: string,
    status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED",
    notes?: string
) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Verify instructor permission
        const attendance = await prisma.attendance.findUnique({
            where: { id: attendanceId },
            include: {
                CourseSession: {
                    include: { Course: true },
                },
            },
        })

        if (!attendance) {
            return { error: "Attendance record not found" }
        }

        if (
            attendance.CourseSession.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
        ) {
            return { error: "Not authorized" }
        }

        const updated = await prisma.attendance.update({
            where: { id: attendanceId },
            data: {
                status,
                notes,
                updatedAt: new Date(),
            },
        })

        revalidatePath(`/dashboard/sessions/${attendance.sessionId}`)
        return { success: true, attendance: updated }
    } catch (error) {
        console.error("Error updating attendance:", error)
        return { error: "Failed to update attendance" }
    }
}
