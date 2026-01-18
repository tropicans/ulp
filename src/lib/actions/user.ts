"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const profileSchema = z.object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    nip: z.string().optional(),
    unitKerja: z.string().optional(),
    phone: z.string().optional(),
    jabatan: z.string().optional(),
    pangkat: z.string().optional(),
    image: z.string().optional().nullable(),
})

/**
 * Update User Profile
 */
export async function updateProfile(data: z.infer<typeof profileSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const validated = profileSchema.parse(data)

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...validated,
                updatedAt: new Date()
            }
        })

        revalidatePath("/dashboard/profile")
        return { success: true, user }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        return { error: "Failed to update profile" }
    }
}

/**
 * Get Notifications
 */
export async function getNotifications() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 50
        })

        return { notifications }
    } catch (error) {
        return { error: "Failed to fetch notifications" }
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await prisma.notification.update({
            where: { id, userId: session.user.id },
            data: { isRead: true, readAt: new Date() }
        })

        revalidatePath("/dashboard/notifications")
        return { success: true }
    } catch (error) {
        return { error: "Failed to update notification" }
    }
}

/**
 * Mark all as read
 */
export async function markAllNotificationsRead() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await prisma.notification.updateMany({
            where: { userId: session.user.id, isRead: false },
            data: { isRead: true, readAt: new Date() }
        })

        revalidatePath("/dashboard/notifications")
        return { success: true }
    } catch (error) {
        return { error: "Failed to update notifications" }
    }
}
