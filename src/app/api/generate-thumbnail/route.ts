import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const PROXY_BASE = "https://proxy.kelazz.my.id"
const API_KEY = "internal_only_x91aP"

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { courseTitle, courseDescription } = await request.json()

        if (!courseTitle) {
            return NextResponse.json({ error: "Course title is required" }, { status: 400 })
        }

        const prompt = `A professional, modern thumbnail image for an online course titled "${courseTitle}". ${courseDescription ? `Course is about: ${courseDescription}.` : ''} Clean, modern design with professional blue and purple gradients, abstract conceptual imagery. No text in image. High quality 16:9 aspect ratio suitable for course card display.`

        console.log("Calling Gemini 3 Pro Image Preview with input format...")
        console.log("Prompt:", prompt)

        // Use the same format as n8n - with "input" field, not "messages"
        const response = await fetch(`${PROXY_BASE}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gemini-3-pro-image-preview",
                input: prompt
            })
        })

        console.log("Response status:", response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error("API error:", errorText)

            // Provide Unsplash fallback
            const keywords = courseTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 2).join(',')
            return NextResponse.json({
                success: false,
                error: `API error: ${response.status}`,
                suggestion: `https://source.unsplash.com/1600x900/?${encodeURIComponent(keywords)},education,learning`
            })
        }

        const data = await response.json()
        console.log("API response keys:", Object.keys(data))

        // Extract image from: choices[0].message.images[0].image_url.url
        // This is a data URI like "data:image/jpeg;base64,....."
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url

        if (imageUrl) {
            console.log("Image found! Type:", imageUrl.substring(0, 30))
            return NextResponse.json({
                success: true,
                imageUrl: imageUrl
            })
        }

        // Fallback: check other possible paths
        const content = data.choices?.[0]?.message?.content
        if (content) {
            console.log("Content found, checking for URLs...")
            // Check for image URL in content
            const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)/i)
            if (urlMatch) {
                return NextResponse.json({
                    success: true,
                    imageUrl: urlMatch[0]
                })
            }

            // Check for data URL
            const dataUrlMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/i)
            if (dataUrlMatch) {
                return NextResponse.json({
                    success: true,
                    imageUrl: dataUrlMatch[0]
                })
            }
        }

        console.log("No image found in response. Full response:", JSON.stringify(data).substring(0, 1000))

        // Fallback to Unsplash
        const keywords = courseTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 2).join(',')
        return NextResponse.json({
            success: false,
            message: "Tidak dapat mengekstrak gambar dari response.",
            suggestion: `https://source.unsplash.com/1600x900/?${encodeURIComponent(keywords)},education,learning`
        })

    } catch (error) {
        console.error("Generate thumbnail error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
