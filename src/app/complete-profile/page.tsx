import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CompleteProfileForm } from "@/components/auth/complete-profile-form"
import { SiteHeader } from "@/components/navigation/site-header"

export default async function CompleteProfilePage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // If profile is already complete, redirect to dashboard
    if (session.user.unitKerja) {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <SiteHeader />
            <main className="flex-1 flex items-center justify-center p-4">
                <CompleteProfileForm
                    user={{
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.name,
                        image: session.user.image,
                    }}
                />
            </main>
        </div>
    )
}
