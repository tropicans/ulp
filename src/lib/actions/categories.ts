"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Get all categories
export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { Course: true }
                }
            }
        })
        return categories
    } catch (error) {
        console.error("Error fetching categories:", error)
        return []
    }
}

// Create a new category
export async function createCategory(data: {
    name: string
    slug: string
    icon?: string
    description?: string
    order?: number
}) {
    const session = await auth()
    if (!session?.user || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role as string)) {
        return { error: "Unauthorized" }
    }

    try {
        const category = await prisma.category.create({
            data: {
                name: data.name,
                slug: data.slug,
                icon: data.icon || "📁",
                description: data.description,
                order: data.order || 0
            }
        })
        revalidatePath("/dashboard/admin/categories")
        return { success: true, category }
    } catch (error: any) {
        if (error.code === "P2002") {
            return { error: "Slug sudah digunakan" }
        }
        console.error("Error creating category:", error)
        return { error: "Gagal membuat kategori" }
    }
}

// Update a category
export async function updateCategory(id: string, data: {
    name?: string
    slug?: string
    icon?: string
    description?: string
    order?: number
}) {
    const session = await auth()
    if (!session?.user || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role as string)) {
        return { error: "Unauthorized" }
    }

    try {
        const category = await prisma.category.update({
            where: { id },
            data
        })
        revalidatePath("/dashboard/admin/categories")
        return { success: true, category }
    } catch (error: any) {
        if (error.code === "P2002") {
            return { error: "Slug sudah digunakan" }
        }
        console.error("Error updating category:", error)
        return { error: "Gagal mengupdate kategori" }
    }
}

// Delete a category
export async function deleteCategory(id: string) {
    const session = await auth()
    if (!session?.user || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role as string)) {
        return { error: "Unauthorized" }
    }

    try {
        // Check if any courses are using this category
        const coursesCount = await prisma.course.count({
            where: { categoryId: id }
        })

        if (coursesCount > 0) {
            return { error: `Tidak dapat menghapus: ${coursesCount} kursus masih menggunakan kategori ini` }
        }

        await prisma.category.delete({
            where: { id }
        })
        revalidatePath("/dashboard/admin/categories")
        return { success: true }
    } catch (error) {
        console.error("Error deleting category:", error)
        return { error: "Gagal menghapus kategori" }
    }
}

// Assign course to category
export async function assignCourseToCategory(courseId: string, categoryId: string | null) {
    const session = await auth()
    if (!session?.user || !["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role as string)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.course.update({
            where: { id: courseId },
            data: { categoryId }
        })
        revalidatePath("/dashboard/admin/categories")
        revalidatePath("/courses")
        return { success: true }
    } catch (error) {
        console.error("Error assigning category:", error)
        return { error: "Gagal mengubah kategori kursus" }
    }
}

// Seed initial categories
export async function seedCategories() {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
        return { error: "Unauthorized" }
    }

    const initialCategories = [
        { name: "Kompetensi Teknis Umum", slug: "kompetensi-teknis-umum", icon: "🎯", order: 1 },
        { name: "PINTAR Bersama", slug: "pintar-bersama", icon: "🔊", order: 2 },
        { name: "Setneg Knowledge Center", slug: "setneg-knowledge-center", icon: "📚", order: 3 },
        { name: "Keprotokolan", slug: "keprotokolan", icon: "🏛️", order: 4 },
        { name: "Teknologi Informasi dan Komunikasi", slug: "teknologi-informasi-komunikasi", icon: "💻", order: 5 },
        { name: "Administrasi Umum", slug: "administrasi-umum", icon: "📋", order: 6 },
        { name: "SDM, Kelembagaan, dan Tata Laksana", slug: "sdm-kelembagaan-tata-laksana", icon: "👥", order: 7 },
    ]

    try {
        for (const cat of initialCategories) {
            await prisma.category.upsert({
                where: { slug: cat.slug },
                update: { name: cat.name, icon: cat.icon, order: cat.order },
                create: cat
            })
        }
        revalidatePath("/dashboard/admin/categories")
        return { success: true, message: "Berhasil seed 7 kategori" }
    } catch (error) {
        console.error("Error seeding categories:", error)
        return { error: "Gagal seed kategori" }
    }
}
