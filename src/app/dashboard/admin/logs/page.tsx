"use client"

import { useState, useEffect } from "react"
import { getAuditLogs } from "@/lib/actions/admin"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, User as UserIcon, Activity, Database, Clock } from "lucide-react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchLogs()
    }, [])

    async function fetchLogs() {
        setIsLoading(true)
        const result = await getAuditLogs(100)
        if (result.logs) {
            setLogs(result.logs)
        }
        setIsLoading(false)
    }

    const getActionBadge = (action: string) => {
        const isDelete = action.includes("DELETE")
        const isUpdate = action.includes("UPDATE")
        const isCreate = action.includes("CREATE")

        return (
            <Badge className={
                isDelete ? "bg-red-500/10 text-red-400 border-red-500/30" :
                    isCreate ? "bg-green-500/10 text-green-400 border-green-500/30" :
                        isUpdate ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                            "bg-slate-500/10 text-slate-400 border-slate-500/30"
            }>
                {action}
            </Badge>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-8 h-8 text-purple-400" />
                    Log Audit Sistem
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Transparansi aktivitas administratif dan perubahan sistem</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-100 dark:bg-slate-950/50">
                        <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Waktu</TableHead>
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Administrator</TableHead>
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Aksi</TableHead>
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Entitas</TableHead>
                            <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Detail</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(10).fill(0).map((_, i) => (
                                <TableRow key={i} className="border-slate-200 dark:border-slate-800 animate-pulse">
                                    <TableCell colSpan={5} className="py-6 bg-slate-100 dark:bg-slate-900/10" />
                                </TableRow>
                            ))
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-20 text-center text-slate-500 italic">
                                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    Belum ada log aktivitas
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-all border-l-2 border-l-transparent hover:border-l-purple-500">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 dark:text-white text-xs font-bold">
                                                {format(new Date(log.createdAt), "d MMM yyyy", { locale: localeId })}
                                            </span>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(log.createdAt), "HH:mm:ss")}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                                <UserIcon className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{log.User.name}</span>
                                                <span className="text-[9px] text-slate-500 dark:text-slate-600">{log.User.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getActionBadge(log.action)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                            <Database className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                                            {log.entity}
                                            {log.entityId && <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded truncate max-w-[80px]">#{log.entityId.slice(-6)}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <pre className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-950/50 p-2 rounded border border-slate-200 dark:border-slate-800 max-w-[200px] truncate">
                                            {JSON.stringify(log.details)}
                                        </pre>
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
