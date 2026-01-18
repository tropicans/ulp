import { SiteHeader } from "@/components/navigation/site-header"

export default function CoursesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
            <SiteHeader />
            <main>{children}</main>
        </div>
    )
}
