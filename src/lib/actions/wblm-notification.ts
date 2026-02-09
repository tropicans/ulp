"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import {
    WblmProgramStatus,
    WblmMilestoneStatus,
    WblmEnrollmentStatus,
    WblmReviewDecision
} from "@/generated/prisma";

// ============================================
// WBLM NOTIFICATION TYPES
// ============================================

type WblmNotificationType =
    | "WBLM_PROGRAM_ENROLLMENT"
    | "WBLM_PROGRAM_STARTED"
    | "WBLM_MILESTONE_DUE_REMINDER"
    | "WBLM_SUBMISSION_RECEIVED"
    | "WBLM_REVIEW_COMPLETED"
    | "WBLM_REVISION_REQUESTED"
    | "WBLM_MILESTONE_APPROVED"
    | "WBLM_PROGRAM_COMPLETED"
    | "WBLM_REVIEW_ASSIGNMENT";

interface WblmNotificationData {
    userId: string;
    type: WblmNotificationType;
    programId?: string;
    programTitle?: string;
    milestoneId?: string;
    milestoneName?: string;
    submissionId?: string;
    reviewerName?: string;
    participantName?: string;
    dueDate?: Date;
    decision?: WblmReviewDecision;
}

// ============================================
// NOTIFICATION HELPER
// ============================================

/**
 * Create a WBLM notification
 */
