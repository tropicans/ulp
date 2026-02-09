import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { finalizeProject, canFinalizeProject } from "@/lib/actions/pbgm-finalize"

/**
 * POST /api/pbgm/projects/[id]/finalize
 * Finalize a project (requires reflection)
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
        const result = await finalizeProject(projectId)

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error("Error in POST /api/pbgm/projects/[id]/finalize:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * GET /api/pbgm/projects/[id]/finalize
 * Check if project can be finalized
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
        const result = await canFinalizeProject(projectId)

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error("Error in GET /api/pbgm/projects/[id]/finalize:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
