"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, Loader2, Sparkles, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { createCategory, updateCategory, deleteCategory, assignCourseToCategory, seedCategories } from "@/lib/actions/categories"
import { useRouter } from "next/navigation"

interface Category {
    id: string
    name: string
    slug: string
    icon: string | null
    description: string | null
    order: number
    _count: { Course: number }
}

interface Course {
    id: string
    title: string
    categoryId: string | null
    category: string | null
}

interface Props {
    initialCategories: Category[]
    courses: Course[]
}

export function CategoryManager({ initialCategories, courses }: Props) {
    const router = useRouter()
    const [categories, setCategories] = useState(initialCategories)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [loading, setLoading] = useState(false)
    const [seeding, setSeeding] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        icon: "📁",
        description: "",
        order: 0
    })

    const resetForm = () => {
        setFormData({ name: "", slug: "", icon: "📁", description: "", order: 0 })
    }

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim()
    }

    const handleCreate = async () => {
        setLoading(true)
        const result = await createCategory(formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Kategori berhasil dibuat!")
            setIsCreateOpen(false)
            resetForm()
            router.refresh()
        }
        setLoading(false)
    }

    const handleUpdate = async () => {
        if (!editingCategory) return
        setLoading(true)
        const result = await updateCategory(editingCategory.id, formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Kategori berhasil diupdate!")
            setEditingCategory(null)
            resetForm()
            router.refresh()
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus kategori ini?")) return
        const result = await deleteCategory(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Kategori berhasil dihapus!")
            router.refresh()
        }
    }

    const handleSeed = async () => {
        if (!confirm("Ini akan membuat 7 kategori default. Lanjutkan?")) return
        setSeeding(true)
        const result = await seedCategories()
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.message)
            router.refresh()
        }
        setSeeding(false)
    }

    const handleAssignCourse = async (courseId: string, categoryId: string | null) => {
        const result = await assignCourseToCategory(courseId, categoryId === "none" ? null : categoryId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Kategori kursus berhasil diubah!")
            router.refresh()
        }
    }

    const openEdit = (cat: Category) => {
        setEditingCategory(cat)
        setFormData({
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon || "📁",
            description: cat.description || "",
            order: cat.order
        })
    }

    return (
        <div className="space-y-8">
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
                <Button onClick={() => setIsCreateOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Kategori
                </Button>
                {categories.length === 0 && (
                    <Button onClick={handleSeed} variant="outline" disabled={seeding}>
                        {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Seed Kategori Default
                    </Button>
                )}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Categories List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Kategori</CardTitle>
                        <CardDescription>{categories.length} kategori tersedia</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {categories.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-8">Belum ada kategori. Klik "Seed Kategori Default" untuk memulai.</p>
                        ) : (
                            categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 group hover:border-purple-500/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{cat.icon}</span>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-white">{cat.name}</h4>
                                            <p className="text-xs text-slate-500">{cat._count.Course} kursus • /{cat.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(cat.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Course Assignment */}
                <Card>
                    <CardHeader>
                        <CardTitle>Assign Kursus ke Kategori</CardTitle>
                        <CardDescription>{courses.length} kursus tersedia</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                            >
                                <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                                    {course.title}
                                </span>
                                <Select
                                    value={course.categoryId || "none"}
                                    onValueChange={(value) => handleAssignCourse(course.id, value)}
                                >
                                    <SelectTrigger className="w-[200px] h-8 text-xs">
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Tidak ada kategori</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buat Kategori Baru</DialogTitle>
                        <DialogDescription>Tambahkan kategori untuk mengelompokkan kursus</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <Input
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="text-center text-2xl"
                                    maxLength={2}
                                />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label>Nama Kategori</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        name: e.target.value,
                                        slug: generateSlug(e.target.value)
                                    })}
                                    placeholder="Contoh: Teknologi Informasi"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Slug (URL)</Label>
                            <Input
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="teknologi-informasi"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Deskripsi (Opsional)</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Deskripsi singkat kategori ini..."
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                        <Button onClick={handleCreate} disabled={loading || !formData.name}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Kategori</DialogTitle>
                        <DialogDescription>Ubah informasi kategori</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <Input
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="text-center text-2xl"
                                    maxLength={2}
                                />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label>Nama Kategori</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Slug (URL)</Label>
                            <Input
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Deskripsi (Opsional)</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCategory(null)}>Batal</Button>
                        <Button onClick={handleUpdate} disabled={loading || !formData.name}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
