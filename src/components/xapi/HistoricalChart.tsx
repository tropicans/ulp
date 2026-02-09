"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2 } from "lucide-react"
import { getHistoricalTrends } from "@/lib/actions/xapi-extended-analytics"

interface HistoricalDataPoint {
    date: string
    count: number
    enrollments: number
    completions: number
    videoEvents: number
}

type Period = 7 | 30 | 90

export function HistoricalChart() {
    const [data, setData] = useState<HistoricalDataPoint[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<Period>(30)

    useEffect(() => {
        setLoading(true)
        getHistoricalTrends(period).then(result => {
            setData(result.data)
            setLoading(false)
        })
    }, [period])

    const maxCount = Math.max(...data.map(d => d.count), 1)

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        if (period <= 7) {
            return date.toLocaleDateString("id-ID", { weekday: "short" })
        }
        return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
    }

    // Sample data points for display (show ~10-15 bars max)
    const displayData = period <= 7 ? data : data.filter((_, i) => i % Math.ceil(data.length / 15) === 0 || i === data.length - 1)

    if (loading) {
        return (
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-500" />
                            Historical Trends
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-500" />
                        Historical Trends
                    </CardTitle>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        {([7, 30, 90] as Period[]).map(p => (
                            <Button
                                key={p}
                                variant={period === p ? "default" : "ghost"}
                                size="sm"
                                className="h-7 px-3 text-xs"
                                onClick={() => setPeriod(p)}
                            >
                                {p === 7 ? "7D" : p === 30 ? "30D" : "3M"}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data historis</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Chart */}
                        <div className="h-48 flex items-end gap-1">
                            {displayData.map((point, i) => {
                                const barHeight = Math.max((point.count / maxCount) * 180, 4)
                                return (
                                    <div key={point.date} className="flex-1 flex flex-col items-center justify-end group relative">
                                        {/* Tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                                            <p className="font-bold">{formatDate(point.date)}</p>
                                            <p>Total: {point.count}</p>
                                            <p>Enrollments: {point.enrollments}</p>
                                            <p>Completions: {point.completions}</p>
                                        </div>

                                        {/* Bar */}
                                        <div
                                            className="w-full rounded-t-sm bg-gradient-to-t from-cyan-500 to-blue-400 hover:from-cyan-400 hover:to-blue-300 transition-all cursor-pointer"
                                            style={{ height: `${barHeight}px` }}
                                        />
                                    </div>
                                )
                            })}
                        </div>

                        {/* X-axis labels */}
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{formatDate(data[0]?.date || "")}</span>
                            {data.length > 2 && (
                                <span>{formatDate(data[Math.floor(data.length / 2)]?.date || "")}</span>
                            )}
                            <span>{formatDate(data[data.length - 1]?.date || "")}</span>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-cyan-500 to-blue-400" />
                                Total Activities
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
