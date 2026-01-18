"use client"

import { useState, useEffect } from "react"
import { getInstructorStudents } from "@/lib/actions/instructor"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Users, Search, Mail, Building2, BookOpen, GraduationCap } from "lucide-react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

export default function InstructorStudentsPage() {
    const [students, setStudents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchStudents()
    }, [])

    async function fetchStudents() {
        setIsLoading(true)
        const result = await getInstructorStudents()
        if (result.students) {
            setStudents(result.students)
        }
        setIsLoading(false)
    }

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.unitKerja?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-500" />
                        Daftar Peserta Diklat
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola dan pantau seluruh peserta yang mengikuti kursus Anda</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                        placeholder="Cari nama, email, atau unit..."
                        className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-11 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur shadow-2xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-100 dark:bg-slate-950/50">
                        <TableRow className="border-slate-200 dark:border-slate-800">
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Nama Peserta</TableHead>
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Unit Kerja</TableHead>
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Kursus Diikuti</TableHead>
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Terdaftar Sejak</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i} className="border-slate-200 dark:border-slate-800 animate-pulse">
                                    <TableCell colSpan={4} className="py-8 bg-slate-100 dark:bg-slate-900/10" />
                                </TableRow>
                            ))
                        ) : filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="py-32 text-center text-slate-500 italic">
                                    <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                    Peserta tidak ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-all group">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar name={student.name} image={student.image} className="w-10 h-10 ring-1 ring-slate-200 dark:ring-slate-800" />
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{student.name}</div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    {student.email}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                            <Building2 className="w-3.5 h-3.5 text-slate-600" />
                                            {student.unitKerja || "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            {student.courses.map((c: any, idx: number) => (
                                                <Badge key={idx} variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20 text-[9px] uppercase font-black tracking-tighter">
                                                    {c.courseTitle}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs font-medium">
                                        {format(new Date(student.courses[0].enrolledAt), "d MMM yyyy", { locale: localeId })}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
