import { NextResponse } from "next/server"

const PROXY_BASE = process.env.AI_PROXY_URL || "https://proxy.kelazz.my.id"
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || "http://localhost:11434"
const MINIO_ENDPOINT = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || ""
const LRS_ENDPOINT = process.env.LRS_ENDPOINT || ""
const N8N_WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || ""
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ""
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ""

interface IntegrationStatus {
    id: string
    name: string
    description: string
    status: "connected" | "error" | "not_configured" | "checking"
    message?: string
}

// Helper function for retry with exponential backoff
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
    baseDelay = 1000
): Promise<Response | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 8000)

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                cache: "no-store"
            })

            clearTimeout(timeout)

            if (response.ok || response.status < 500) {
                return response
            }

            // Server error, retry after delay
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt) // 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        } catch (error) {
            console.error(`Fetch attempt ${attempt + 1} failed:`, error)
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }
    return null
}

async function checkProxy(): Promise<IntegrationStatus> {
    try {
        // Try health endpoint with retry
        const response = await fetchWithRetry(`${PROXY_BASE}/health`, {
            method: "GET",
        }, 3, 1000)

        if (response && response.ok) {
            return {
                id: "proxy",
                name: "AI Proxy",
                description: "Gateway untuk AI services (proxy.kelazz.my.id)",
                status: "connected",
                message: "Terkoneksi"
            }
        }

        // Try base URL as fallback
        const altResponse = await fetchWithRetry(PROXY_BASE, {
            method: "HEAD",
        }, 2, 500)

        if (altResponse && (altResponse.ok || altResponse.status < 500)) {
            return {
                id: "proxy",
                name: "AI Proxy",
                description: "Gateway untuk AI services (proxy.kelazz.my.id)",
                status: "connected",
                message: "Terkoneksi"
            }
        }

        return {
            id: "proxy",
            name: "AI Proxy",
            description: "Gateway untuk AI services (proxy.kelazz.my.id)",
            status: "error",
            message: "Tidak dapat terhubung setelah beberapa percobaan"
        }
    } catch (error) {
        return {
            id: "proxy",
            name: "AI Proxy",
            description: "Gateway untuk AI services (proxy.kelazz.my.id)",
            status: "error",
            message: error instanceof Error ? error.message : "Connection failed"
        }
    }
}

async function checkYouTube(): Promise<IntegrationStatus> {
    if (!YOUTUBE_API_KEY) {
        return {
            id: "youtube",
            name: "YouTube API",
            description: "Import playlist dan metadata video",
            status: "not_configured",
            message: "API key belum dikonfigurasi"
        }
    }

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${YOUTUBE_API_KEY}`,
            {
                signal: controller.signal,
                cache: "no-store",
                headers: {
                    "Accept": "application/json"
                }
            }
        ).catch((err) => {
            console.error("YouTube fetch error:", err)
            return null
        })

        clearTimeout(timeout)

        if (response && response.ok) {
            return {
                id: "youtube",
                name: "YouTube API",
                description: "Import playlist dan metadata video",
                status: "connected",
                message: "Terkoneksi"
            }
        }

        const errorText = response ? await response.text().catch(() => "") : ""
        console.error("YouTube API error:", response?.status, errorText)

        return {
            id: "youtube",
            name: "YouTube API",
            description: "Import playlist dan metadata video",
            status: "error",
            message: response ? `HTTP ${response.status}` : "Connection timeout"
        }
    } catch (error) {
        console.error("YouTube check exception:", error)
        return {
            id: "youtube",
            name: "YouTube API",
            description: "Import playlist dan metadata video",
            status: "error",
            message: error instanceof Error ? error.message : "Connection failed"
        }
    }
}

async function checkOllama(): Promise<IntegrationStatus> {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${OLLAMA_URL}/api/tags`, {
            signal: controller.signal
        }).catch(() => null)

        clearTimeout(timeout)

        if (response && response.ok) {
            return {
                id: "ollama",
                name: "Ollama AI (Local LLM)",
                description: "Generate konten dengan model lokal",
                status: "connected",
                message: "Terkoneksi"
            }
        }

        return {
            id: "ollama",
            name: "Ollama AI (Local LLM)",
            description: "Generate konten dengan model lokal",
            status: "error",
            message: "Tidak dapat terhubung ke Ollama"
        }
    } catch (error) {
        return {
            id: "ollama",
            name: "Ollama AI (Local LLM)",
            description: "Generate konten dengan model lokal",
            status: "error",
            message: error instanceof Error ? error.message : "Connection failed"
        }
    }
}

