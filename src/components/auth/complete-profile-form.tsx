"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, User, Building2, Sparkles } from "lucide-react"
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

                // Redirect to dashboard
                window.location.href = "/dashboard"
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
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Simpan & Mulai Belajar
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
