import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { moduleId, courseId } = body

        // Get course with modules and lessons
        let courseFilter = courseId ? { id: courseId } : undefined
        let moduleFilter = moduleId ? { id: moduleId } : undefined

        if (!courseId && !moduleId) {
            return NextResponse.json({ error: "courseId atau moduleId diperlukan" }, { status: 400 })
        }

        // Get lessons with their ytVideoId
        const lessons = await prisma.lesson.findMany({
            where: moduleId ? { moduleId } : {
                Module: { courseId }
            },
            include: {
                Module: {
                    include: {
                        Course: {
                            select: { instructorId: true, ytPlaylistId: true }
                        }
                    }
                }
            }
        })

        if (lessons.length === 0) {
            return NextResponse.json({ error: "Tidak ada lesson ditemukan" }, { status: 404 })
        }

        // Check authorization using first lesson's course
        const course = lessons[0].Module.Course
        if (course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role as string)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        if (!course.ytPlaylistId) {
            return NextResponse.json({ error: "Kursus tidak memiliki playlist YouTube" }, { status: 400 })
        }

        // Get all refined titles from YtPlaylistItem
        const ytItems = await prisma.ytPlaylistItem.findMany({
            where: { playlistId: course.ytPlaylistId },
            select: { videoId: true, refinedTitle: true, videoNo: true }
        })

        // Create map of videoId -> refinedTitle
        const refinedTitleMap: Record<string, string> = {}
        ytItems.forEach(item => {
            if (item.refinedTitle) {
                refinedTitleMap[item.videoId] = item.refinedTitle
            }
        })

        // Sync lessons with refined titles
        const results = []
        for (const lesson of lessons) {
            if (lesson.ytVideoId && refinedTitleMap[lesson.ytVideoId]) {
                const newTitle = refinedTitleMap[lesson.ytVideoId]
                if (lesson.title !== newTitle) {
                    await prisma.lesson.update({
                        where: { id: lesson.id },
                        data: { title: newTitle }
                    })
                    results.push({
                        lessonId: lesson.id,
                        oldTitle: lesson.title,
                        newTitle
                    })
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Berhasil sinkronisasi ${results.length} judul lesson`,
            synced: results.length,
            total: lessons.length,
            results
        })

    } catch (error) {
        console.error("Sync lesson titles error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
