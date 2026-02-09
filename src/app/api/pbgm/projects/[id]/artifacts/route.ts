import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadArtifact, getArtifacts } from "@/lib/actions/pbgm-artifact"

/**
 * POST /api/pbgm/projects/[id]/artifacts
 * Upload a new artifact (versioned)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const { id: projectId } = await params
        const body = await request.json()
        const result = await uploadArtifact(projectId, body)

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        console.error("Error in POST /api/pbgm/projects/[id]/artifacts:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * GET /api/pbgm/projects/[id]/artifacts
 * Get all artifacts for a project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const { id: projectId } = await params
        const result = await getArtifacts(projectId)

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({ artifacts: result })
    } catch (error) {
        console.error("Error in GET /api/pbgm/projects/[id]/artifacts:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
