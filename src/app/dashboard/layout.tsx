import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/navigation/site-header"

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen">
            <SiteHeader />

            {/* Main Content */}
            <main>{children}</main>
        </div>
    )
}
