import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const PROXY_BASE = process.env.AI_PROXY_URL || "https://proxy.kelazz.my.id"
const API_KEY = process.env.AI_PROXY_KEY || ""
const AI_MODEL = process.env.AI_MODEL || "gpt-5.1"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { moduleId } = body

        if (!moduleId) {
            return NextResponse.json({ error: "moduleId diperlukan" }, { status: 400 })
        }

        // Get module with course info
        const module = await prisma.module.findUnique({
            where: { id: moduleId },
            include: {
                Course: {
                    select: { instructorId: true, ytPlaylistId: true }
                }
            }
        })

        if (!module) {
            return NextResponse.json({ error: "Module tidak ditemukan" }, { status: 404 })
        }

        // Check authorization
        if (module.Course.instructorId !== session.user.id &&
            !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role as string)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        if (!module.Course.ytPlaylistId) {
            return NextResponse.json({ error: "Kursus tidak memiliki playlist YouTube" }, { status: 400 })
        }

        // Get all transcripts for this playlist
        const playlistItems = await prisma.ytPlaylistItem.findMany({
            where: { playlistId: module.Course.ytPlaylistId },
            orderBy: { videoNo: 'asc' },
            select: { id: true, videoNo: true, transcript: true, videoTitle: true }
        })

        if (playlistItems.length === 0) {
            return NextResponse.json({ error: "Tidak ada video dalam playlist" }, { status: 400 })
        }

        // Generate refined titles for each playlist item
        const results = []
        for (const item of playlistItems) {
            if (item.transcript) {
                const refinedTitle = await generateRefinedTitle(item.videoTitle || '', item.transcript)
                if (refinedTitle) {
                    await prisma.ytPlaylistItem.update({
                        where: { id: item.id },
                        data: {
                            refinedTitle: refinedTitle,
                            hasRefinedTitle: true
                        }
                    })
                    results.push({ videoNo: item.videoNo, oldTitle: item.videoTitle, newTitle: refinedTitle })
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Berhasil memperhalus ${results.length} judul di YtPlaylistItem`,
            results
        })

    } catch (error) {
        console.error("Refine lesson title error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

async function generateRefinedTitle(currentTitle: string, transcript: string): Promise<string | null> {
    try {
        // Limit transcript to first 3000 characters
        const truncatedTranscript = transcript.slice(0, 3000)

        const prompt = `Berdasarkan transkrip video berikut, buatkan judul lesson yang lebih baik dan profesional dalam bahasa Indonesia.

Judul saat ini: "${currentTitle}"

Transkrip:
${truncatedTranscript}

Persyaratan judul baru:
1. Maksimal 60 karakter
2. Jelas dan deskriptif tentang isi materi
3. Menggunakan bahasa Indonesia yang baik dan benar
4. Tidak menggunakan kata-kata clickbait
5. Fokus pada poin pembelajaran utama dari video

Berikan HANYA judul baru (tanpa tanda kutip, tanpa penjelasan). Jangan awali dengan angka/nomor.`

        const response = await fetch(`${PROXY_BASE}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                input: prompt,
                max_tokens: 100,
                temperature: 0.7
            })
        })

        if (!response.ok) {
            console.error("AI API error:", response.status)
            return null
        }

        const data = await response.json()

        // Handle different response formats
        let content = ""
        if (data.output) {
            content = data.output
        } else if (data.choices?.[0]?.message?.content) {
            content = data.choices[0].message.content
        } else if (data.choices?.[0]?.text) {
            content = data.choices[0].text
        }

        // Clean up the response
        const refinedTitle = content
            .trim()
            .replace(/^["']|["']$/g, '') // Remove quotes
            .replace(/^\d+\.\s*/, '') // Remove leading numbers
            .slice(0, 100) // Limit length

        return refinedTitle || null

    } catch (error) {
        console.error("Generate refined title error:", error)
        return null
    }
}
