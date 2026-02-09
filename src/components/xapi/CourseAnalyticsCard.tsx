"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, CheckCircle, Loader2 } from "lucide-react"
import { getCourseAnalytics } from "@/lib/actions/xapi-extended-analytics"

interface CourseAnalyticsItem {
    courseId: string
    title: string
    enrollments: number
    completions: number
    completionRate: number
    avgProgress: number
}

export function CourseAnalyticsCard() {
    const [courses, setCourses] = useState<CourseAnalyticsItem[]>([])
    const [stats, setStats] = useState({ totalEnrollments: 0, totalCompletions: 0, avgCompletionRate: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getCourseAnalytics().then(result => {
            setCourses(result.courses)
            setStats({
                totalEnrollments: result.totalEnrollments,
                totalCompletions: result.totalCompletions,
                avgCompletionRate: result.avgCompletionRate
            })
            setLoading(false)
        })
    }, [])

    if (loading) {
        return (
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        Course Analytics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Course Analytics
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <p className="text-lg font-bold text-blue-600">{stats.totalEnrollments}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Enrollments</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <p className="text-lg font-bold text-green-600">{stats.totalCompletions}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Completions</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <p className="text-lg font-bold text-purple-600">{stats.avgCompletionRate}%</p>
                        <p className="text-[10px] text-slate-500 uppercase">Avg Rate</p>
                    </div>
                </div>

                {/* Course List */}
                {courses.length === 0 ? (
                    <div className="text-center py-4 text-slate-500">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data kursus</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {courses.slice(0, 5).map((course, index) => (
                            <div key={course.courseId} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={course.title}>
                                        {index + 1}. {course.title}
                                    </span>
                                    <span className="text-slate-500 text-xs flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {course.enrollments}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                                            style={{ width: `${course.completionRate}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 w-10 text-right">{course.completionRate}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
