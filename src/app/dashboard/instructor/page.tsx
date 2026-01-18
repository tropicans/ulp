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
    Eye
} from "lucide-react"

export default async function InstructorDashboard() {
    const session = await auth()

    if (!session || session.user.role !== "INSTRUCTOR") {
        redirect("/dashboard")
    }

    const { user } = session

    // Get instructor's courses
    const courses = await prisma.course.findMany({
        where: { instructorId: user.id },
        include: {
            _count: {
                select: {
                    Enrollment: true,
                    Module: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    const stats = [
        { label: "Total Kursus", value: courses.length, icon: BookOpen, color: "text-blue-500" },
        { label: "Total Peserta", value: courses.reduce((acc, c) => acc + c._count.Enrollment, 0), icon: Users, color: "text-green-500" },
        { label: "Kursus Published", value: courses.filter(c => c.isPublished).length, icon: TrendingUp, color: "text-purple-500" },
    ]

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Dashboard Instructor 👨‍🏫
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {user.name} • {user.unitKerja || "Fasilitator"}
                    </p>
                </div>
                <Link href="/dashboard/courses/new">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Kursus Baru
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
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

            {/* Courses List */}
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Kursus Saya
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {courses.length > 0 ? (
                        <div className="space-y-3">
                            {courses.map((course) => (
                                <div
                                    key={course.id}
                                    className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">{course.title}</h3>
                                            <Badge
                                                variant={course.isPublished ? "default" : "secondary"}
                                                className={course.isPublished ? "bg-green-500/20 text-green-600 dark:text-green-400" : ""}
                                            >
                                                {course.isPublished ? "Published" : "Draft"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                            <span>{course._count.Enrollment} peserta</span>
                                            <span>•</span>
                                            <span>{course._count.Module} modul</span>
                                            <span>•</span>
                                            <span>{course.deliveryMode}</span>
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 mb-4">Anda belum membuat kursus</p>
                            <Link href="/dashboard/courses/new">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat Kursus Pertama
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
