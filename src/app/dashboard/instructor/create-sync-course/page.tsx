import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { CreateSyncCourseForm } from "@/components/sync-course/create-sync-course-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function CreateSyncCoursePage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    // Only instructors and admins can create courses
    if (session.user.role === "LEARNER") {
        redirect("/dashboard/learner")
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Header */}
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard/instructor">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Link>
                </Button>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                        Buat Sync Course Baru
                    </h1>
                    <p className="text-slate-500">
                        Upload dokumen KAP untuk membuat course sinkronus dengan YouTube Live
                    </p>
                </div>

                <CreateSyncCourseForm />
            </main>
        </div>
    )
}
