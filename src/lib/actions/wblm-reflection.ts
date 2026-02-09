"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
    WblmReflectionStatus,
    WblmEnrollmentStatus
} from "@/generated/prisma"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const reflectionAnswersSchema = z.object({
    initialAssumptions: z.string().optional(),
    whatChanged: z.string().optional(),
    keyFeedback: z.string().optional(),
    whatWouldDoDifferently: z.string().optional(),
    additionalNotes: z.string().optional()
})

const submitReflectionSchema = z.object({
    milestoneId: z.string().optional().nullable(), // null for final reflection
    answers: reflectionAnswersSchema
})

// ============================================
// REFLECTION OPERATIONS
// ============================================

/**
 * Submit a reflection (per milestone or final)
 */
export async function submitWblmReflection(
    programId: string,
    data: z.infer<typeof submitReflectionSchema>
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        // Check enrollment
        const enrollment = await prisma.wblmEnrollment.findFirst({
            where: {
                programId,
                participantUserId: session.user.id,
                status: { in: [WblmEnrollmentStatus.ENROLLED, WblmEnrollmentStatus.ACTIVE] }
            }
        })

        if (!enrollment) {
            return { error: "Anda tidak terdaftar pada program ini" }
        }

        const validatedData = submitReflectionSchema.parse(data)

        // Check if reflection already exists
        const existing = await prisma.wblmReflection.findFirst({
            where: {
                programId,
                participantUserId: session.user.id,
                milestoneId: validatedData.milestoneId || null
            }
        })

        if (existing && existing.status === WblmReflectionStatus.LOCKED) {
            return { error: "Refleksi sudah dikunci dan tidak dapat diubah" }
        }

        if (existing) {
            // Update existing
            const updated = await prisma.wblmReflection.update({
                where: { id: existing.id },
                data: {
                    answers: validatedData.answers,
                    status: WblmReflectionStatus.SUBMITTED,
                    submittedAt: new Date()
                }
            })

            revalidatePath(`/dashboard/wblm/programs/${programId}`)
            return { success: true, reflection: updated, message: "Refleksi berhasil diperbarui" }
        }

        // Create new reflection
        const reflection = await prisma.wblmReflection.create({
            data: {
                programId,
                participantUserId: session.user.id,
                milestoneId: validatedData.milestoneId || null,
                answers: validatedData.answers,
                status: WblmReflectionStatus.SUBMITTED,
                submittedAt: new Date()
            }
        })

        revalidatePath(`/dashboard/wblm/programs/${programId}`)

        return { success: true, reflection, message: "Refleksi berhasil disimpan" }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Error submitting reflection:", error)
        return { error: "Gagal menyimpan refleksi" }
    }
}

/**
 * Get reflection for a participant
 */
export async function getWblmReflection(
    programId: string,
    milestoneId?: string | null,
    participantUserId?: string
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const userId = participantUserId || session.user.id

        // Authorization check for viewing others' reflections
        if (userId !== session.user.id && !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            const program = await prisma.wblmProgram.findUnique({
                where: { id: programId },
                select: { ownerUserId: true }
            })

            const isReviewer = await prisma.wblmReviewAssignment.findFirst({
                where: {
                    programId,
                    participantUserId: userId,
                    reviewerUserId: session.user.id
                }
            })

            if (program?.ownerUserId !== session.user.id && !isReviewer) {
                return null
            }
        }

        const reflection = await prisma.wblmReflection.findFirst({
            where: {
                programId,
                participantUserId: userId,
                milestoneId: milestoneId || null
            }
        })

        return reflection
    } catch (error) {
        console.error("Error fetching reflection:", error)
        return null
    }
}

/**
 * Get all reflections for a participant in a program
 */
export async function getWblmReflections(
    programId: string,
    participantUserId?: string
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        const userId = participantUserId || session.user.id

        const reflections = await prisma.wblmReflection.findMany({
            where: {
                programId,
                participantUserId: userId
            },
            include: {
                Milestone: {
                    select: { id: true, name: true, orderIndex: true }
                }
            },
            orderBy: { submittedAt: "desc" }
        })

        return reflections
    } catch (error) {
        console.error("Error fetching reflections:", error)
        return []
    }
}

/**
 * Lock reflection (program owner/admin only)
 */
export async function lockWblmReflection(reflectionId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const reflection = await prisma.wblmReflection.findUnique({
            where: { id: reflectionId },
            include: {
                Program: {
                    select: { ownerUserId: true, id: true }
                }
            }
        })

        if (!reflection) {
            return { error: "Refleksi tidak ditemukan" }
        }

        if (reflection.Program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" }
        }

        await prisma.wblmReflection.update({
            where: { id: reflectionId },
            data: {
                status: WblmReflectionStatus.LOCKED,
                lockedAt: new Date()
            }
        })

        revalidatePath(`/dashboard/admin/wblm/programs/${reflection.Program.id}`)

        return { success: true, message: "Refleksi berhasil dikunci" }
    } catch (error) {
        console.error("Error locking reflection:", error)
        return { error: "Gagal mengunci refleksi" }
    }
}
