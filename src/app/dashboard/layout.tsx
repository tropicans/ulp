import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/navigation/site-header"
import { prisma } from "@/lib/db"

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Check if verification is required
    const setting = await prisma.systemSetting.findUnique({
        where: { key: "require_email_verification" }
    })

    const requireVerification = setting?.value === "true"

    if (requireVerification) {
        // Check if user is verified (either email OR phone)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { emailVerified: true, phoneVerified: true }
        })

        // User must have at least one verification method completed
        if (!user?.emailVerified && !user?.phoneVerified) {
            redirect("/verify")
        }
    }

    return (
        <div className="min-h-screen">
            <SiteHeader />

            {/* Main Content */}
            <main>{children}</main>
        </div>
    )
}
