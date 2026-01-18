"use client"

import { useState, useEffect, useRef } from "react"
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { checkInWithQR, checkInWithGPS } from "@/lib/actions/attendance"
import { MapPin, QrCode, Loader2, CheckCircle2 } from "lucide-react"

interface CheckInInterfaceProps {
    sessionId: string
    sessionTitle: string
    hasGPS: boolean
    radius?: number
}

export function CheckInInterface({
    sessionId,
    sessionTitle,
    hasGPS,
    radius,
}: CheckInInterfaceProps) {
    const [mode, setMode] = useState<"SELECT" | "QR" | "GPS">("SELECT")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)

    useEffect(() => {
        if (mode === "QR" && !success) {
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [0], // Only camera
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            }

            scannerRef.current = new Html5QrcodeScanner("reader", config, false)
            scannerRef.current.render(
                async (decodedText) => {
                    // Format is sessionId:token
                    const parts = decodedText.split(":")
                    if (parts.length === 2 && parts[0] === sessionId) {
                        scannerRef.current?.clear()
                        handleQRCheckIn(parts[1])
                    } else {
                        toast.error("QR Code tidak valid untuk sesi ini")
                    }
                },
                (error) => {
                    // Ignore scanning errors
                }
            )
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error)
            }
        }
    }, [mode, success, sessionId])

    async function handleQRCheckIn(token: string) {
        setLoading(true)
        const result = await checkInWithQR(sessionId, token)
        if (result.error) {
            toast.error(result.error)
            setMode("SELECT")
        } else {
            setSuccess(true)
            toast.success(result.message || "Presensi berhasil!")
        }
        setLoading(false)
    }

    async function handleGPSCheckIn() {
        setLoading(true)
        if (!navigator.geolocation) {
            toast.error("Geolocation tidak didukung oleh browser Anda")
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const result = await checkInWithGPS(
                    sessionId,
                    position.coords.latitude,
                    position.coords.longitude
                )

                if (result.error) {
                    toast.error(result.error)
                } else {
                    setSuccess(true)
                    toast.success(result.message || "Presensi GPS berhasil!")
                }
                setLoading(false)
            },
            (error) => {
                let errorMsg = "Gagal mendapatkan lokasi"
                if (error.code === 1) errorMsg = "Akses lokasi ditolak"
                toast.error(errorMsg)
                setLoading(false)
            },
            { enableHighAccuracy: true }
        )
    }

    if (success) {
        return (
            <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="py-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Presensi Berhasil!</h3>
                    <p className="text-slate-400 mb-6">
                        Terima kasih, presensi Anda untuk sesi "{sessionTitle}" telah dicatat.
                    </p>
                    <Button asChild className="bg-green-600 hover:bg-green-700">
                        <a href="/dashboard">Kembali ke Dashboard</a>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-700 bg-slate-800/50 overflow-hidden">
            <CardHeader className="bg-slate-700/30 border-b border-slate-700">
                <CardTitle className="text-white text-center">
                    Presensi Sesi
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {mode === "SELECT" && (
                    <div className="p-6 grid gap-4">
                        <p className="text-sm text-slate-400 text-center mb-2">
                            Pilih metode presensi untuk sesi:<br />
                            <span className="text-white font-semibold">"{sessionTitle}"</span>
                        </p>

                        <Button
                            size="lg"
                            onClick={() => setMode("QR")}
                            className="h-24 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <QrCode className="w-8 h-8" />
                            Scan QR Code
                        </Button>

                        {hasGPS && (
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={handleGPSCheckIn}
                                disabled={loading}
                                className="h-24 flex flex-col gap-2 border-slate-600 text-white"
                            >
                                {loading ? (
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                ) : (
                                    <MapPin className="w-8 h-8 text-red-400" />
                                )}
                                Presensi via GPS
                            </Button>
                        )}

                        {hasGPS && radius && (
                            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest mt-2">
                                Radius GPS: {radius} meter
                            </p>
                        )}
                    </div>
                )}

                {mode === "QR" && (
                    <div className="p-6">
                        <div id="reader" className="overflow-hidden rounded-lg"></div>
                        <Button
                            variant="ghost"
                            className="w-full mt-4 text-slate-400"
                            onClick={() => setMode("SELECT")}
                        >
                            Batal
                        </Button>
                    </div>
                )}

                {loading && mode === "GPS" && (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <p className="text-slate-400">Memverifikasi lokasi GPS...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
