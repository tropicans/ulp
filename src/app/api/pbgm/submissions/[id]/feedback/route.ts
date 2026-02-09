import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { addFeedback, getSubmissionFeedback } from "@/lib/actions/pbgm-feedback"

/**
 * POST /api/pbgm/submissions/[id]/feedback
 * Add expert feedback to a submission
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

        const { id: submissionId } = await params
        const body = await request.json()
        const result = await addFeedback(submissionId, body)

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        console.error("Error in POST /api/pbgm/submissions/[id]/feedback:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * GET /api/pbgm/submissions/[id]/feedback
 * Get feedback for a submission
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

        const { id: submissionId } = await params
        const result = await getSubmissionFeedback(submissionId)

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({ feedback: result })
    } catch (error) {
        console.error("Error in GET /api/pbgm/submissions/[id]/feedback:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
