"use client"

import { useState, useEffect } from "react"
import { getAdminReports } from "@/lib/actions/reports"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    BarChart3,
    Layers,
    Download,
    FileText,
    Filter,
    Table as TableIcon,
    PieChart,
    ChevronRight,
    Search
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

export default function AdminReportsPage() {
    const [data, setData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchReports()
    }, [])

    async function fetchReports() {
        setIsLoading(true)
        const result = await getAdminReports()
        if (result.latestEnrollments) {
            setData(result)
        }
        setIsLoading(false)
    }

    if (isLoading) return <div className="p-12 animate-pulse bg-white dark:bg-slate-900 min-h-screen" />

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-green-500" />
                        Laporan & Rekapitulasi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data operasional dan efektivitas pembelajaran</p>
                </div>
                {/* Export Placeholder */}
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none h-11 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition-all">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button className="flex-1 md:flex-none h-11 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all">
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-4">
                        <PieChart className="w-8 h-8 text-blue-500" />
                    </div>
                    <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Kategori Terpopuler</h4>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{data?.categoryDistribution?.[0]?.category || "Belum ada data"}</p>
                </Card>

                <Card className="lg:col-span-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white text-sm font-bold flex items-center gap-2">
                            <Layers className="w-4 h-4 text-green-500" /> Distribusi Kategori Kursus
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-10 py-4">
                            {data?.categoryDistribution?.map((item: any, i: number) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{item._count._all}</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.category}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                            <TableIcon className="w-5 h-5 text-blue-500" /> Pendaftaran Terbaru
                        </CardTitle>
                        <CardDescription className="text-slate-500 italic mt-1">Menampilkan 100 transaksi pendaftaran terakhir</CardDescription>
                    </div>
                    <div className="relative w-64 hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input className="w-full pl-9 pr-4 h-9 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white" placeholder="Filter cepat..." />
                    </div>
                </CardHeader>
                <Table>
                    <TableHeader className="bg-slate-100 dark:bg-slate-950/20">
                        <TableRow className="border-slate-200 dark:border-slate-800">
                            <TableHead className="text-slate-500 font-bold uppercase text-[9px] py-4">Waktu</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[9px] py-4">Nama Peserta</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[9px] py-4">Unit Kerja</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[9px] py-4">Mata Diklat</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[9px] py-4 text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.latestEnrollments?.map((row: any) => (
                            <TableRow key={row.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/20 transition-all">
                                <TableCell className="text-[10px] font-mono text-slate-500">
                                    {format(new Date(row.enrolledAt), "dd/MM/yy HH:mm")}
                                </TableCell>
                                <TableCell className="font-bold text-slate-900 dark:text-white text-sm">{row.User.name}</TableCell>
                                <TableCell className="text-slate-500 text-xs">{row.User.unitKerja}</TableCell>
                                <TableCell className="text-blue-500 dark:text-blue-400 font-medium text-xs">{row.Course.title}</TableCell>
                                <TableCell className="text-right">
                                    <button className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors">Detail</button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
