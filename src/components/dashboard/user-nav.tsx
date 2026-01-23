"use client"

import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
    User,
    Settings,
    LogOut,
    Award,
    Bell,
    History as HistoryIcon
} from "lucide-react"
import Link from "next/link"
import type { Role } from "@/generated/prisma"

interface UserNavProps {
    user: {
        id: string
        name: string
        email: string
        image?: string | null
        role: Role
        nip?: string | null
        unitKerja?: string | null
    }
}

export function UserNav({ user }: UserNavProps) {
    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    const roleLabels: Record<Role, string> = {
        SUPER_ADMIN: "Super Admin",
        ADMIN_UNIT: "Admin Unit",
        INSTRUCTOR: "Fasilitator",
        LEARNER: "Peserta",
    }

    const roleColors: Record<Role, string> = {
        SUPER_ADMIN: "bg-red-500/20 text-red-400 border-red-500/30",
        ADMIN_UNIT: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        INSTRUCTOR: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        LEARNER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    }

    return (
        <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                <Bell className="w-5 h-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10 ring-2 ring-slate-200 dark:ring-slate-700">
                            <AvatarImage src={user.image || undefined} alt={user.name} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" align="end">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                                <Badge variant="outline" className={roleColors[user.role]}>
                                    {roleLabels[user.role]}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                            {user.nip && (
                                <p className="text-xs text-slate-400 dark:text-slate-500">NIP: {user.nip}</p>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                    <DropdownMenuItem asChild className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <Link href="/dashboard/profile" className="flex items-center w-full">
                            <User className="mr-2 h-4 w-4" />
                            Profil Saya
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <Link href="/dashboard/learner/journey" className="flex items-center w-full">
                            <HistoryIcon className="mr-2 h-4 w-4" />
                            Jejak Belajar
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <Link href="/dashboard/learner/certificates" className="flex items-center w-full">
                            <Award className="mr-2 h-4 w-4" />
                            Sertifikat
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <Link href="/dashboard/reports" className="flex items-center w-full">
                            <Settings className="mr-2 h-4 w-4" />
                            Laporan & Statistik
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                    <DropdownMenuItem
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                        onClick={() => signOut({ callbackUrl: "/" })}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Keluar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
