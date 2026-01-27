import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BookOpen,
    Users,
    TrendingUp,
    Plus,
    Edit,
    Eye,
    Youtube,
    Sparkles,
    Video
} from "lucide-react"
import { DeleteCourseButton } from "@/components/course/delete-course-button"
import { AdminCourseFilters } from "@/components/courses/admin-course-filters"
import { DeliveryMode } from "@/generated/prisma"
import { Suspense } from "react"

interface PageProps {
    searchParams: Promise<{
        search?: string
        status?: string
        mode?: string
    }>
}

export default async function InstructorDashboard({ searchParams }: PageProps) {
    const params = await searchParams
    const session = await auth()

    if (!session?.user) {
        redirect("/login?callbackUrl=/dashboard/instructor")
    }

    // Allow instructors and admins
    const allowedRoles = ["INSTRUCTOR", "SUPER_ADMIN", "ADMIN_UNIT"]
    if (!allowedRoles.includes(session.user.role)) {
        redirect("/dashboard")
    }

    const { user } = session
    const isAdmin = ["SUPER_ADMIN", "ADMIN_UNIT"].includes(user.role)

    // Build filter conditions - admin sees all, instructor sees own
    const whereConditions: any = isAdmin ? {} : { instructorId: user.id }

    // Search filter
    if (params.search) {
        whereConditions.title = { contains: params.search, mode: 'insensitive' }
    }

    // Status filter
    if (params.status === "published") {
        whereConditions.isPublished = true
    } else if (params.status === "draft") {
        whereConditions.isPublished = false
    }

    // Delivery mode filter
    if (params.mode && params.mode !== "all") {
        whereConditions.deliveryMode = params.mode as DeliveryMode
    }

    // Get courses
    const courses = await prisma.course.findMany({
        where: whereConditions,
        include: {
            _count: {
                select: {
                    Enrollment: true,
                    Module: true
                }
            },
            User: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    // Stats (for all courses, not filtered)
    const allCourses = isAdmin
        ? await prisma.course.count()
        : await prisma.course.count({ where: { instructorId: user.id } })

    const publishedCount = isAdmin
        ? await prisma.course.count({ where: { isPublished: true } })
        : await prisma.course.count({ where: { instructorId: user.id, isPublished: true } })

    const totalEnrollments = await prisma.enrollment.count({
        where: isAdmin ? {} : { Course: { instructorId: user.id } }
    })

    const stats = [
        { label: "Total Kursus", value: allCourses, icon: BookOpen, color: "text-blue-500" },
        { label: "Total Peserta", value: totalEnrollments, icon: Users, color: "text-green-500" },
        { label: "Kursus Published", value: publishedCount, icon: TrendingUp, color: "text-purple-500" },
    ]

    const deliveryModes = Object.values(DeliveryMode)

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {isAdmin ? "Kelola Semua Kursus 📚" : "Dashboard Instructor 👨‍🏫"}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isAdmin
                            ? `Kelola ${courses.length} kursus dari semua instruktur`
                            : `${user.name} • ${user.unitKerja || "Fasilitator"}`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/instructor/import-youtube">
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/10">
                            <Youtube className="w-4 h-4 mr-2" />
                            Import YouTube
                        </Button>
                    </Link>
                    <Link href="/dashboard/instructor/curation">
                        <Button variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-900/30 dark:hover:bg-purple-900/10">
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI Curation Lab
                        </Button>
                    </Link>
                    <Link href="/dashboard/instructor/create-sync-course">
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50 dark:border-green-900/30 dark:hover:bg-green-900/10">
                            <Video className="w-4 h-4 mr-2" />
                            KAP Upload
                        </Button>
                    </Link>
                    <Link href="/dashboard/courses/new">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Buat Kursus Baru
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                                </div>
                                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Suspense fallback={<div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />}>
                <AdminCourseFilters deliveryModes={deliveryModes} />
            </Suspense>

            {/* Courses List */}
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        {isAdmin ? "Semua Kursus" : "Kursus Saya"}
                        <Badge variant="secondary" className="ml-2">{courses.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {courses.length > 0 ? (
                        <div className="space-y-3">
                            {courses.map((course) => (
                                <div
                                    key={course.id}
                                    className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">{course.title}</h3>
                                            <Badge
                                                variant={course.isPublished ? "default" : "secondary"}
                                                className={course.isPublished ? "bg-green-500/20 text-green-600 dark:text-green-400" : ""}
                                            >
                                                {course.isPublished ? "Published" : "Draft"}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {course.deliveryMode.replace(/_/g, " ")}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                                            <span>{course._count.Enrollment} peserta</span>
                                            <span>•</span>
                                            <span>{course._count.Module} modul</span>
                                            {isAdmin && course.User?.name && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-blue-500">Instruktur: {course.User.name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" asChild className="border-slate-300 dark:border-slate-600">
                                            <Link href={`/courses/${course.slug}`}>
                                                <Eye className="w-4 h-4 mr-1" />
                                                Lihat
                                            </Link>
                                        </Button>
                                        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
                                            <Link href={`/dashboard/courses/${course.id}/edit`}>
                                                <Edit className="w-4 h-4 mr-1" />
                                                Edit
                                            </Link>
                                        </Button>
                                        <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 mb-4">
                                {params.search || params.status || params.mode
                                    ? "Tidak ada kursus yang cocok dengan filter"
                                    : "Anda belum membuat kursus"}
                            </p>
                            {!params.search && !params.status && !params.mode && (
                                <Link href="/dashboard/courses/new">
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Buat Kursus Pertama
                                    </Button>
                                </Link>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
