"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { hash } from "bcryptjs"
import { z } from "zod"
import { Role } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

// Schema for registration
const registerSchema = z.object({
    nip: z.string().min(18, "NIP harus 18 digit").max(18, "NIP harus 18 digit"),
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string(),
    unitKerja: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Password tidak sama",
    path: ["confirmPassword"],
})

// Schema for profile completion (simplified for OAuth users)
const completeProfileSchema = z.object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    unitKerja: z.string().min(2, "Organisasi wajib diisi"),
    role: z.enum(["LEARNER", "INSTRUCTOR"]).default("LEARNER"),
})

export async function registerUser(formData: FormData) {
    try {
        const rawData = {
            nip: formData.get("nip") as string,
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            confirmPassword: formData.get("confirmPassword") as string,
            unitKerja: formData.get("unitKerja") as string || undefined,
        }

        // Validate input
        const validatedData = registerSchema.parse(rawData)

        // Check if NIP already exists
        const existingNip = await prisma.user.findUnique({
            where: { nip: validatedData.nip },
        })

        if (existingNip) {
            return { error: "NIP sudah terdaftar" }
        }

        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email: validatedData.email },
        })

        if (existingEmail) {
            return { error: "Email sudah terdaftar" }
        }

        // Hash password
        const hashedPassword = await hash(validatedData.password, 12)

        // Create user
        await prisma.user.create({
            data: {
                id: crypto.randomUUID(),
                nip: validatedData.nip,
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                unitKerja: validatedData.unitKerja || null,
                role: "LEARNER",
                updatedAt: new Date(),
            },
        })

        return { success: true }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Registration error:", error)
        return { error: "Terjadi kesalahan saat mendaftar" }
    }
}

export async function completeProfile(formData: FormData) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return { error: "Unauthorized" }
        }

        const rawData = {
            name: formData.get("name") as string,
            unitKerja: formData.get("unitKerja") as string,
            role: (formData.get("role") as string) || "LEARNER",
        }

        // Validate input
        const validatedData = completeProfileSchema.parse(rawData)

        // Update user profile
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: validatedData.name,
                unitKerja: validatedData.unitKerja,
                role: validatedData.role as Role,
            },
        })

        revalidatePath("/dashboard")
        revalidatePath("/complete-profile")
        return {
            success: true,
            user: {
                unitKerja: updatedUser.unitKerja,
                role: updatedUser.role,
            }
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        console.error("Complete profile error:", error)
        return { error: "Terjadi kesalahan saat menyimpan profil" }
    }
}
