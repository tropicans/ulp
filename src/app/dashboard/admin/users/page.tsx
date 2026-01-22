"use client"

import { useState, useEffect } from "react"
import { getUsers, updateUserRole, updateUserStatus } from "@/lib/actions/admin"
import { Role, UserStatus } from "@/generated/prisma"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
    Search,
    MoreHorizontal,
    Shield,
    UserX,
    UserCheck,
    Mail,
    Filter,
    Users,
} from "lucide-react"
import { toast } from "sonner"

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchUsers()
    }, [search])

    async function fetchUsers() {
        setIsLoading(true)
        const result = await getUsers({ search })
        if (result.users) {
            setUsers(result.users)
        }
        setIsLoading(false)
    }

    const handleRoleUpdate = async (userId: string, role: Role) => {
        const result = await updateUserRole(userId, role)
        if (result.success) {
            toast.success("Role updated successfully")
            fetchUsers()
        } else {
            toast.error(result.error || "Failed to update role")
        }
    }

    const handleStatusUpdate = async (userId: string, status: UserStatus) => {
        const result = await updateUserStatus(userId, status)
        if (result.success) {
            toast.success("Status updated successfully")
            fetchUsers()
        } else {
            toast.error(result.error || "Failed to update status")
        }
    }

    const getStatusBadge = (status: UserStatus) => {
        switch (status) {
            case "ACTIVE": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
            case "INACTIVE": return <Badge variant="outline" className="text-slate-400">Inactive</Badge>
            case "SUSPENDED": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Suspended</Badge>
            default: return null
        }
    }

    const getRoleBadge = (role: Role) => {
        switch (role) {
            case "SUPER_ADMIN": return <Badge className="bg-purple-600 text-white border-none">Super Admin</Badge>
            case "ADMIN_UNIT": return <Badge className="bg-blue-600 text-white border-none">Admin Unit</Badge>
            case "INSTRUCTOR": return <Badge className="bg-orange-500 text-white border-none">Instructor</Badge>
            case "LEARNER": return <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700">Learner</Badge>
            default: return null
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-8 h-8 text-blue-400" />
                        Manajemen User
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola hak akses dan status pengguna di seluruh platform</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                        placeholder="Cari nama, email, atau NIP..."
                        className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-100 dark:bg-slate-950/50">
                        <TableRow className="border-slate-200 dark:border-slate-800">
                            <TableHead className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">User</TableHead>
                            <TableHead className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Unit Kerja</TableHead>
                            <TableHead className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Role</TableHead>
                            <TableHead className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
                            <TableHead className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i} className="border-slate-200 dark:border-slate-800 animate-pulse">
                                    <TableCell colSpan={5} className="py-8 text-center bg-slate-100 dark:bg-slate-900/20" />
                                </TableRow>
                            ))
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-20 text-center text-slate-500 italic">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    Tidak ada pengguna ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/20 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar name={user.name} image={user.image} className="w-10 h-10 ring-1 ring-slate-200 dark:ring-slate-800" />
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500 dark:text-slate-400 italic">
                                        {user.unitKerja || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {getRoleBadge(user.role)}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(user.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                                <DropdownMenuLabel>Aksi Pengguna</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-slate-800" />

                                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-2 py-1.5">Ubah Role</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "LEARNER")}>
                                                    Jadikan Learner
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "INSTRUCTOR")}>
                                                    Jadikan Instructor
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "ADMIN_UNIT")}>
                                                    Jadikan Admin Unit
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator className="bg-slate-800" />
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-2 py-1.5">Status Kontrol</DropdownMenuLabel>
                                                {user.status === "ACTIVE" ? (
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusUpdate(user.id, "SUSPENDED")}
                                                        className="text-red-400 focus:text-red-400"
                                                    >
                                                        <UserX className="w-4 h-4 mr-2" />
                                                        Suspend User
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusUpdate(user.id, "ACTIVE")}
                                                        className="text-green-400 focus:text-green-400"
                                                    >
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        Aktifkan User
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
