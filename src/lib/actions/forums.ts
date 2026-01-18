"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createAuditLog } from "./admin"

/**
 * Get all forums (Admin or Course related)
 */
export async function getForums() {
    try {
        const forums = await prisma.forum.findMany({
            include: {
                Course: {
                    select: { title: true, slug: true }
                },
                _count: {
                    select: { ForumPost: true }
                }
            }
        })
        return { forums }
    } catch (error) {
        return { error: "Failed to fetch forums" }
    }
}

/**
 * Get Forum with Posts
 */
export async function getForumPosts(forumId: string) {
    try {
        const forum = await prisma.forum.findUnique({
            where: { id: forumId },
            include: {
                ForumPost: {
                    include: {
                        User: {
                            select: { name: true, image: true }
                        },
                        _count: {
                            select: { ForumComment: true }
                        }
                    },
                    orderBy: [
                        { isPinned: "desc" },
                        { createdAt: "desc" }
                    ]
                }
            }
        })
        return { forum }
    } catch (error) {
        return { error: "Failed to fetch posts" }
    }
}

/**
 * Create Post
 */
export async function createPost(forumId: string, title: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const post = await prisma.forumPost.create({
            data: {
                id: crypto.randomUUID(),
                forumId,
                userId: session.user.id,
                title,
                content,
                updatedAt: new Date()
            }
        })

        revalidatePath(`/dashboard/forums/${forumId}`)
        return { success: true, post }
    } catch (error) {
        return { error: "Failed to create post" }
    }
}

/**
 * Get Post with Comments
 */
export async function getPostDetail(postId: string) {
    try {
        const post = await prisma.forumPost.findUnique({
            where: { id: postId },
            include: {
                User: {
                    select: { name: true, image: true, unitKerja: true }
                },
                Forum: {
                    select: { title: true, id: true }
                },
                ForumComment: {
                    include: {
                        User: {
                            select: { name: true, image: true, unitKerja: true }
                        }
                    },
                    orderBy: { createdAt: "asc" }
                }
            }
        })
        return { post }
    } catch (error) {
        return { error: "Failed to fetch post detail" }
    }
}

/**
 * Add Comment
 */
export async function addComment(postId: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const comment = await prisma.forumComment.create({
            data: {
                id: crypto.randomUUID(),
                postId,
                userId: session.user.id,
                content,
                updatedAt: new Date()
            }
        })

        revalidatePath(`/dashboard/forums/posts/${postId}`)
        return { success: true, comment }
    } catch (error) {
        return { error: "Failed to add comment" }
    }
}

/**
 * Pin/Lock Post (Moderator/Admin)
 */
export async function moderatePost(postId: string, data: { isPinned?: boolean, isLocked?: boolean }) {
    const session = await auth()
    if (!session || !["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const post = await prisma.forumPost.update({
            where: { id: postId },
            data: {
                ...data,
                updatedAt: new Date()
            }
        })

        await createAuditLog({
            action: data.isPinned !== undefined ? "PIN_POST" : "LOCK_POST",
            entity: "ForumPost",
            entityId: postId,
            details: data
        })

        revalidatePath(`/dashboard/forums/posts/${postId}`)
        return { success: true, post }
    } catch (error) {
        return { error: "Failed to update post" }
    }
}
