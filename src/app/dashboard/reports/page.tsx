import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ReportsRedirect() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const { role } = session.user

    if (role === "INSTRUCTOR") {
        redirect("/dashboard/instructor/reports")
    }

    if (role === "SUPER_ADMIN" || role === "ADMIN_UNIT") {
        redirect("/dashboard/admin/reports")
    }

    redirect("/dashboard")
}
