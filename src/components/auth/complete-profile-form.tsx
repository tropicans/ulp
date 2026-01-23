"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, User, Building2, ShieldCheck } from "lucide-react"
import { completeProfile } from "@/lib/actions/auth"

interface CompleteProfileFormProps {
    user: {
        id: string
        email: string
        name: string
        image?: string | null
    }
}

export function CompleteProfileForm({ user }: CompleteProfileFormProps) {
    const { update } = useSession()
    const [isLoading, setIsLoading] = useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const unitKerja = formData.get("unitKerja") as string

        try {
            const result = await completeProfile(formData)

            if (result.error) {
                toast.error("Gagal menyimpan profil", {
                    description: result.error,
                })
                setIsLoading(false)
            } else {
                toast.success("Profil berhasil disimpan!")

                // Update the session with new values
                await update({
                    unitKerja: unitKerja,
                    role: "LEARNER",
                })

                // Redirect to verification page
                window.location.href = "/verify"
            }
        } catch {
            toast.error("Terjadi kesalahan", {
                description: "Silakan coba lagi",
            })
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto p-4">
            <Card className="border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50">
                <CardHeader className="space-y-4 pb-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-100 dark:border-blue-500/20">
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name || "User"}
                                className="w-14 h-14 rounded-full ring-2 ring-white dark:ring-slate-700 shadow-lg"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-white dark:ring-slate-700 shadow-lg">
                                <User className="w-7 h-7 text-white" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-900 dark:text-white font-semibold truncate">{user.name || "Pengguna Baru"}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                    </div>

                    <div>
                        <CardTitle className="text-xl text-slate-900 dark:text-white">Selamat Datang! 👋</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                            Lengkapi profil Anda untuk mulai belajar
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-500" />
                                Nama Lengkap
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                defaultValue={user.name || ""}
                                placeholder="Nama sesuai KTP/identitas resmi"
                                required
                                disabled={isLoading}
                                className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-12"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <span className="text-amber-500">ⓘ</span>
                                Nama ini akan ditampilkan pada sertifikat pelatihan
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unitKerja" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                                Organisasi / Instansi / Komunitas
                            </Label>
                            <Input
                                id="unitKerja"
                                name="unitKerja"
                                type="text"
                                placeholder="Contoh: Kementerian XYZ, PT ABC, Komunitas Developer"
                                required
                                disabled={isLoading}
                                className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20 h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Nomor WhatsApp
                            </Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="08123456789"
                                disabled={isLoading}
                                className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/20 h-12"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <span className="text-green-500">ⓘ</span>
                                Untuk menerima notifikasi dan kode verifikasi via WhatsApp
                            </p>
                        </div>

                        {/* Hidden field for role - always LEARNER */}
                        <input type="hidden" name="role" value="LEARNER" />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 font-semibold text-base"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="mr-2 h-5 w-5" />
                                        Simpan & Verifikasi Akun
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
                Dengan melanjutkan, Anda menyetujui <a href="/privacy" className="text-blue-500 hover:underline">Kebijakan Privasi</a> kami
            </p>
        </div>
    )
}
