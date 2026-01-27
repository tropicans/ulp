"use server"

import { prisma } from "@/lib/db"
import { sendEmail, EmailTemplates } from "@/lib/email"
import { sendWhatsApp, WhatsAppTemplates } from "@/lib/whatsapp"
import { revalidatePath } from "next/cache"

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// OTP expires in 10 minutes
const OTP_EXPIRY_MINUTES = 10

/**
 * Send email verification OTP
 */
export async function sendEmailVerification(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, emailVerified: true }
        })

        if (!user) {
            return { success: false, error: "User tidak ditemukan" }
        }

        if (user.emailVerified) {
            return { success: false, error: "Email sudah terverifikasi" }
        }

        // Check for rate limiting - max 3 requests per 10 minutes
        const recentTokens = await prisma.userVerificationOTP.count({
            where: {
                userId,
                type: "EMAIL",
                createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
            }
        })

        if (recentTokens >= 3) {
            return { success: false, error: "Terlalu banyak permintaan. Coba lagi dalam 10 menit." }
        }

        // Generate OTP
        const otp = generateOTP()
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

        // Delete old tokens
        await prisma.userVerificationOTP.deleteMany({
            where: { userId, type: "EMAIL" }
        })

        // Create new token
        await prisma.userVerificationOTP.create({
            data: {
                userId,
                type: "EMAIL",
                token: otp,
                expiresAt
            }
        })

        // Send email
        const emailResult = await sendEmail({
            to: user.email,
            subject: "Kode Verifikasi TITAN",
            html: EmailTemplates.verificationOTP({
                userName: user.name || "Pengguna",
                otp,
                expiresIn: `${OTP_EXPIRY_MINUTES} menit`
            })
        })

        if (!emailResult.success) {
            return { success: false, error: "Gagal mengirim email: " + emailResult.error }
        }

        return { success: true, message: "Kode verifikasi telah dikirim ke email Anda" }
    } catch (error) {
        console.error("Send email verification error:", error)
        return { success: false, error: "Gagal mengirim verifikasi email" }
    }
}

/**
 * Send phone (WhatsApp) verification OTP
 */
export async function sendPhoneVerification(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, phone: true, name: true, phoneVerified: true }
        })

        if (!user) {
            return { success: false, error: "User tidak ditemukan" }
        }

        if (!user.phone) {
            return { success: false, error: "Nomor WhatsApp belum terdaftar. Lengkapi profil Anda terlebih dahulu." }
        }

        if (user.phoneVerified) {
            return { success: false, error: "Nomor WhatsApp sudah terverifikasi" }
        }

        // Check for rate limiting
        const recentTokens = await prisma.userVerificationOTP.count({
            where: {
                userId,
                type: "PHONE",
                createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
            }
        })

        if (recentTokens >= 3) {
            return { success: false, error: "Terlalu banyak permintaan. Coba lagi dalam 10 menit." }
        }

        // Generate OTP
        const otp = generateOTP()
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

        // Delete old tokens
        await prisma.userVerificationOTP.deleteMany({
            where: { userId, type: "PHONE" }
        })

        // Create new token
        await prisma.userVerificationOTP.create({
            data: {
                userId,
                type: "PHONE",
                token: otp,
                expiresAt
            }
        })

        // Send WhatsApp
        const waResult = await sendWhatsApp({
            phone: user.phone,
            message: WhatsAppTemplates.verificationOTP({
                userName: user.name || "Pengguna",
                otp,
                expiresIn: `${OTP_EXPIRY_MINUTES} menit`
            })
        })

        if (!waResult.status) {
            return { success: false, error: "Gagal mengirim WhatsApp: " + waResult.message }
        }

        return { success: true, message: "Kode verifikasi telah dikirim ke WhatsApp Anda" }
    } catch (error) {
        console.error("Send phone verification error:", error)
        return { success: false, error: "Gagal mengirim verifikasi WhatsApp" }
    }
}

/**
 * Verify email with OTP
 */
export async function verifyEmailOTP(userId: string, otp: string) {
    try {
        const token = await prisma.userVerificationOTP.findFirst({
            where: {
                userId,
                type: "EMAIL",
                token: otp,
                expiresAt: { gte: new Date() }
            }
        })

        if (!token) {
            return { success: false, error: "Kode tidak valid atau sudah kedaluwarsa" }
        }

        // Update user
        await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: new Date() }
        })

        // Delete token
        await prisma.userVerificationOTP.delete({
            where: { id: token.id }
        })

        revalidatePath("/dashboard")
        return { success: true, message: "Email berhasil diverifikasi!" }
    } catch (error) {
        console.error("Verify email OTP error:", error)
        return { success: false, error: "Gagal memverifikasi email" }
    }
}

/**
 * Verify phone with OTP
 */
export async function verifyPhoneOTP(userId: string, otp: string) {
    try {
        console.log("verifyPhoneOTP called with:", { userId, otp: otp.trim() })

        // First check if any token exists for this user
        const allTokens = await prisma.userVerificationOTP.findMany({
            where: { userId, type: "PHONE" }
        })
        console.log("All PHONE tokens for user:", allTokens)

        const token = await prisma.userVerificationOTP.findFirst({
            where: {
                userId,
                type: "PHONE",
                token: otp.trim(),
                expiresAt: { gte: new Date() }
            }
        })

        console.log("Found matching token:", token)

        if (!token) {
            return { success: false, error: "Kode tidak valid atau sudah kedaluwarsa" }
        }

        // Update user
        await prisma.user.update({
            where: { id: userId },
            data: { phoneVerified: new Date() }
        })

        // Delete token
        await prisma.userVerificationOTP.delete({
            where: { id: token.id }
        })

        revalidatePath("/dashboard")
        return { success: true, message: "Nomor WhatsApp berhasil diverifikasi!" }
    } catch (error) {
        console.error("Verify phone OTP error:", error)
        return { success: false, error: "Gagal memverifikasi nomor WhatsApp" }
    }
}

/**
 * Check if user needs verification (based on system settings)
 */
export async function checkVerificationRequired(userId: string) {
    try {
        // Get system setting
        const setting = await prisma.systemSetting.findUnique({
            where: { key: "require_email_verification" }
        })

        const requireVerification = setting?.value === "true"

        if (!requireVerification) {
            return { required: false }
        }

        // Check user verification status
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true, phoneVerified: true }
        })

        if (!user) {
            return { required: false }
        }

        const emailVerified = !!user.emailVerified
        const phoneVerified = !!user.phoneVerified

        return {
            required: !emailVerified, // Only require email verification
            emailVerified,
            phoneVerified
        }
    } catch (error) {
        console.error("Check verification required error:", error)
        return { required: false }
    }
}

/**
 * Get user verification status
 */
export async function getVerificationStatus(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                phone: true,
                emailVerified: true,
                phoneVerified: true
            }
        })

        if (!user) {
            return { success: false, error: "User tidak ditemukan" }
        }

        return {
            success: true,
            email: user.email,
            phone: user.phone,
            emailVerified: !!user.emailVerified,
            phoneVerified: !!user.phoneVerified
        }
    } catch (error) {
        console.error("Get verification status error:", error)
        return { success: false, error: "Gagal mendapatkan status verifikasi" }
    }
}
