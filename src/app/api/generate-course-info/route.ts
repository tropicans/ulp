import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const PROXY_BASE = process.env.AI_PROXY_URL || "https://proxy.kelazz.my.id"
const API_KEY = process.env.AI_PROXY_KEY || ""
const AI_MODEL = process.env.AI_MODEL || "gpt-5.1"

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { courseId } = await request.json()

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
        }

        // Get course and its YouTube playlist ID
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                id: true,
                title: true,
                ytPlaylistId: true
            }
        })

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 })
        }

        if (!course.ytPlaylistId) {
            return NextResponse.json({
                error: "Kursus ini tidak memiliki playlist YouTube yang terhubung"
            }, { status: 400 })
        }

        // Get transcripts from YtPlaylistItem
        const playlistItems = await prisma.ytPlaylistItem.findMany({
            where: { playlistId: course.ytPlaylistId },
            select: {
                videoNo: true,
                videoTitle: true,
                transcript: true,
            },
            orderBy: { videoNo: 'asc' }
        })

        if (playlistItems.length === 0) {
            return NextResponse.json({
                error: "Tidak ada video dalam playlist ini"
            }, { status: 400 })
        }

        // Combine transcripts (limit to ~15000 chars to avoid token limit)
        const transcriptsWithContext = playlistItems
            .filter(item => item.transcript)
            .map(item => `Video ${item.videoNo}: ${item.videoTitle}\n${item.transcript}`)

        if (transcriptsWithContext.length === 0) {
            return NextResponse.json({
                error: "Tidak ada transcript tersedia untuk playlist ini"
            }, { status: 400 })
        }

        let combinedTranscript = transcriptsWithContext.join("\n\n---\n\n")
        if (combinedTranscript.length > 15000) {
            combinedTranscript = combinedTranscript.substring(0, 15000) + "..."
        }

        const prompt = `Kamu adalah ahli pembuatan konten kursus online. Berdasarkan transkrip video berikut, buatlah:

1. **Judul Kursus**: Judul yang menarik, profesional, dan mencerminkan isi kursus (maksimal 80 karakter)
2. **Deskripsi Singkat**: Ringkasan dalam 1-2 kalimat tentang kursus (maksimal 200 karakter)
3. **Deskripsi Lengkap**: Deskripsi komprehensif yang menjelaskan apa yang akan dipelajari peserta, manfaat mengikuti kursus, dan untuk siapa kursus ini cocok (200-400 kata)

Transkrip Video:
${combinedTranscript}

Berikan response dalam format JSON seperti berikut:
{
  "title": "Judul Kursus",
  "shortDesc": "Deskripsi singkat kursus dalam 1-2 kalimat",
  "description": "Deskripsi kursus yang lengkap..."
}

Pastikan:
- Gunakan Bahasa Indonesia yang baku dan profesional
- Judul harus catchy dan informatif
- Deskripsi singkat padat dan menarik
- Deskripsi lengkap harus meyakinkan dan detail
- Jawab HANYA dengan JSON, tanpa teks tambahan`

        console.log("Calling AI proxy for course info generation...")

        const response = await fetch(`${PROXY_BASE}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                input: prompt
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("AI API error:", errorText)
            return NextResponse.json({
                error: `AI service error: ${response.status}`
            }, { status: 500 })
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            return NextResponse.json({
                error: "Tidak dapat menghasilkan konten dari AI"
            }, { status: 500 })
        }

        // Parse JSON from response
        try {
            // Extract JSON from content (might have markdown code blocks)
            let jsonStr = content
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                jsonStr = jsonMatch[1]
            } else {
                // Try to find raw JSON
                const rawJsonMatch = content.match(/\{[\s\S]*\}/)
                if (rawJsonMatch) {
                    jsonStr = rawJsonMatch[0]
                }
            }

            const result = JSON.parse(jsonStr)

            return NextResponse.json({
                success: true,
                title: result.title || course.title,
                shortDesc: result.shortDesc || "",
                description: result.description || ""
            })
        } catch (parseError) {
            console.error("Failed to parse AI response:", content)
            return NextResponse.json({
                error: "Gagal memproses response dari AI"
            }, { status: 500 })
        }

    } catch (error) {
        console.error("Generate course info error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
