import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    nip: z.string().min(1),
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { name, email, password, nip } = registerSchema.parse(body)

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { nip }
                ]
            }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "Email atau NIP sudah terdaftar" },
                { status: 400 }
            )
        }

        const hashedPassword = await hash(password, 12)

        const user = await prisma.user.create({
            data: {
                id: crypto.randomUUID(),
                name,
                email,
                password: hashedPassword,
                nip,
                role: "LEARNER", // Default role
                status: "ACTIVE",
                updatedAt: new Date()
            },
        })

        return NextResponse.json(
            { message: "Registrasi berhasil", userId: user.id },
            { status: 201 }
        )
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 })
    }
}
