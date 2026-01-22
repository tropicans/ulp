/**
 * Fonnte WhatsApp Service
 * Service for sending WhatsApp notifications via Fonnte API
 * Docs: https://fonnte.com/api
 */

interface SendWhatsAppOptions {
    phone: string
    message: string
    delay?: number
}

interface FonnteResponse {
    status: boolean
    message: string
    detail?: string
}

/**
 * Send WhatsApp message via Fonnte API
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<FonnteResponse> {
    const { phone, message, delay = 0 } = options

    const apiKey = process.env.FONNTE_API_KEY

    if (!apiKey) {
        console.error("FONNTE_API_KEY not configured")
        return { status: false, message: "WhatsApp API not configured" }
    }

    // Format phone number (remove +, spaces, dashes)
    const formattedPhone = formatPhoneNumber(phone)

    if (!formattedPhone) {
        return { status: false, message: "Invalid phone number" }
    }

    try {
        const response = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
                "Authorization": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                target: formattedPhone,
                message: message,
                delay: delay,
            }),
        })

        const data = await response.json() as FonnteResponse

        if (!data.status) {
            console.error("Fonnte error:", data)
        }

        return data
    } catch (error) {
        console.error("WhatsApp send error:", error)
        return { status: false, message: "Failed to send WhatsApp message" }
    }
}

/**
 * Format phone number for Indonesian format
 * Converts various formats to 62xxxxxxxxxx
 */
function formatPhoneNumber(phone: string): string | null {
    if (!phone) return null

    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "")

    // Handle different formats
    if (cleaned.startsWith("0")) {
        cleaned = "62" + cleaned.slice(1)
    } else if (cleaned.startsWith("8")) {
        cleaned = "62" + cleaned
    } else if (cleaned.startsWith("+62")) {
        cleaned = cleaned.slice(1)
    } else if (!cleaned.startsWith("62")) {
        cleaned = "62" + cleaned
    }

    // Validate minimum length (62 + 9-12 digits)
    if (cleaned.length < 11 || cleaned.length > 15) {
        return null
    }

    return cleaned
}

/**
 * Send bulk WhatsApp messages
 */
export async function sendBulkWhatsApp(
    messages: { phone: string; message: string }[]
): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const msg of messages) {
        const result = await sendWhatsApp({ phone: msg.phone, message: msg.message, delay: 1 })
        if (result.status) {
            success++
        } else {
            failed++
        }
        // Add small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    return { success, failed }
}

// ============================================
// Notification Templates
// ============================================

export const WhatsAppTemplates = {
    sessionReminder: (data: {
        userName: string
        courseTitle: string
        sessionTitle: string
        sessionDate: string
        sessionTime: string
        location: string
    }) => `Halo ${data.userName}! 👋

📚 *Pengingat Sesi Pelatihan*

Kursus: *${data.courseTitle}*
Sesi: ${data.sessionTitle}
📅 Tanggal: ${data.sessionDate}
⏰ Waktu: ${data.sessionTime}
📍 Lokasi: ${data.location}

Jangan lupa hadir tepat waktu ya! 
Semangat belajar! 🚀

_TITIAN_`,

    enrollmentConfirmation: (data: {
        userName: string
        courseTitle: string
        startDate: string
    }) => `Halo ${data.userName}! 🎉

Selamat! Anda berhasil terdaftar di kursus:

📚 *${data.courseTitle}*
📅 Mulai: ${data.startDate}

Silakan akses dashboard untuk melihat materi pembelajaran.

Selamat belajar! 🚀

_TITIAN_`,

    certificateReady: (data: {
        userName: string
        courseTitle: string
        certificateUrl: string
    }) => `Halo ${data.userName}! 🎓

Selamat! Sertifikat Anda sudah tersedia:

📚 *${data.courseTitle}*

Unduh sertifikat Anda di:
${data.certificateUrl}

Terus semangat belajar! 🚀

_TITIAN_`,

    deadlineReminder: (data: {
        userName: string
        taskTitle: string
        deadline: string
        courseTitle: string
    }) => `Halo ${data.userName}! ⏰

*Pengingat Deadline!*

📝 Tugas: ${data.taskTitle}
📚 Kursus: ${data.courseTitle}
⏰ Deadline: *${data.deadline}*

Segera selesaikan tugas Anda!

_TITIAN_`,
}
