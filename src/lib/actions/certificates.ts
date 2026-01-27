"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { revalidatePath } from "next/cache"
import QRCode from "qrcode"
import {
    queueStatement,
    recordActivity,
    buildActor,
    buildActivity
} from "@/lib/xapi"
import { genIdempotencyKey } from "@/lib/xapi/utils"
import { VERBS, ACTIVITY_TYPES, PLATFORM_IRI } from "@/lib/xapi/verbs"
import { XAPIStatement } from "@/lib/xapi/types"

/**
 * Generate a certificate for a user completing a course
 */
export async function generateCourseCertificate(courseId: string) {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    try {
        // 1. Verify 100% completion
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                Module: {
                    include: {
                        Lesson: {
                            include: {
                                Progress: { where: { userId: session.user.id } }
                            }
                        },
                        Quiz: {
                            include: {
                                QuizAttempt: {
                                    where: { userId: session.user.id, isPassed: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!course) return { error: "Course not found" }

        const allLessons = course.Module.flatMap(m => m.Lesson)
        const completedLessons = allLessons.filter(l => l.Progress.length > 0 && l.Progress[0].isCompleted)

        // Check if everything is done
        if (completedLessons.length < allLessons.length) {
            return { error: "Course not yet fully completed" }
        }

        // 2. Create Certificate record if not exists
        const existing = await prisma.certificate.findFirst({
            where: { userId: session.user.id, courseId }
        })

        if (existing) return { success: true, certificateId: existing.id }

        const certificateId = crypto.randomUUID()
        const certificateNo = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        const verificationCode = crypto.randomUUID().substring(0, 8).toUpperCase()

        const certificate = await prisma.certificate.create({
            data: {
                id: certificateId,
                userId: session.user.id,
                courseId,
                certificateNo,
                verificationCode,
                isValid: true,
                issuedAt: new Date(),
            }
        })

        // 3. Send xAPI statement for certificate earned
        if (session.user.email) {
            const statement: XAPIStatement = {
                actor: buildActor(session.user.email, session.user.name),
                verb: VERBS.earned,
                object: buildActivity(
                    `${PLATFORM_IRI}/certificates/${certificate.id}`,
                    ACTIVITY_TYPES.certificate,
                    `Certificate: ${course.title}`
                ),
                result: {
                    completion: true,
                    extensions: {
                        "https://TITAN.setneg.go.id/xapi/extensions/certificate-no": certificateNo,
                        "https://TITAN.setneg.go.id/xapi/extensions/verification-code": verificationCode
                    }
                },
                context: {
                    contextActivities: {
                        parent: [{
                            id: `${PLATFORM_IRI}/courses/${course.slug}`,
                            definition: {
                                type: ACTIVITY_TYPES.course,
                                name: { id: course.title }
                            }
                        }]
                    }
                }
            }

            queueStatement(
                statement,
                genIdempotencyKey("certificate_earned", session.user.id, courseId)
            )

            // Record to unified journey
            recordActivity(
                session.user.id,
                "CERTIFICATE",
                certificateId,
                `Certificate: ${course.title}`,
                courseId,
                { certificateNo, verificationCode }
            )
        }

        return { success: true, certificateId: certificate.id }
    } catch (error) {
        console.error("Error generating certificate:", error)
        return { error: "Failed to create certificate record" }
    }
}

/**
 * Download certificate as PDF
 */
export async function downloadCertificatePDF(certificateId: string) {
    try {
        const cert = await prisma.certificate.findUnique({
            where: { id: certificateId },
            include: {
                User: true,
                Course: {
                    include: { User: true } // Instructor
                }
            }
        })

        if (!cert) throw new Error("Certificate not found")

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([842, 595]) // A4 Landscape
        const { width, height } = page.getSize()

        // Load fonts
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Background and Frame
        page.drawRectangle({
            x: 20,
            y: 20,
            width: width - 40,
            height: height - 40,
            borderWidth: 2,
            borderColor: rgb(0.1, 0.2, 0.4),
        })

        // Header
        page.drawText("SERTIFIKAT KELULUSAN", {
            x: width / 2 - 150,
            y: height - 100,
            size: 30,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
        })

        page.drawText("Diberikan Kepada:", {
            x: width / 2 - 60,
            y: height - 160,
            size: 14,
            font: helvetica,
        })

        // Student Name
        const userName = cert.User.name || "Peserta"
        const nameWidth = helveticaBold.widthOfTextAtSize(userName.toUpperCase(), 36)
        page.drawText(userName.toUpperCase(), {
            x: width / 2 - nameWidth / 2,
            y: height - 210,
            size: 36,
            font: helveticaBold,
        })

        page.drawText("Atas penyelesaian yang luar biasa pada kursus:", {
            x: width / 2 - 140,
            y: height - 260,
            size: 14,
            font: helvetica,
        })

        // Course Title
        const courseWidth = helveticaBold.widthOfTextAtSize(cert.Course.title, 24)
        page.drawText(cert.Course.title, {
            x: width / 2 - courseWidth / 2,
            y: height - 300,
            size: 24,
            font: helveticaBold,
            color: rgb(0.2, 0.3, 0.6),
        })

        page.drawText(`Diterbitkan pada: ${cert.issuedAt.toLocaleDateString('id-ID')}`, {
            x: width / 2 - 80,
            y: height - 340,
            size: 12,
            font: helvetica,
        })

        // QR Code for verification
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${cert.verificationCode}`
        const qrBuffer = await QRCode.toBuffer(verificationUrl)
        const qrImage = await pdfDoc.embedPng(qrBuffer)

        page.drawImage(qrImage, {
            x: width - 150,
            y: 50,
            width: 100,
            height: 100,
        })

        page.drawText(`No: ${cert.certificateNo}`, {
            x: width - 150,
            y: 40,
            size: 8,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5)
        })

        // Signature Placeholder
        page.drawText("Instruktur Pengampu", {
            x: 100,
            y: 70,
            size: 12,
            font: helveticaBold,
        })
        page.drawText(cert.Course.User.name || "Instruktur", {
            x: 100,
            y: 55,
            size: 12,
            font: helvetica,
        })

        // Serialize the PDFDocument to bytes (base64)
        const pdfBase64 = await pdfDoc.saveAsBase64()
        return { pdfBase64 }
    } catch (error) {
        console.error("Error generating PDF:", error)
        return { error: "Failed to generate PDF" }
    }
}

/**
 * Verify a certificate
 */
export async function verifyCertificate(code: string) {
    try {
        const cert = await prisma.certificate.findUnique({
            where: { verificationCode: code },
            include: {
                User: { select: { name: true, unitKerja: true } },
                Course: { select: { title: true } }
            }
        })

        if (!cert || !cert.isValid) return { error: "Sertifikat tidak valid atau tidak ditemukan." }

        return { success: true, cert }
    } catch (error) {
        return { error: "Gagal memverifikasi sertifikat." }
    }
}
