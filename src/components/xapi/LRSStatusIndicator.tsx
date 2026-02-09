"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react"
import { getLRSConnectionStatus } from "@/lib/actions/xapi-extended-analytics"

interface LRSStatus {
    connected: boolean
    latencyMs?: number
    lastCheck: string
    error?: string
}

interface LRSStatusIndicatorProps {
    onRefreshData?: () => void
}

export function LRSStatusIndicator({ onRefreshData }: LRSStatusIndicatorProps) {
    const [status, setStatus] = useState<LRSStatus | null>(null)
    const [checking, setChecking] = useState(false)

    const checkStatus = useCallback(async () => {
        setChecking(true)
        try {
            const result = await getLRSConnectionStatus()
            setStatus(result)
        } catch (error) {
            setStatus({
                connected: false,
                lastCheck: new Date().toISOString(),
                error: "Check failed"
            })
        }
        setChecking(false)
    }, [])

    // Initial check on mount
    useEffect(() => {
        checkStatus()
        // Auto-refresh every 5 minutes
        const interval = setInterval(checkStatus, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [checkStatus])

    const handleRefresh = () => {
        checkStatus()
        onRefreshData?.()
    }

    const getStatusColor = () => {
        if (!status) return "bg-slate-100 text-slate-600"
        if (!status.connected) return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        if (status.latencyMs && status.latencyMs > 1000) return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
    }

    const getStatusIcon = () => {
        if (checking) return <Loader2 className="w-3 h-3 animate-spin" />
        if (!status || !status.connected) return <WifiOff className="w-3 h-3" />
        return <Wifi className="w-3 h-3" />
    }

    const getStatusText = () => {
        if (!status) return "Checking..."
        if (!status.connected) return "Disconnected"
        if (status.latencyMs && status.latencyMs > 1000) return `Slow (${status.latencyMs}ms)`
        return `Connected${status.latencyMs ? ` (${status.latencyMs}ms)` : ""}`
    }

    const getTimeSince = () => {
        if (!status) return ""
        const lastCheck = new Date(status.lastCheck)
        const now = new Date()
        const diffMs = now.getTime() - lastCheck.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return "Just now"
        if (diffMins === 1) return "1 min ago"
        return `${diffMins} mins ago`
    }

    return (
        <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor()} flex items-center gap-1.5 font-medium`}>
                {getStatusIcon()}
                <span className="hidden sm:inline">LRS:</span> {getStatusText()}
            </Badge>
            <span className="text-[10px] text-slate-400 hidden md:inline">
                {getTimeSince()}
            </span>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleRefresh}
                disabled={checking}
                title="Refresh data"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                <span className="ml-1 hidden sm:inline text-xs">Refresh</span>
            </Button>
        </div>
    )
}
