"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { SyncCourseConfig } from "@/lib/types/sync-course"
import { KAPData } from "@/lib/types/kap"
import { ContentType, QuestionType } from "@/generated/prisma"

// AI Proxy endpoint for generating content
const AI_PROXY_URL = process.env.AI_PROXY_URL || "https://proxy.kelazz.my.id"
const AI_PROXY_KEY = process.env.AI_PROXY_KEY || ""

/**
 * Parse KAP document text and extract structured course info
 * Uses AI to generate learning objectives and validation questions
 */
export async function parseKAPDocument(courseId: string, documentText: string): Promise<{
    success: boolean
    data?: KAPData
    error?: string
}> {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Check if user has permission (admin or instructor of this course)
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true, title: true }
    })

    if (!course) {
        return { success: false, error: "Course not found" }
    }

    if (course.instructorId !== session.user.id &&
        session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "ADMIN_UNIT") {
        return { success: false, error: "Forbidden" }
    }

    try {
        // Use AI to parse KAP document and generate structured data
        const prompt = `Anda adalah ahli kurikulum yang menganalisis dokumen KAP (Kerangka Acuan Program/Pelatihan) dari instansi pemerintah Indonesia.

DOKUMEN KAP:
"""
${documentText.substring(0, 12000)}
"""

TUGAS:
Ekstrak informasi dari dokumen KAP. Perhatikan bagian-bagian standar dalam KAP:

PENTING - IDENTIFIKASI BAGIAN DOKUMEN:
1. "Nama Program" / "Nama Pelatihan" / "Nama Diklat" → courseTitle
2. "Deskripsi Program" / "Latar Belakang" → courseDescription  
3. "Tujuan Program" / "Tujuan Pelatihan" → learningObjectives
4. "Model Pembelajaran" / "Moda" → deliveryMode
5. "Total JP" / "Jumlah Jam Pelajaran" / "Durasi" → duration (angka saja, dalam jam)
6. "Struktur Mata Pelatihan" / "Kurikulum" / "Materi Pokok" → modules (array mata pelajaran)

RULES:
- duration: Ekstrak angka dari "Total JP" (misalnya "4 JP" → 4)
- modules: Setiap "Mata Pelatihan" di Struktur jadi 1 module dengan lesson di dalamnya
- Untuk Sync Course, biasanya cukup 1 module dengan beberapa lesson berdasarkan materi

Return JSON:
{
    "courseTitle": "Nama lengkap pelatihan",
    "courseDescription": "Ringkasan sangat singkat (1-2 kalimat) untuk hero section",
    "courseFullDescription": "Deskripsi lengkap dan detail (2-3 paragraf) berdasarkan Latar Belakang dan Tujuan",
    "deliveryMode": "SYNC_ONLINE",
    "duration": 4,
    "advanceOrganizer": {
        "title": "Persiapan Pembelajaran",
        "content": "<p>Ringkasan materi:</p><ul><li>Poin 1</li><li>Poin 2</li></ul> (Wajib gunakan format LIST/BULLET)"
    },
    "learningObjectives": ["Tujuan 1", "Tujuan 2"],
    "modules": [
        {
            "title": "Materi Utama",
            "lessons": ["Lesson 1 dari struktur", "Lesson 2 dari struktur"]
        }
    ],
    "conceptValidationQuestions": [
        {
            "id": "q1",
            "text": "Pertanyaan?",
            "options": [
                {"id": "q1a", "text": "Opsi A"},
                {"id": "q1b", "text": "Opsi B (benar)"},
                {"id": "q1c", "text": "Opsi C"},
                {"id": "q1d", "text": "Opsi D"}
            ],
            "correctOptionId": "q1b"
        }
    ]
}

Buat 3-5 soal validasi konsep.
HANYA RETURN JSON VALID, TANPA TEKS TAMBAHAN.`

        // Use AbortController for timeout
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout

        console.log(`[KAP Parser] Calling AI at ${AI_PROXY_URL}/v1/chat/completions with model gpt-5`)

        const response = await fetch(`${AI_PROXY_URL}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AI_PROXY_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-5",
                messages: [
                    { role: "system", content: "You are a curriculum designer expert that extracts and generates learning content from course documents." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 4000
            }),
            signal: controller.signal
        })

        clearTimeout(timeout)

        if (!response.ok) {
            // Log the actual error for debugging
            const errorText = await response.text().catch(() => "Could not read error")
            console.error("[KAP Parser] AI request failed:", response.status, response.statusText, errorText)
            console.warn("[KAP Parser] AI unavailable, using fallback parser")
            return {
                success: true,
                data: generateFallbackKAPData(documentText, course.title)
            }
        }

        const aiResult = await response.json()
        const content = aiResult.choices?.[0]?.message?.content

        if (!content) {
            return {
                success: true,
                data: generateFallbackKAPData(documentText, course.title)
            }
        }

        // Parse the JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            return {
                success: true,
                data: generateFallbackKAPData(documentText, course.title)
            }
        }

        const parsedData = JSON.parse(jsonMatch[0]) as KAPData
        return { success: true, data: parsedData }

    } catch (error: any) {
        console.error("[KAP Parser] Error:", error.message || error)
        if (error.cause) {
            console.error("[KAP Parser] Cause:", error.cause)
        }
        return {
            success: true,
            data: generateFallbackKAPData(documentText, course.title)
        }
    }
}

/**
 * Fallback parser when AI is unavailable
 */
function generateFallbackKAPData(documentText: string, courseTitle: string): KAPData {
    // Extract some basic info from the text
    const lines = documentText.split('\n').filter(l => l.trim())
    const title = lines[0] || courseTitle

    // Try to detect delivery mode from keywords
    const lowerText = documentText.toLowerCase()
    let detectedMode: "SYNC_ONLINE" | "ASYNC_ONLINE" | "ON_CLASSROOM" | "HYBRID" = "SYNC_ONLINE"

    if (lowerText.includes("tatap muka") || lowerText.includes("kelas") || lowerText.includes("ruang")) {
        detectedMode = "ON_CLASSROOM"
    } else if (lowerText.includes("blended") || lowerText.includes("hybrid") || lowerText.includes("kombinasi")) {
        detectedMode = "HYBRID"
    } else if (lowerText.includes("mandiri") || lowerText.includes("asinkron") || lowerText.includes("e-learning")) {
        detectedMode = "ASYNC_ONLINE"
    }

    return {
        courseTitle: title,
        courseDescription: `Ringkasan pembelajaran untuk ${title}`,
        courseFullDescription: `Pembelajaran mendalam mengenai ${title} yang mencakup berbagai aspek penting sesuai dengan standar kurikulum.`,
        deliveryMode: detectedMode,
        duration: 2, // Default 2 JP
        advanceOrganizer: {
            title: "Persiapan Pembelajaran",
            content: `<p>Selamat datang di sesi pembelajaran <strong>${title}</strong>.</p>
                <p>Sebelum mengikuti sesi live, pahami terlebih dahulu:</p>
                <ul>
                    <li>Tujuan pembelajaran dari sesi ini</li>
                    <li>Konsep-konsep kunci yang akan dibahas</li>
                    <li>Bagaimana menghubungkan materi dengan pengetahuan yang sudah dimiliki</li>
                </ul>`
        },
        learningObjectives: [
            "Memahami konsep dasar yang akan disampaikan",
            "Mengidentifikasi poin-poin penting selama sesi",
            "Menghubungkan materi dengan konteks pekerjaan"
        ],
        modules: [
            {
                title: "Materi Pembelajaran",
                lessons: ["Sesi Live YouTube"]
            }
        ],
        conceptValidationQuestions: [
            {
                id: "q1",
                text: "Apa yang menjadi fokus utama dari sesi pembelajaran ini?",
                options: [
                    { id: "q1a", text: "Penguasaan teknis operasional" },
                    { id: "q1b", text: "Pemahaman konseptual dan kerangka berpikir" },
                    { id: "q1c", text: "Praktik langsung di lapangan" },
                    { id: "q1d", text: "Penilaian kinerja individu" }
                ],
                correctOptionId: "q1b"
            },
            {
                id: "q2",
                text: "Bagaimana cara terbaik untuk mengaplikasikan pengetahuan dari sesi ini?",
                options: [
                    { id: "q2a", text: "Menghafal semua materi presentasi" },
                    { id: "q2b", text: "Menghubungkan konsep dengan konteks pekerjaan sehari-hari" },
                    { id: "q2c", text: "Mengabaikan dan fokus pada tugas rutin" },
                    { id: "q2d", text: "Menunggu instruksi lebih lanjut dari atasan" }
                ],
                correctOptionId: "q2b"
            }
        ]
    }
}

/**
 * Apply parsed KAP data to sync course config
 */
export async function applyKAPToSyncCourse(
    courseId: string,
    kapData: KAPData,
    youtubeStreamUrl: string
): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const syncConfig: SyncCourseConfig = {
            advanceOrganizer: kapData.advanceOrganizer,
            learningFocus: kapData.learningObjectives,
            youtubeStreamUrl: youtubeStreamUrl,
            conceptValidation: {
                questions: kapData.conceptValidationQuestions
            }
        }

        const course = await prisma.course.update({
            where: { id: courseId },
            data: {
                title: kapData.courseTitle,
                courseShortDesc: kapData.courseDescription,
                courseDesc: kapData.courseFullDescription,
                syncConfig: syncConfig as any,
                deliveryMode: "SYNC_ONLINE"
            },
            select: { slug: true }
        })

        revalidatePath(`/courses`)
        revalidatePath(`/courses/${course.slug}`)
        revalidatePath(`/courses/${course.slug}/sync/live`)
        revalidatePath(`/courses/${course.slug}/sync/pre-learning`)
        revalidatePath(`/courses/${course.slug}/sync/validation`)
        revalidatePath(`/dashboard/instructor`)

        return { success: true }
    } catch (error: any) {
        console.error("[KAP] Error applying to course:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Parse KAP document text WITHOUT needing an existing course
 * For creating new courses from KAP
 */
export async function parseKAPText(documentText: string): Promise<{
    success: boolean
    data?: KAPData
    error?: string
}> {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Only instructors and admins can create courses
    if (session.user.role === "LEARNER") {
        return { success: false, error: "Forbidden" }
    }

    try {
        const prompt = `Anda adalah ahli kurikulum yang menganalisis dokumen KAP (Kerangka Acuan Program/Pelatihan) dari instansi pemerintah Indonesia.

DOKUMEN KAP:
"""
${documentText.substring(0, 12000)}
"""

TUGAS:
Ekstrak informasi dari dokumen KAP:

1. "Nama Program" / "Nama Pelatihan" → courseTitle
2. "Deskripsi Program" / "Latar Belakang" → courseDescription  
3. "Tujuan Program" → learningObjectives
4. "Model Pembelajaran" → deliveryMode (SYNC_ONLINE/ASYNC_ONLINE/ON_CLASSROOM/HYBRID)
5. "Total JP" / "Durasi" → duration (angka jam saja)
6. "Struktur Mata Pelatihan" → modules (array)

Return JSON:
{
    "courseTitle": "Nama lengkap pelatihan",
    "courseDescription": "Ringkasan sangat singkat (1-2 kalimat) untuk hero section",
    "courseFullDescription": "Deskripsi lengkap dan detail (2-3 paragraf) berdasarkan Latar Belakang dan Tujuan",
    "deliveryMode": "SYNC_ONLINE",
    "duration": 4,
    "advanceOrganizer": {
        "title": "Persiapan Pembelajaran",
        "content": "<p>Ringkasan materi:</p><ul><li>Poin 1</li><li>Poin 2</li></ul> (Wajib gunakan format LIST/BULLET)"
    },
    "learningObjectives": ["Tujuan 1", "Tujuan 2"],
    "modules": [
        {
            "title": "Materi Utama",
            "lessons": ["Lesson 1", "Lesson 2"]
        }
    ],
    "conceptValidationQuestions": [
        {
            "id": "q1",
            "text": "Pertanyaan post-test?",
            "options": [
                {"id": "q1a", "text": "Opsi A"},
                {"id": "q1b", "text": "Opsi B (benar)"},
                {"id": "q1c", "text": "Opsi C"},
                {"id": "q1d", "text": "Opsi D"}
            ],
            "correctOptionId": "q1b"
        }
    ]
}

Buat 3-5 soal post-test berdasarkan materi.
HANYA RETURN JSON VALID.`

        const response = await fetch(`${AI_PROXY_URL}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AI_PROXY_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-5",
                messages: [
                    { role: "system", content: "You are a curriculum designer expert that extracts and generates learning content from course documents." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Could not read error")
            console.error("[KAP Parser] AI request failed:", response.status, response.statusText, errorText)
            console.warn("[KAP Parser] AI unavailable, using fallback parser")
            return {
                success: true,
                data: generateFallbackKAPData(documentText, "Sync Course Baru")
            }
        }

        const aiResult = await response.json()
        const content = aiResult.choices?.[0]?.message?.content

        if (!content) {
            return {
                success: true,
                data: generateFallbackKAPData(documentText, "Sync Course Baru")
            }
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            return {
                success: true,
                data: generateFallbackKAPData(documentText, "Sync Course Baru")
            }
        }

        const parsedData = JSON.parse(jsonMatch[0]) as KAPData
        return { success: true, data: parsedData }

    } catch (error: any) {
        console.error("[KAP Parser] Error:", error)
        return {
            success: true,
            data: generateFallbackKAPData(documentText, "Sync Course Baru")
        }
    }
}

/**
 * Create a NEW Sync Course from KAP data
 */
export async function createSyncCourseFromKAP(
    kapData: KAPData,
    youtubeStreamUrl: string,
    overrideDeliveryMode?: "SYNC_ONLINE" | "ASYNC_ONLINE" | "ON_CLASSROOM" | "HYBRID"
): Promise<{ success: boolean; courseId?: string; slug?: string; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Only instructors and admins can create courses
    if (session.user.role === "LEARNER") {
        return { success: false, error: "Forbidden" }
    }

    // Use override if provided, otherwise use AI-detected mode
    const finalDeliveryMode = overrideDeliveryMode || kapData.deliveryMode

    try {
        const syncConfig: SyncCourseConfig = {
            advanceOrganizer: kapData.advanceOrganizer,
            learningFocus: kapData.learningObjectives,
            youtubeStreamUrl: youtubeStreamUrl,
            conceptValidation: {
                questions: kapData.conceptValidationQuestions
            }
        }

        // Generate unique ID and slug
        const courseId = `course_${Date.now()}`
        const baseSlug = kapData.courseTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50)
        const slug = `${baseSlug}-${Date.now().toString(36)}`

        // Helper function to strip HTML tags
        const stripHtml = (html: string | undefined): string => {
            if (!html) return ''
            return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
        }

        // Only include syncConfig for sync courses
        const courseData: any = {
            id: courseId,
            title: kapData.courseTitle,
            slug: slug,
            // Short description: plain text summary from AI
            courseShortDesc: stripHtml(kapData.courseDescription)?.substring(0, 500),
            // Full description: full detailed text from AI
            courseDesc: kapData.courseFullDescription,
            // Legacy description field for backward compatibility
            description: stripHtml(kapData.courseDescription)?.substring(0, 200),
            // Outcomes: format with bullet points for display
            outcomes: kapData.learningObjectives?.map(obj => `• ${obj}`).join('\n') || '',
            requirements: 'Akses internet dan perangkat untuk mengikuti sesi live',
            deliveryMode: finalDeliveryMode,
            difficulty: "BEGINNER",
            duration: kapData.duration || 2, // Duration from KAP (JP)
            category: "pintar-bersama", // Default category for sync courses
            instructorId: session.user.id,
            updatedAt: new Date(),
            isPublished: false, // Draft by default
            tags: [finalDeliveryMode.toLowerCase().replace('_', '-')]
        }

        // Add sync config only for online modes that support YouTube
        if (finalDeliveryMode === "SYNC_ONLINE" || finalDeliveryMode === "HYBRID") {
            courseData.syncConfig = syncConfig as any
        }

        const course = await prisma.course.create({
            data: courseData
        })

        // Create single module with YouTube Live lesson for sync courses
        // All topics are covered in one live session, so we only need 1 video
        const moduleId = `mod_${Date.now()}`
        const firstModuleId = moduleId

        await prisma.module.create({
            data: {
                id: moduleId,
                title: kapData.courseTitle,
                courseId: course.id,
                order: 1,
                updatedAt: new Date(),
                Lesson: {
                    create: {
                        id: `lesson_${Date.now()}`,
                        title: "Sesi Live",
                        order: 1,
                        contentType: ContentType.VIDEO,
                        content: youtubeStreamUrl,
                        videoUrl: youtubeStreamUrl,
                        duration: (kapData.duration || 2) * 60, // JP to minutes
                        updatedAt: new Date()
                    }
                }
            }
        })

        // Create post-test quiz from conceptValidationQuestions
        if (kapData.conceptValidationQuestions && kapData.conceptValidationQuestions.length > 0 && firstModuleId) {
            const quizId = `quiz_${Date.now()}`
            await prisma.quiz.create({
                data: {
                    id: quizId,
                    title: `Post-Test: ${kapData.courseTitle}`,
                    moduleId: firstModuleId,
                    type: "QUIZ",
                    passingScore: 70,
                    timeLimit: 30,
                    updatedAt: new Date(),
                    Question: {
                        create: kapData.conceptValidationQuestions.map((q, index) => ({
                            id: `question_${Date.now()}_${index}`,
                            text: q.text,
                            type: QuestionType.MULTIPLE_CHOICE,
                            order: index + 1,
                            points: 10,
                            options: q.options.map(opt => opt.text)
                        }))
                    }
                }
            })
        }

        revalidatePath(`/courses`)
        revalidatePath(`/dashboard/instructor`)

        console.log(`[KAP] Created new sync course: ${course.id} - ${course.title} with ${kapData.modules?.length || 0} modules and ${kapData.conceptValidationQuestions?.length || 0} quiz questions`)
        return { success: true, courseId: course.id, slug: course.slug }
    } catch (error: any) {
        console.error("[KAP] Error creating course:", error)
        return { success: false, error: error.message }
    }
}
