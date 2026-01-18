import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function StudentsRedirect() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const { role } = session.user

    if (role === "INSTRUCTOR") {
        redirect("/dashboard/instructor/students")
    }

    if (role === "SUPER_ADMIN" || role === "ADMIN_UNIT") {
        redirect("/dashboard/admin/users")
    }

    redirect("/dashboard")
}
