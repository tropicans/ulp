"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { updateProfile } from "@/lib/actions/user"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/ui/user-avatar"
import { toast } from "sonner"
import {
    User,
    Building2,
    BadgeInfo,
    Briefcase,
    Save,
    Camera,
    Award,
    Lock,
    Info
} from "lucide-react"

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [isOAuthUser, setIsOAuthUser] = useState(false)

    useEffect(() => {
        // Check if user logged in via OAuth (no NIP and has Google image)
        if (session?.user) {
            setIsOAuthUser(!session.user.nip && (session.user.image?.includes('googleusercontent.com') || false))
        }
    }, [session])

    if (!session?.user) return null

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)

        // For OAuth users, only send name, unitKerja, and phone
        const data = isOAuthUser
            ? {
                name: formData.get("name") as string,
                unitKerja: formData.get("unitKerja") as string,
                phone: formData.get("phone") as string,
            }
            : {
                name: formData.get("name") as string,
                nip: formData.get("nip") as string,
                unitKerja: formData.get("unitKerja") as string,
                phone: formData.get("phone") as string,
                jabatan: formData.get("jabatan") as string,
                pangkat: formData.get("pangkat") as string,
            }

        const result = await updateProfile(data)

        if (result.success) {
            toast.success("Profil berhasil diperbarui")
            // Update session with new values
            await update({
                name: data.name,
                unitKerja: data.unitKerja,
                phone: data.phone,
            })
        } else {
            toast.error(result.error || "Gagal memperbarui profil")
        }
        setIsLoading(false)
    }

    return (
        <div className="container max-w-4xl mx-auto px-4 py-12">
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Profil Saya</h1>
                <p className="text-slate-500 dark:text-slate-400">Kelola informasi data diri Anda</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar: Profile Visual */}
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl h-fit">
                    <CardContent className="pt-8 flex flex-col items-center">
                        <div className="relative group cursor-pointer">
                            <UserAvatar
                                name={session.user.name || ""}
                                image={session.user.image}
                                className="w-32 h-32 ring-4 ring-slate-200 dark:ring-slate-800 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 mb-6"
                            />
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">{session.user.name}</h2>
                        <p className="text-slate-500 text-sm font-medium mb-2">{session.user.email}</p>

                        {isOAuthUser && (
                            <div className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full mb-4">
                                <Lock className="w-3 h-3" />
                                Login via Google
                            </div>
                        )}

                        <div className="w-full pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-center gap-6">
                            <div className="text-center">
                                <p className="text-lg font-black text-slate-900 dark:text-white">{(session.user as any).points || 0}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Points</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-black text-slate-900 dark:text-white">{(session.user as any).level || 1}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Level</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main: Form */}
                <div className="md:col-span-2">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                        <CardHeader className="relative">
                            <CardTitle className="text-slate-900 dark:text-white">Informasi Personal</CardTitle>
                            <CardDescription className="text-slate-500 italic">
                                Data ini digunakan untuk verifikasi dan penerbitan sertifikat
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative">
                            {isOAuthUser && (
                                <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                                                Akun Google
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                                Anda dapat mengubah nama dan organisasi. Untuk foto profil,
                                                silakan ubah melalui akun Google Anda.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-slate-400 flex items-center gap-2">
                                            <User className="w-3 h-3" /> Nama Lengkap
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={session.user.name || ""}
                                            className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-blue-500"
                                            required
                                        />
                                        {isOAuthUser && (
                                            <p className="text-xs text-slate-500">Nama untuk sertifikat pelatihan</p>
                                        )}
                                    </div>

                                    {/* Show NIP only for non-OAuth users */}
                                    {!isOAuthUser && (
                                        <div className="space-y-2">
                                            <Label htmlFor="nip" className="text-slate-400 flex items-center gap-2">
                                                <BadgeInfo className="w-3 h-3" /> NIP
                                            </Label>
                                            <Input
                                                id="nip"
                                                name="nip"
                                                defaultValue={session.user.nip || ""}
                                                className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-blue-500"
                                                placeholder="Masukkan NIP Anda"
                                            />
                                        </div>
                                    )}

                                    {/* Show email (readonly) for OAuth users */}
                                    {isOAuthUser && (
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 flex items-center gap-2">
                                                <Lock className="w-3 h-3" /> Email (Google)
                                            </Label>
                                            <Input
                                                value={session.user.email || ""}
                                                className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                                disabled
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="unitKerja" className="text-slate-400 flex items-center gap-2">
                                        <Building2 className="w-3 h-3" /> Organisasi / Instansi / Komunitas
                                    </Label>
                                    <Input
                                        id="unitKerja"
                                        name="unitKerja"
                                        defaultValue={session.user.unitKerja || ""}
                                        className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-blue-500"
                                        placeholder="Contoh: Kementerian XYZ, PT ABC, Komunitas Developer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-slate-400 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        Nomor WhatsApp
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        defaultValue={session.user.phone || ""}
                                        className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-green-500"
                                        placeholder="Contoh: 08123456789"
                                    />
                                    <p className="text-xs text-slate-500">Untuk menerima notifikasi pelatihan via WhatsApp</p>
                                </div>

                                {/* Only show jabatan and pangkat for non-OAuth users */}
                                {!isOAuthUser && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="jabatan" className="text-slate-400 flex items-center gap-2">
                                                <Briefcase className="w-3 h-3" /> Jabatan
                                            </Label>
                                            <Input
                                                id="jabatan"
                                                name="jabatan"
                                                defaultValue={(session.user as any).jabatan || ""}
                                                className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pangkat" className="text-slate-400 flex items-center gap-2">
                                                <Award className="w-3 h-3" /> Pangkat / Golongan
                                            </Label>
                                            <Input
                                                id="pangkat"
                                                name="pangkat"
                                                defaultValue={(session.user as any).pangkat || ""}
                                                className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end gap-3">
                                    <Button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 font-bold px-12 rounded-xl h-12 transition-all shadow-lg shadow-blue-900/20"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Menyimpan..." : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan Perubahan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
