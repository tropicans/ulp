import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Users,
    BookOpen,
    TrendingUp,
    Shield,
    Settings,
    Activity,
    FolderTree
} from "lucide-react"

export default async function AdminDashboard() {
    const session = await auth()

    if (!session || (session.user.role !== "ADMIN_UNIT" && session.user.role !== "SUPER_ADMIN")) {
        redirect("/dashboard")
    }

    const { user } = session

    // Get system-wide stats
    const [totalUsers, totalCourses, totalEnrollments] = await Promise.all([
        prisma.user.count(),
        prisma.course.count(),
        prisma.enrollment.count(),
    ])

    const stats = [
        { label: "Total User", value: totalUsers, icon: Users, color: "text-blue-500" },
        { label: "Total Kursus", value: totalCourses, icon: BookOpen, color: "text-green-500" },
        { label: "Total Enrollment", value: totalEnrollments, icon: TrendingUp, color: "text-purple-500" },
    ]

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Shield className="w-8 h-8 text-red-400" />
                    Admin Dashboard
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {user.name} • {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin Unit"}
                </p>
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

            {/* Quick Actions */}
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Akses Admin</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/dashboard/courses"
                            className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/30 transition-all group"
                        >
                            <BookOpen className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Kelola Kursus</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Course Center</p>
                        </Link>
                        <Link
                            href="/dashboard/admin/users"
                            className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/30 transition-all group"
                        >
                            <Users className="w-6 h-6 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Kelola User</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">User Management</p>
                        </Link>
                        <Link
                            href="/dashboard/admin/settings"
                            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/30 transition-all group"
                        >
                            <Settings className="w-6 h-6 text-red-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Pengaturan</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">System Settings</p>
                        </Link>
                        <Link
                            href="/dashboard/admin/logs"
                            className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/30 transition-all group"
                        >
                            <Shield className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Log Audit</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">System Logs</p>
                        </Link>
                        <Link
                            href="/dashboard/admin/xapi"
                            className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/30 transition-all group"
                        >
                            <Activity className="w-6 h-6 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">xAPI Analytics</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Learning Records</p>
                        </Link>
                        <Link
                            href="/dashboard/admin/categories"
                            className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/30 transition-all group"
                        >
                            <FolderTree className="w-6 h-6 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Kelola Kategori</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Course Categories</p>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
