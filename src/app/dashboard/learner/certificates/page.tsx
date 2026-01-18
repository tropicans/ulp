"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Award, Download, ExternalLink, ShieldCheck, GraduationCap, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

export default function CertificatesPage() {
    const [isLoading, setIsLoading] = useState(false)

    // Placeholder certificates
    const certificates = [
        {
            id: "CERT-2025-001",
            title: "Digital Leadership & Transformation",
            issuedAt: new Date(2025, 11, 15),
            type: "Sertifikat Kelulusan",
            grade: "Sangat Memuaskan"
        }
    ]

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Award className="w-8 h-8 text-yellow-500" />
                        Sertifikasi Saya
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar pencapaian dan sertifikat kompetensi yang telah Anda raih</p>
                </div>
            </div>

            {certificates.length === 0 ? (
                <Card className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-20 flex flex-col items-center justify-center text-center rounded-3xl">
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl flex items-center justify-center mb-6 opacity-50 dark:opacity-20">
                        <Award className="w-10 h-10 text-slate-500 dark:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Belum Memiliki Sertifikat</h3>
                    <p className="text-slate-500 max-w-xs mb-8">
                        Selesaikan kursus dengan progres 100% dan lulus ujian untuk mendapatkan sertifikat Anda.
                    </p>
                    <Button asChild variant="outline" className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-10">
                        <span className="font-bold text-xs uppercase tracking-widest">Jelajahi Kursus</span>
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {certificates.map((cert) => (
                        <Card key={cert.id} className="group border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden hover:border-yellow-500/30 transition-all rounded-3xl">
                            <div className="p-8 pb-4 flex items-start justify-between">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-yellow-500/10">
                                    <ShieldCheck className="w-8 h-8 text-yellow-500" />
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ID Sertifikat</span>
                                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300">{cert.id}</p>
                                </div>
                            </div>

                            <CardContent className="p-8 pt-0">
                                <Badge className="mb-3 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-none text-[10px] font-black uppercase tracking-widest px-3">
                                    {cert.type}
                                </Badge>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-4 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors">
                                    {cert.title}
                                </h3>

                                <div className="flex flex-col gap-4 py-6 border-y border-slate-200 dark:border-slate-800/50 mb-6">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold uppercase tracking-widest">Diberikan Pada</span>
                                        <span className="text-slate-900 dark:text-white font-medium">{format(cert.issuedAt, "dd MMMM yyyy", { locale: localeId })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold uppercase tracking-widest">Predikat</span>
                                        <span className="text-green-600 dark:text-green-400 font-black italic">{cert.grade}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold h-11 rounded-xl transition-all border border-slate-300 dark:border-slate-700">
                                        <Download className="w-4 h-4 mr-2" /> Download PDF
                                    </Button>
                                    <Button variant="ghost" className="w-12 h-11 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
