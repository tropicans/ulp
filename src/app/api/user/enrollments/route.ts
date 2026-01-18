import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
    const session = await auth()

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { userId: session.user.id },
            include: {
                Course: {
                    include: {
                        Module: {
                            include: {
                                Lesson: {
                                    include: {
                                        Progress: {
                                            where: { userId: session.user.id }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { enrolledAt: "desc" }
        })

        const coursesWithProgress = enrollments.map((en) => {
            const totalLessons = en.Course.Module.reduce(
                (acc, m) => acc + m.Lesson.length,
                0
            )
            const completedLessons = en.Course.Module.reduce(
                (acc, m) =>
                    acc + m.Lesson.filter((l) => l.Progress[0]?.completedAt).length,
                0
            )
            const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            return {
                id: en.id,
                progress,
                enrolledAt: en.enrolledAt,
                Course: {
                    title: en.Course.title,
                    slug: en.Course.slug,
                    thumbnail: en.Course.thumbnail,
                    category: en.Course.category,
                    duration: en.Course.duration
                }
            }
        })

        return NextResponse.json({ courses: coursesWithProgress })
    } catch (error) {
        console.error("Enrollment API Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
