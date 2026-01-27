import { redirect } from "next/navigation"

// Redirect to unified instructor dashboard
export default function CoursesPage() {
    redirect("/dashboard/instructor")
}