export async function createWblmNotification(data: WblmNotificationData) {
    try {
        const { userId, type, ...metadata } = data;

        let title = "";
        let message = "";
        let link = "";

        switch (type) {
            case "WBLM_PROGRAM_ENROLLMENT":
                title = "Pendaftaran WBLM Berhasil";
                message = `Anda telah terdaftar di program "${metadata.programTitle}"`;
                link = `/dashboard/wblm/programs/${metadata.programId}`;
                break;

            case "WBLM_PROGRAM_STARTED":
                title = "Program WBLM Dimulai";
                message = `Program "${metadata.programTitle}" telah dimulai`;
                link = `/dashboard/wblm/programs/${metadata.programId}`;
                break;

            case "WBLM_MILESTONE_DUE_REMINDER":
                title = "Pengingat Deadline Milestone";
                message = `Milestone "${metadata.milestoneName}" akan berakhir pada ${metadata.dueDate?.toLocaleDateString('id-ID')}`;
                link = `/dashboard/wblm/programs/${metadata.programId}/milestones/${metadata.milestoneId}`;
                break;

            case "WBLM_SUBMISSION_RECEIVED":
                title = "Submisi Diterima";
                message = `Submisi "${metadata.participantName}" untuk milestone "${metadata.milestoneName}" telah diterima`;
                link = `/dashboard/wblm/review/${metadata.submissionId}`;
                break;

            case "WBLM_REVIEW_COMPLETED":
                title = "Review Selesai";
                message = `Submisi Anda untuk milestone "${metadata.milestoneName}" telah direview oleh ${metadata.reviewerName}`;
                link = `/dashboard/wblm/programs/${metadata.programId}/milestones/${metadata.milestoneId}`;
                break;

            case "WBLM_REVISION_REQUESTED":
                title = "Revisi Diperlukan";
                message = `Revisi diperlukan untuk submisi Anda pada milestone "${metadata.milestoneName}"`;
                link = `/dashboard/wblm/programs/${metadata.programId}/milestones/${metadata.milestoneId}`;
                break;

            case "WBLM_MILESTONE_APPROVED":
                title = "Milestone Disetujui";
                message = `Selamat! Milestone "${metadata.milestoneName}" telah disetujui`;
                link = `/dashboard/wblm/programs/${metadata.programId}`;
                break;

            case "WBLM_PROGRAM_COMPLETED":
                title = "Program WBLM Selesai";
                message = `Selamat! Anda telah menyelesaikan program "${metadata.programTitle}"`;
                link = `/dashboard/wblm/programs/${metadata.programId}/evidence`;
                break;

            case "WBLM_REVIEW_ASSIGNMENT":
                title = "Tugas Review Baru";
                message = `Anda ditugaskan untuk mereview submisi dari ${metadata.participantName}`;
                link = `/dashboard/wblm/reviewer`;
                break;

            default:
                return { error: "Tipe notifikasi tidak valid" };
        }

        await prisma.notification.create({
            data: {
                id: randomUUID(),
                userId,
                type: "SYSTEM", // Using existing notification type
                title,
                message,
                link
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error creating WBLM notification:", error);
        return { error: "Gagal membuat notifikasi" };
    }
}

/**
 * Notify participants when a program starts
 */
export async function notifyProgramStart(programId: string) {
    try {
        const program = await prisma.wblmProgram.findUnique({
            where: { id: programId },
            include: {
                Enrollments: {
                    where: {
                        status: { in: [WblmEnrollmentStatus.ENROLLED, WblmEnrollmentStatus.ACTIVE] }
                    },
                    select: { participantUserId: true }
                }
            }
        });

        if (!program) {
            return { error: "Program tidak ditemukan" };
        }

        const notifications = program.Enrollments.map(enrollment =>
            createWblmNotification({
                userId: enrollment.participantUserId,
                type: "WBLM_PROGRAM_STARTED",
                programId: program.id,
                programTitle: program.title
            })
        );

        await Promise.all(notifications);
        return { success: true, count: notifications.length };
    } catch (error) {
        console.error("Error notifying program start:", error);
        return { error: "Gagal mengirim notifikasi" };
    }
}

/**
 * Notify reviewers when a submission is made
 */
export async function notifySubmissionReceived(submissionId: string) {
    try {
        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: submissionId },
            include: {
                Participant: { select: { name: true } },
                Milestone: {
                    include: {
                        Program: {
                            include: {
                                ReviewAssignments: {
                                    where: { milestoneId: null }, // Program-level reviewers
                                    select: { reviewerUserId: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!submission) {
            return { error: "Submisi tidak ditemukan" };
        }

        const reviewers = submission.Milestone.Program.ReviewAssignments;
        const notifications = reviewers.map(reviewer =>
            createWblmNotification({
                userId: reviewer.reviewerUserId,
                type: "WBLM_SUBMISSION_RECEIVED",
                submissionId: submission.id,
                milestoneId: submission.milestoneId,
                milestoneName: submission.Milestone.name,
                participantName: submission.Participant.name || "Unknown"
            })
        );

        await Promise.all(notifications);
        return { success: true, count: notifications.length };
    } catch (error) {
        console.error("Error notifying submission received:", error);
        return { error: "Gagal mengirim notifikasi" };
    }
}

/**
 * Notify participant when review is completed
 */
export async function notifyReviewCompleted(
    submissionId: string,
    reviewerUserId: string,
    decision: WblmReviewDecision
) {
    try {
        const submission = await prisma.wblmSubmission.findUnique({
            where: { id: submissionId },
            include: {
                Milestone: {
                    include: { Program: true }
                }
            }
        });

        if (!submission) {
            return { error: "Submisi tidak ditemukan" };
        }

        const reviewer = await prisma.user.findUnique({
            where: { id: reviewerUserId },
            select: { name: true }
        });

        const notificationType: WblmNotificationType =
            decision === WblmReviewDecision.ACCEPT
                ? "WBLM_MILESTONE_APPROVED"
                : decision === WblmReviewDecision.REQUEST_REVISION
                    ? "WBLM_REVISION_REQUESTED"
                    : "WBLM_REVIEW_COMPLETED";

        await createWblmNotification({
            userId: submission.participantUserId,
            type: notificationType,
            programId: submission.Milestone.programId,
            programTitle: submission.Milestone.Program.title,
            milestoneId: submission.milestoneId,
            milestoneName: submission.Milestone.name,
            reviewerName: reviewer?.name || "Reviewer",
            decision
        });

        return { success: true };
    } catch (error) {
        console.error("Error notifying review completed:", error);
        return { error: "Gagal mengirim notifikasi" };
    }
}

/**
 * Send milestone due reminders (to be called by a scheduled job)
 */
export async function sendMilestoneDueReminders(daysBeforeDue: number = 3) {
    try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysBeforeDue);

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const milestones = await prisma.wblmMilestone.findMany({
            where: {
                dueDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                Program: {
                    status: WblmProgramStatus.RUNNING
                }
            },
            include: {
                Program: {
                    include: {
                        Enrollments: {
                            where: {
                                status: WblmEnrollmentStatus.ACTIVE
                            },
                            select: { participantUserId: true }
                        }
                    }
                },
                ParticipantMilestones: {
                    where: {
                        status: {
                            notIn: [WblmMilestoneStatus.APPROVED_FINAL, WblmMilestoneStatus.LOCKED]
                        }
                    },
                    select: { participantId: true }
                }
            }
        });

        let count = 0;
        for (const milestone of milestones) {
            const pendingParticipants = milestone.ParticipantMilestones.map(pm => pm.participantId);

            for (const participantId of pendingParticipants) {
                await createWblmNotification({
                    userId: participantId,
                    type: "WBLM_MILESTONE_DUE_REMINDER",
                    programId: milestone.programId,
                    programTitle: milestone.Program.title,
                    milestoneId: milestone.id,
                    milestoneName: milestone.name,
                    dueDate: milestone.dueDate!
                });
                count++;
            }
        }

        return { success: true, count };
    } catch (error) {
        console.error("Error sending milestone reminders:", error);
        return { error: "Gagal mengirim pengingat" };
    }
}
