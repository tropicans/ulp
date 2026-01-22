import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, Users, Edit, Eye } from "lucide-react"
import { AdminCourseFilters } from "@/components/courses/admin-course-filters"
import { Suspense } from "react"
import { DeliveryMode } from "@/generated/prisma"

interface PageProps {
    searchParams: Promise<{
        search?: string
        status?: string
        mode?: string
    }>
}

export default async function InstructorCoursesPage({ searchParams }: PageProps) {
    const params = await searchParams
    const session = await auth()

    if (!session?.user) {
        redirect("/login?callbackUrl=/dashboard/courses")
    }

    // Only instructors and admins can access
    if (!["INSTRUCTOR", "SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        redirect("/dashboard")
    }

    // Admin sees all courses, instructors see only their own
    const isAdmin = ["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)

    // Build filter conditions
    const whereConditions: any = isAdmin ? {} : { instructorId: session.user.id }

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

    // Get all delivery modes for filter dropdown
    const deliveryModes = Object.values(DeliveryMode)

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20">
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {isAdmin ? "Kelola Semua Kursus" : "Kursus Saya"}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isAdmin
                                ? `Total ${courses.length} kursus ditemukan`
                                : "Kelola kursus yang Anda instrukturi"}
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/courses/new">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Kursus Baru
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Suspense fallback={<div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />}>
                <AdminCourseFilters deliveryModes={deliveryModes} />
            </Suspense>

            {courses.length > 0 ? (
                <div className="grid gap-6">
                    {courses.map((course) => (
                        <Card key={course.id} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 backdrop-blur-sm hover:border-blue-500/50 transition-all">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CardTitle className="text-xl text-slate-900 dark:text-white">{course.title}</CardTitle>
                                            {course.isPublished ? (
                                                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                        <CardDescription className="text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {course.description}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            <span>{course._count.Module} Modul</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>{course._count.Enrollment} Peserta</span>
                                        </div>
                                        <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600">
                                            {course.deliveryMode.replace(/_/g, " ")}
                                        </Badge>
                                        {isAdmin && course.User?.name && (
                                            <span className="text-xs text-blue-500">
                                                Instruktur: {course.User.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/courses/${course.slug}`} target="_blank">
                                            <Button variant="outline" size="sm" className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                                                <Eye className="w-4 h-4 mr-2" />
                                                Preview
                                            </Button>
                                        </Link>
                                        <Link href={`/dashboard/courses/${course.id}/edit`}>
                                            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            {params.search || params.status || params.mode
                                ? "Tidak Ada Kursus Ditemukan"
                                : "Belum Ada Kursus"}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
                            {params.search || params.status || params.mode
                                ? "Coba ubah filter atau kata kunci pencarian."
                                : "Mulai buat kursus pertama Anda untuk berbagi pengetahuan dengan ASN lainnya."}
                        </p>
                        {!params.search && !params.status && !params.mode && (
                            <Link href="/dashboard/courses/new">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat Kursus Pertama
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
