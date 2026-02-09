import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
        return NextResponse.json({ error: "Query terlalu pendek" }, { status: 400 });
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } }
                ],
                NOT: { id: session.user.id } // Exclude current user
            },
            select: {
                id: true,
                name: true,
                email: true
            },
            take: 10
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Error searching users:", error);
        return NextResponse.json({ error: "Gagal mencari user" }, { status: 500 });
    }
}
