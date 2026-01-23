import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCategories } from "@/lib/actions/categories"
import { prisma } from "@/lib/db"
import { CategoryManager } from "@/components/admin/category-manager"
import { ArrowLeft, FolderTree } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CategoriesAdminPage() {
    const session = await auth()
    if (!session?.user || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role as string)) {
        redirect("/dashboard")
    }

    const categories = await getCategories()

    // Get all courses for assignment
    const courses = await prisma.course.findMany({
        select: {
            id: true,
            title: true,
            categoryId: true,
            category: true
        },
        orderBy: { title: 'asc' }
    })

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-4 pb-20">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/admin">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Kembali
                            </Link>
                        </Button>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                                <FolderTree className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Kelola Kategori</h1>
                                <p className="text-sm text-slate-500">Buat, edit, dan hapus kategori kursus</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Manager Component */}
                <CategoryManager
                    initialCategories={categories}
                    courses={courses}
                />
            </div>
        </div>
    )
}
