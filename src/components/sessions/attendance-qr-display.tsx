"use client"

import { useEffect, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Users, Clock } from "lucide-react"
import { generateAttendanceToken, getActiveToken } from "@/lib/actions/sessions"
import { getAttendanceBySession } from "@/lib/actions/attendance"
import { formatTokenForQR } from "@/lib/utils/qr-tokens"
import { toast } from "sonner"

interface AttendanceQRDisplayProps {
    sessionId: string
}

export function AttendanceQRDisplay({ sessionId }: AttendanceQRDisplayProps) {
    const [qrData, setQrData] = useState<string>("")
    const [expiresAt, setExpiresAt] = useState<Date | null>(null)
    const [timeLeft, setTimeLeft] = useState<number>(0)
    const [attendanceCount, setAttendanceCount] = useState<number>(0)
    const [loading, setLoading] = useState(false)

    const loadToken = useCallback(async () => {
        // Try to get existing active token first
        const existing = await getActiveToken(sessionId)

        if (existing && new Date(existing.expiresAt) > new Date()) {
            setQrData(formatTokenForQR(sessionId, existing.token))
            setExpiresAt(new Date(existing.expiresAt))
        } else {
            // Generate new token
            await generateNewToken()
        }
    }, [sessionId])

    const generateNewToken = async () => {
        setLoading(true)
        const result = await generateAttendanceToken(sessionId)

        if (result.error) {
            toast.error("Gagal generate QR code", {
                description: result.error,
            })
        } else if (result.token && result.expiresAt) {
            setQrData(formatTokenForQR(sessionId, result.token))
            setExpiresAt(new Date(result.expiresAt))
            toast.success("QR code berhasil di-refresh!")
        }
        setLoading(false)
    }

    const loadAttendance = useCallback(async () => {
        const records = await getAttendanceBySession(sessionId)
        setAttendanceCount(records.length)
    }, [sessionId])

    // Initial load
    useEffect(() => {
        loadToken()
        loadAttendance()
    }, [loadToken, loadAttendance])

    // Auto-refresh token when expired
    useEffect(() => {
        if (!expiresAt) return

        const interval = setInterval(() => {
            const now = new Date()
            const diff = expiresAt.getTime() - now.getTime()

            if (diff <= 0) {
                // Token expired, generate new one
                generateNewToken()
            } else {
                setTimeLeft(Math.floor(diff / 1000))
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [expiresAt])

    // Auto-refresh attendance count
    useEffect(() => {
        const interval = setInterval(loadAttendance, 10000) // Every 10 seconds
        return () => clearInterval(interval)
    }, [loadAttendance])

    return (
        <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code Display */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-white text-lg">QR Code Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {qrData ? (
                        <>
                            <div className="bg-white p-6 rounded-lg flex items-center justify-center">
                                <QRCodeSVG
                                    value={qrData}
                                    size={200}
                                    level="H"
                                    includeMargin
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">
                                        Berlaku: <span className="font-mono font-bold">{timeLeft}s</span>
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={generateNewToken}
                                    disabled={loading}
                                    className="border-slate-600"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                            </div>

                            <div className="bg-slate-700/30 rounded-lg p-3">
                                <p className="text-xs text-slate-400 mb-1">Instruksi:</p>
                                <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                                    <li>Minta peserta scan QR code ini</li>
                                    <li>QR code akan otomatis refresh setiap 60 detik</li>
                                    <li>Peserta yang sudah absen akan muncul di daftar</li>
                                </ol>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-slate-400 mb-3">Loading QR code...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attendance Stats */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                        <span>Attendance Stats</span>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            <Users className="w-3 h-3 mr-1" />
                            {attendanceCount} Checked In
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-700/30 rounded-lg p-4">
                        <div className="text-center">
                            <div className="text-5xl font-bold text-white mb-2">
                                {attendanceCount}
                            </div>
                            <p className="text-slate-400 text-sm">
                                Peserta sudah check-in
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Auto-refresh every</span>
                            <span className="text-white font-medium">10 seconds</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">QR expires in</span>
                            <span className="text-white font-medium font-mono">{timeLeft}s</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
