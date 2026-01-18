import { notFound } from "next/navigation"
import { verifyCertificate } from "@/lib/actions/certificates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Award, User, BookOpen, Calendar, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SiteHeader } from "@/components/navigation/site-header"

interface VerifyPageProps {
    params: Promise<{ code: string }>
}

export default async function VerifyPage({ params }: VerifyPageProps) {
    const { code } = await params
    const result = await verifyCertificate(code)

    if ("error" in result) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
                <SiteHeader />
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full border-red-500/20 bg-white dark:bg-slate-900 shadow-2xl">
                        <CardContent className="pt-10 pb-10 text-center">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-10 h-10 text-red-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verifikasi Gagal</h1>
                            <p className="text-slate-500 dark:text-slate-400">{result.error}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    const { cert } = result

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
            <SiteHeader />
            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none" />

                <Card className="max-w-2xl w-full border-blue-500/20 bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl -mr-32 -mt-32 rounded-full" />

                    <CardHeader className="text-center pt-12 pb-8 border-b border-slate-200 dark:border-slate-800">
                        <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-900/20 rotate-3">
                            <CheckCircle2 className="w-12 h-12 text-white -rotate-3" />
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900 dark:text-white mb-2">Sertifikat Valid</CardTitle>
                        <p className="text-slate-500 dark:text-slate-400 text-sm uppercase tracking-widest font-bold">LXP ASN Verification Hub</p>
                    </CardHeader>

                    <CardContent className="p-8 space-y-8">
                        <div className="grid gap-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Nama Pemilik</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{cert.User.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{cert.User.unitKerja || "Instansi ASN"}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Judul Kursus</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{cert.Course.title}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">ID Sertifikat</p>
                                    <p className="text-sm font-mono text-slate-600 dark:text-slate-300">{cert.certificateNo}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Tanggal Terbit</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{new Date(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
                            <ShieldCheck className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Terverifikasi Secara Digital</p>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Sertifikat ini diterbitkan secara otomatis oleh sistem LXP ASN setelah peserta menyelesaikan kurikulum yang diwajibkan.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
