import { Suspense } from "react"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSurveysByCourse, getFeedbackAnalytics } from "@/lib/actions/feedback"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Users, TrendingUp, MessageSquare, Plus, ChevronRight } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ courseId: string }>
}

async function FeedbackStats({ courseId }: { courseId: string }) {
    const surveysResult = await getSurveysByCourse(courseId)

    if (!surveysResult.success || !surveysResult.surveys?.length) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Belum ada survey feedback</h3>
                    <p className="text-gray-500 mb-4">
                        Buat survey untuk mengumpulkan feedback dari peserta
                    </p>
                    <CreateSurveyButton courseId={courseId} />
                </CardContent>
            </Card>
        )
    }

    const latestSurvey = surveysResult.surveys[0]
    const analyticsResult = await getFeedbackAnalytics(latestSurvey.id)
    const analytics = analyticsResult.analytics

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                    title="Total Responden"
                    value={analytics?.totalResponses || 0}
                    icon={<Users className="w-5 h-5" />}
                    color="blue"
                />
                <StatCard
                    title="Rating Keseluruhan"
                    value={analytics?.averageOverall || 0}
                    suffix="/5"
                    icon={<Star className="w-5 h-5" />}
                    color="yellow"
                />
                <StatCard
                    title="Rating Instruktur"
                    value={analytics?.averageInstructor || 0}
                    suffix="/5"
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="green"
                />
                <StatCard
                    title="Rating Materi"
                    value={analytics?.averageMaterial || 0}
                    suffix="/5"
                    icon={<MessageSquare className="w-5 h-5" />}
                    color="purple"
                />
            </div>

            {/* Rating Distribution */}
            {analytics && analytics.totalResponses > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Distribusi Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map((rating) => {
                                const count = analytics.ratingDistribution.find(r => r.rating === rating)?.count || 0
                                const percentage = analytics.totalResponses > 0
                                    ? (count / analytics.totalResponses) * 100
                                    : 0
                                return (
                                    <div key={rating} className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 w-16 text-sm">
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                            <span>{rating}</span>
                                        </div>
                                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-500 w-16 text-right">
                                            {count} ({Math.round(percentage)}%)
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Feedback */}
            {analytics && analytics.recentFeedback.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Feedback Terbaru</CardTitle>
                        <CardDescription>
                            Masukan dari peserta pelatihan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.recentFeedback.map((feedback) => (
                                <div
                                    key={feedback.id}
                                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${star <= feedback.overallRating
                                                        ? "fill-yellow-400 text-yellow-400"
                                                        : "fill-gray-200 text-gray-300"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {feedback.isAnonymous ? "Anonim" : feedback.userName || "Pengguna"}
                                        </span>
                                    </div>
                                    {feedback.strengths && (
                                        <div className="mb-2">
                                            <span className="text-xs font-medium text-green-600">Kelebihan:</span>
                                            <p className="text-sm text-gray-700">{feedback.strengths}</p>
                                        </div>
                                    )}
                                    {feedback.improvements && (
                                        <div className="mb-2">
                                            <span className="text-xs font-medium text-orange-600">Perbaikan:</span>
                                            <p className="text-sm text-gray-700">{feedback.improvements}</p>
                                        </div>
                                    )}
                                    {feedback.suggestions && (
                                        <div>
                                            <span className="text-xs font-medium text-blue-600">Saran:</span>
                                            <p className="text-sm text-gray-700">{feedback.suggestions}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Survey List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Daftar Survey</CardTitle>
                        <CardDescription>Survey feedback yang telah dibuat</CardDescription>
                    </div>
                    <CreateSurveyButton courseId={courseId} />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {surveysResult.surveys.map((survey) => (
                            <div
                                key={survey.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Badge variant={survey.isActive ? "default" : "secondary"}>
                                        {survey.isActive ? "Aktif" : "Nonaktif"}
                                    </Badge>
                                    <div>
                                        <p className="font-medium">{survey.title}</p>
                                        <p className="text-xs text-gray-500">
                                            {survey._count.FeedbackResponse} responden
                                            {survey.CourseSession && ` • ${survey.CourseSession.title}`}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function StatCard({
    title,
    value,
    suffix = "",
    icon,
    color
}: {
    title: string
    value: number
    suffix?: string
    icon: React.ReactNode
    color: "blue" | "yellow" | "green" | "purple"
}) {
    const colorMap = {
        blue: "bg-blue-50 text-blue-600",
        yellow: "bg-yellow-50 text-yellow-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600"
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorMap[color]}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{title}</p>
                        <p className="text-2xl font-bold">
                            {value}{suffix}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function CreateSurveyButton({ courseId }: { courseId: string }) {
    return (
        <Link href={`/dashboard/instructor/${courseId}/feedback/new`}>
            <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Buat Survey
            </Button>
        </Link>
    )
}

export default async function FeedbackPage({ params }: PageProps) {
    const { courseId } = await params
    const session = await auth()

    if (!session?.user?.id) {
        return notFound()
    }

    // Verify access
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, instructorId: true }
    })

    if (!course) {
        return notFound()
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })

    if (
        course.instructorId !== session.user.id &&
        user?.role !== "SUPER_ADMIN" &&
        user?.role !== "ADMIN_UNIT"
    ) {
        return notFound()
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="mb-8">
                <Link
                    href={`/dashboard/instructor/${courseId}`}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
                >
                    ← Kembali ke Dashboard
                </Link>
                <h1 className="text-2xl font-bold">Feedback & Evaluasi</h1>
                <p className="text-gray-600">{course.title}</p>
            </div>

            <Suspense fallback={<div>Loading...</div>}>
                <FeedbackStats courseId={courseId} />
            </Suspense>
        </div>
    )
}
