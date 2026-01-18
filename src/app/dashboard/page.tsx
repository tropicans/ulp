import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const { user } = session

    // Role-based dashboard redirection
    if (user.role === "LEARNER") {
        redirect("/dashboard/learner")
    }

    if (user.role === "INSTRUCTOR") {
        redirect("/dashboard/instructor")
    }

    if (user.role === "ADMIN_UNIT") {
        redirect("/dashboard/admin")
    }

    if (user.role === "SUPER_ADMIN") {
        redirect("/dashboard/admin")
    }

    // Fallback ke learner dashboard
    redirect("/dashboard/learner")
}
