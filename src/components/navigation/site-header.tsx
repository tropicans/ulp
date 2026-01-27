"use client";

import Link from "next/link"
import { UserNav } from "@/components/dashboard/user-nav"
import type { Role } from "@/generated/prisma"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { ThemeToggle } from "./theme-toggle"

export function SiteHeader() {
    const { data: session } = useSession()
    const user = session?.user

    // Role-based navigation
    const getNavigationByRole = (role?: string) => {
        const baseNav = [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Katalog Kursus", href: "/courses" },
        ]

        if (!role) return baseNav

        if (role === "LEARNER") {
            return [
                ...baseNav,
                { label: "Kursus Saya", href: "/dashboard/learner/my-courses" },
                { label: "Jadwal", href: "/dashboard/learner/schedule" },
                { label: "Sertifikat", href: "/dashboard/learner/certificates" },
                { label: "Jejak Belajar", href: "/dashboard/learner/journey" },
                { label: "Ala Carte", href: "/dashboard/learner/library" },
            ]
        }

        if (role === "INSTRUCTOR") {
            return [
                ...baseNav,
                { label: "Kelola Kursus", href: "/dashboard/courses" },
                { label: "Peserta", href: "/dashboard/instructor/students" },
                { label: "Laporan", href: "/dashboard/instructor/reports" },
            ]
        }

        if (role === "ADMIN_UNIT") {
            return [
                ...baseNav,
                { label: "Kelola Kursus", href: "/dashboard/courses" },
                { label: "Kelola User", href: "/dashboard/admin/users" },
                { label: "Laporan", href: "/dashboard/admin/reports" },
                { label: "Settings", href: "/dashboard/admin/settings" },
            ]
        }

        if (role === "SUPER_ADMIN") {
            return [
                ...baseNav,
                { label: "Semua Kursus", href: "/dashboard/courses" },
                { label: "Semua User", href: "/dashboard/admin/users" },
                { label: "Analytics", href: "/dashboard/admin/analytics" },
                { label: "Settings", href: "/dashboard/admin/settings" },
            ]
        }

        return baseNav
    }

    const navigation = getNavigationByRole(user?.role as string)

    return (
        <header className="sticky top-0 z-50 w-full px-4 py-4">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="container mx-auto px-6 py-3 flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md shadow-2xl shadow-black/5 dark:shadow-black/20 transition-colors duration-500"
            >
                <Link href="/" className="flex items-center gap-3 group">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center justify-center w-10 h-10"
                    >
                        <img
                            src="/logo.png"
                            alt="TITAN Logo"
                            width={40}
                            height={40}
                            className="object-contain"
                        />
                    </motion.div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white">
                        TITAN
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    {navigation.map((item, index) => (
                        <motion.div
                            key={item.href}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                        >
                            <Link
                                href={item.href}
                                className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative group"
                            >
                                {item.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 dark:bg-blue-500 transition-all group-hover:w-full" />
                            </Link>
                        </motion.div>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {user ? (
                        <UserNav user={user as any} />
                    ) : (
                        <Link href="/login">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                            >
                                Login
                            </motion.button>
                        </Link>
                    )}
                </div>
            </motion.div>
        </header>
    )
}