async function checkElevenLabs(): Promise<IntegrationStatus> {
    if (!ELEVENLABS_API_KEY) {
        return {
            id: "elevenlabs",
            name: "ElevenLabs",
            description: "Text-to-speech dan voice synthesis",
            status: "not_configured",
            message: "API key belum dikonfigurasi"
        }
    }

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const response = await fetch("https://api.elevenlabs.io/v1/user", {
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY
            },
            signal: controller.signal
        }).catch(() => null)

        clearTimeout(timeout)

        if (response && response.ok) {
            return {
                id: "elevenlabs",
                name: "ElevenLabs",
                description: "Text-to-speech dan voice synthesis",
                status: "connected",
                message: "Terkoneksi"
            }
        }

        return {
            id: "elevenlabs",
            name: "ElevenLabs",
            description: "Text-to-speech dan voice synthesis",
            status: "error",
            message: response ? `HTTP ${response.status}` : "Connection failed"
        }
    } catch (error) {
        return {
            id: "elevenlabs",
            name: "ElevenLabs",
            description: "Text-to-speech dan voice synthesis",
            status: "error",
            message: error instanceof Error ? error.message : "Connection failed"
        }
    }
}

async function checkxAPILRS(): Promise<IntegrationStatus> {
    if (!LRS_ENDPOINT) {
        return {
            id: "xapi",
            name: "xAPI LRS",
            description: "Learning Record Store untuk analytics",
            status: "not_configured",
            message: "Endpoint belum dikonfigurasi"
        }
    }

    try {
        // Remove /xapi/statements suffix to get base URL for health check
        const baseEndpoint = LRS_ENDPOINT.replace(/\/xapi\/statements$/, "")

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${baseEndpoint}/xapi/about`, {
            signal: controller.signal
        }).catch(() => null)

        clearTimeout(timeout)

        if (response && response.ok) {
            return {
                id: "xapi",
                name: "xAPI LRS",
                description: "Learning Record Store untuk analytics",
                status: "connected",
                message: "Terkoneksi"
            }
        }

        return {
            id: "xapi",
            name: "xAPI LRS",
            description: "Learning Record Store untuk analytics",
            status: "error",
            message: "Tidak dapat terhubung"
        }
    } catch (error) {
        return {
            id: "xapi",
            name: "xAPI LRS",
            description: "Learning Record Store untuk analytics",
            status: "error",
            message: error instanceof Error ? error.message : "Connection failed"
        }
    }
}

async function checkMinIO(): Promise<IntegrationStatus> {
    if (!MINIO_ENDPOINT) {
        return {
            id: "minio",
            name: "MinIO / S3 Storage",
            description: "Object storage untuk file dan media",
            status: "not_configured",
            message: "Endpoint belum dikonfigurasi"
        }
    }

    try {
        // Normalize endpoint - always use http for internal docker network
        let endpoint = MINIO_ENDPOINT
        if (!endpoint.startsWith("http")) {
            endpoint = `http://${endpoint}`
        }
        // Replace localhost with container name for Docker internal networking
        endpoint = endpoint.replace("localhost:9000", "lxp-minio:9000")

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${endpoint}/minio/health/live`, {
            signal: controller.signal
        }).catch(() => null)

        clearTimeout(timeout)

        if (response && response.ok) {
            return {
                id: "minio",
                name: "MinIO / S3 Storage",
                description: "Object storage untuk file dan media",
                status: "connected",
                message: "Terkoneksi"
            }
        }

        return {
            id: "minio",
            name: "MinIO / S3 Storage",
            description: "Object storage untuk file dan media",
            status: "error",
            message: "Tidak dapat terhubung"
        }
    } catch (error) {
        return {
            id: "minio",
            name: "MinIO / S3 Storage",
            description: "Object storage untuk file dan media",
            status: "error",
            message: error instanceof Error ? error.message : "Connection failed"
        }
    }
}

async function checkN8n(): Promise<IntegrationStatus> {
    if (!N8N_WEBHOOK_URL) {
        return {
            id: "n8n",
            name: "n8n Automation",
            description: "Workflow automation dan webhooks",
            status: "not_configured",
            message: "Webhook URL belum dikonfigurasi"
        }
    }

    // n8n webhooks don't have a health endpoint, so we just check if configured
    return {
        id: "n8n",
        name: "n8n Automation",
        description: "Workflow automation dan webhooks",
        status: "connected",
        message: "Terkonfigurasi"
    }
}

export async function GET() {
    try {
        const results = await Promise.all([
            checkYouTube(),
            checkOllama(),
            checkElevenLabs(),
            checkxAPILRS(),
            checkMinIO(),
            checkN8n(),
            checkProxy(),
        ])

        return NextResponse.json({
            success: true,
            integrations: results,
            checkedAt: new Date().toISOString()
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to check integrations"
        }, { status: 500 })
    }
}
