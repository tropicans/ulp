"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export interface LibraryLesson {
    id: string
    title: string
    description: string | null
    contentType: string
    videoUrl: string | null
    duration: number | null
    courseId: string
    courseTitle: string
    category: string | null
}

export async function getLibraryLessons(query?: string, category?: string) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    try {
        const lessons = await prisma.lesson.findMany({
            where: {
                AND: [
                    query ? {
                        OR: [
                            { title: { contains: query, mode: "insensitive" } },
                            { description: { contains: query, mode: "insensitive" } },
                        ]
                    } : {},
                    category ? {
                        Module: {
                            Course: {
                                category: { equals: category },
                                isPublished: true
                            }
                        }
                    } : {
                        Module: {
                            Course: {
                                isPublished: true
                            }
                        }
                    },
                ]
            },
            include: {
                Module: {
                    include: {
                        Course: {
                            select: {
                                id: true,
                                title: true,
                                category: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 50
        })

        return lessons.map(l => ({
            id: l.id,
            title: l.title,
            description: l.description,
            contentType: l.contentType,
            videoUrl: l.videoUrl,
            duration: l.duration,
            courseId: l.Module.Course.id,
            courseTitle: l.Module.Course.title,
            category: l.Module.Course.category
        }))
    } catch (error) {
        console.error("Error fetching library lessons:", error)
        return []
    }
}
