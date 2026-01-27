"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Phone, Loader2, CheckCircle2, RefreshCw, ShieldCheck, Send } from "lucide-react"
import { toast } from "sonner"
import {
    sendEmailVerification,
    sendPhoneVerification,
    verifyEmailOTP,
    verifyPhoneOTP,
    getVerificationStatus
} from "@/lib/actions/verification"

export default function VerifyPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSendingEmail, setIsSendingEmail] = useState(false)
    const [isSendingPhone, setIsSendingPhone] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [emailOTP, setEmailOTP] = useState("")
    const [phoneOTP, setPhoneOTP] = useState("")
    const [emailVerified, setEmailVerified] = useState(false)
    const [phoneVerified, setPhoneVerified] = useState(false)
    const [userEmail, setUserEmail] = useState("")
    const [userPhone, setUserPhone] = useState("")
    const [cooldown, setCooldown] = useState(0)

    // Track which tab is active and which channel has OTP sent
    const [activeTab, setActiveTab] = useState("email")
    const [emailOTPSent, setEmailOTPSent] = useState(false)
    const [phoneOTPSent, setPhoneOTPSent] = useState(false)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login")
            return
        }

        if (session?.user?.id) {
            loadVerificationStatus()
        }
    }, [session, status])

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [cooldown])

    async function loadVerificationStatus() {
        if (!session?.user?.id) return
        setIsLoading(true)
        const result = await getVerificationStatus(session.user.id)
        if (result.success) {
            setEmailVerified(result.emailVerified || false)
            setPhoneVerified(result.phoneVerified || false)
            setUserEmail(result.email || "")
            setUserPhone(result.phone || "")

            // Auto-redirect to dashboard if either is verified
            if (result.emailVerified || result.phoneVerified) {
                router.push("/dashboard")
                return
            }
        }
        setIsLoading(false)
    }

    async function handleSendEmailOTP() {
        if (!session?.user?.id || cooldown > 0) return
        setIsSendingEmail(true)
        const result = await sendEmailVerification(session.user.id)
        if (result.success) {
            toast.success(result.message)
            setCooldown(60)
            setEmailOTPSent(true)
            setActiveTab("email") // Stay on email tab
        } else {
            toast.error(result.error)
        }
        setIsSendingEmail(false)
    }

    async function handleSendPhoneOTP() {
        if (!session?.user?.id || cooldown > 0) return
        setIsSendingPhone(true)
        const result = await sendPhoneVerification(session.user.id)
        if (result.success) {
            toast.success(result.message)
            setCooldown(60)
            setPhoneOTPSent(true)
            setActiveTab("phone") // Stay on phone tab
        } else {
            toast.error(result.error)
        }
        setIsSendingPhone(false)
    }

    async function handleVerifyEmail() {
        if (!session?.user?.id || emailOTP.length !== 6) return
        setIsVerifying(true)
        const result = await verifyEmailOTP(session.user.id, emailOTP)
        if (result.success) {
            toast.success(result.message)
            setEmailVerified(true)
            setEmailOTP("")
            // Auto-redirect to dashboard after email verification
            router.push("/dashboard")
        } else {
            toast.error(result.error)
        }
        setIsVerifying(false)
    }

    async function handleVerifyPhone() {
        if (!session?.user?.id || phoneOTP.length !== 6) return
        setIsVerifying(true)
        const result = await verifyPhoneOTP(session.user.id, phoneOTP)
        if (result.success) {
            toast.success(result.message)
            setPhoneVerified(true)
            setPhoneOTP("")
            // Auto-redirect to dashboard after phone verification
            router.push("/dashboard")
        } else {
            toast.error(result.error)
        }
        setIsVerifying(false)
    }

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (emailVerified && phoneVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-12 pb-8">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Akun Terverifikasi! 🎉
                        </h1>
                        <p className="text-slate-500 mb-6">
                            Email dan WhatsApp Anda telah terverifikasi.
                        </p>
                        <Button onClick={() => router.push("/dashboard")} className="bg-blue-600 hover:bg-blue-700">
                            Lanjut ke Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            {/* TITAN Branding */}
            <div className="mb-6 flex items-center gap-3">
                <Image
                    src="/logo.png"
                    alt="TITAN Logo"
                    width={48}
                    height={48}
                    className="rounded-lg"
                />
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TITAN</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Learning Experience Platform</p>
                </div>
            </div>

            <Card className="max-w-lg w-full shadow-2xl border-0">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Verifikasi Akun</CardTitle>
                    <CardDescription>
                        Verifikasi email atau nomor WhatsApp Anda untuk menjadi pengguna
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid grid-cols-2 w-full">
                            <TabsTrigger value="email" className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                                {emailVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {emailOTPSent && !emailVerified && <Send className="w-3 h-3 text-blue-500" />}
                            </TabsTrigger>
                            <TabsTrigger value="phone" className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                WhatsApp
                                {phoneVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {phoneOTPSent && !phoneVerified && <Send className="w-3 h-3 text-green-500" />}
                            </TabsTrigger>
                        </TabsList>

                        {/* Email Verification */}
                        <TabsContent value="email" className="space-y-4">
                            {emailVerified ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                                    <p className="font-semibold text-green-600">Email Terverifikasi</p>
                                    <p className="text-sm text-slate-500 mt-1">{userEmail}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            Kode verifikasi akan dikirim ke: <strong>{userEmail}</strong>
                                        </p>
                                    </div>

                                    {emailOTPSent && (
                                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                                Kode OTP sudah dikirim ke email Anda!
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSendEmailOTP}
                                        disabled={isSendingEmail || cooldown > 0}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isSendingEmail ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : cooldown > 0 ? (
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                        ) : (
                                            <Mail className="w-4 h-4 mr-2" />
                                        )}
                                        {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : emailOTPSent ? "Kirim Ulang Kode" : "Kirim Kode Verifikasi"}
                                    </Button>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Masukkan Kode OTP (6 digit)
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={emailOTP}
                                                onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                placeholder="000000"
                                                className="text-center text-2xl tracking-widest font-mono text-slate-900 dark:text-white dark:bg-slate-800"
                                                maxLength={6}
                                            />
                                            <Button
                                                onClick={handleVerifyEmail}
                                                disabled={isVerifying || emailOTP.length !== 6}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifikasi"}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* Phone Verification */}
                        <TabsContent value="phone" className="space-y-4">
                            {phoneVerified ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                                    <p className="font-semibold text-green-600">WhatsApp Terverifikasi</p>
                                    <p className="text-sm text-slate-500 mt-1">{userPhone}</p>
                                </div>
                            ) : userPhone ? (
                                <>
                                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-green-800 dark:text-green-200">
                                            Kode verifikasi akan dikirim ke WhatsApp: <strong>{userPhone}</strong>
                                        </p>
                                    </div>

                                    {phoneOTPSent && (
                                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                                Kode OTP sudah dikirim ke WhatsApp Anda!
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSendPhoneOTP}
                                        disabled={isSendingPhone || cooldown > 0}
                                        className="w-full bg-green-600 hover:bg-green-700"
                                    >
                                        {isSendingPhone ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : cooldown > 0 ? (
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                        ) : (
                                            <Phone className="w-4 h-4 mr-2" />
                                        )}
                                        {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : phoneOTPSent ? "Kirim Ulang Kode" : "Kirim Kode via WhatsApp"}
                                    </Button>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Masukkan Kode OTP (6 digit)
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={phoneOTP}
                                                onChange={(e) => setPhoneOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                placeholder="000000"
                                                className="text-center text-2xl tracking-widest font-mono text-slate-900 dark:text-white dark:bg-slate-800"
                                                maxLength={6}
                                            />
                                            <Button
                                                onClick={handleVerifyPhone}
                                                disabled={isVerifying || phoneOTP.length !== 6}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifikasi"}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <Phone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                    <p className="font-semibold text-slate-500">Nomor WhatsApp Belum Terdaftar</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Lengkapi profil Anda terlebih dahulu
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => router.push("/complete-profile")}
                                    >
                                        Lengkapi Profil
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Footer */}
            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
                © 2026 TITAN - Transformasi Digital Pembelajaran ASN
            </p>
        </div>
    )
}
