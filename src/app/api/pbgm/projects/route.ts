import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createProject, getProjects } from "@/lib/actions/pbgm-project"

/**
 * POST /api/pbgm/projects
 * Create a new PBGM Project Challenge
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const body = await request.json()
        const result = await createProject(body)

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        console.error("Error in POST /api/pbgm/projects:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * GET /api/pbgm/projects
 * Get all projects for the current user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status") as any
        const limit = searchParams.get("limit")
        const offset = searchParams.get("offset")

        const result = await getProjects({
            status: status || undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        })

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error("Error in GET /api/pbgm/projects:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
