"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WblmLearningLinkType } from "@/generated/prisma";

// ============================================
// LEARNING LINK OPERATIONS
// ============================================

const createLearningLinkSchema = z.object({
    milestoneId: z.string(),
    type: z.nativeEnum(WblmLearningLinkType),
    resourceId: z.string(), // Course ID, Module ID, or Session ID
    title: z.string().min(1),
    scheduleTime: z.date().optional().nullable(),
    url: z.string().url().optional().nullable(),
    notes: z.string().optional()
});

/**
 * Create a learning link for a milestone
 * Links to existing courses, modules, sessions, or external resources
 */
export async function createWblmLearningLink(
    programId: string,
    data: z.infer<typeof createLearningLinkSchema>
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            select: { ownerUserId: true }
        });

        if (!program) {
            return { error: "Program tidak ditemukan" };
        }

        if (program.ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" };
        }

        const validatedData = createLearningLinkSchema.parse(data);

        // Verify the milestone belongs to this program
        const milestone = await prisma.wblmMilestone.findUnique({
            where: { id: validatedData.milestoneId },
            select: { programId: true }
        });

        if (!milestone || milestone.programId !== programId) {
            return { error: "Milestone tidak valid" };
        }

        // Verify resource exists based on type
        if (validatedData.type === WblmLearningLinkType.ASYNC) {
            const course = await prisma.course.findUnique({
                where: { id: validatedData.resourceId },
                select: { id: true, title: true }
            });
            if (!course) {
                return { error: "Course tidak ditemukan" };
            }
        }

        const link = await prisma.wblmLearningLink.create({
            data: {
                programId,
                milestoneId: validatedData.milestoneId,
                type: validatedData.type,
                resourceId: validatedData.resourceId,
                title: validatedData.title,
                scheduleTime: validatedData.scheduleTime,
                url: validatedData.url,
                notes: validatedData.notes
            }
        });

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`);
        return { success: true, link };
    } catch (error) {
        console.error("Error creating learning link:", error);
        return { error: "Gagal membuat learning link" };
    }
}

/**
 * Get learning links for a milestone
 */
export async function getWblmLearningLinks(milestoneId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const links = await prisma.wblmLearningLink.findMany({
            where: { milestoneId },
            orderBy: { createdAt: "asc" }
        });

        // Enrich with course/module data
        const enrichedLinks = await Promise.all(links.map(async (link) => {
            let resourceData = null;

            if (link.type === WblmLearningLinkType.ASYNC) {
                const course = await prisma.course.findUnique({
                    where: { id: link.resourceId },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        thumbnail: true,
                        deliveryMode: true
                    }
                });
                resourceData = course;
            }

            return {
                ...link,
                resource: resourceData
            };
        }));

        return enrichedLinks;
    } catch (error) {
        console.error("Error getting learning links:", error);
        return { error: "Gagal mengambil learning links" };
    }
}

/**
 * Delete a learning link
 */
export async function deleteWblmLearningLink(linkId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const link = await prisma.wblmLearningLink.findUnique({
            where: { id: linkId },
            include: {
                Milestone: {
                    include: {
                        Program: {
                            select: { ownerUserId: true, id: true }
                        }
                    }
                }
            }
        });

        if (!link) {
            return { error: "Link tidak ditemukan" };
        }

        const programId = link.Milestone.Program.id;
        const ownerUserId = link.Milestone.Program.ownerUserId;

        if (ownerUserId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses" };
        }

        await prisma.wblmLearningLink.delete({
            where: { id: linkId }
        });

        revalidatePath(`/dashboard/admin/wblm/programs/${programId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting learning link:", error);
        return { error: "Gagal menghapus learning link" };
    }
}

/**
 * Get available courses for linking
 */
export async function getAvailableCoursesForLink(searchQuery?: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const courses = await prisma.course.findMany({
            where: {
                isPublished: true,
                ...(searchQuery && {
                    OR: [
                        { title: { contains: searchQuery, mode: "insensitive" } },
                        { description: { contains: searchQuery, mode: "insensitive" } }
                    ]
                })
            },
            select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                deliveryMode: true,
                difficulty: true,
                duration: true
            },
            take: 20,
            orderBy: { title: "asc" }
        });

        return courses;
    } catch (error) {
        console.error("Error getting available courses:", error);
        return { error: "Gagal mengambil daftar course" };
    }
}
