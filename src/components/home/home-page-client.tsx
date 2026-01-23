"use client"

import { PulseFitHero } from "@/components/ui/pulse-fit-hero"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface Program {
    image: string
    category: string
    title: string
    href: string
}

interface HomePageClientProps {
    programs: Program[]
}

export function HomePageClient({ programs }: HomePageClientProps) {
    const router = useRouter()

    return (
        <>
            <PulseFitHero
                logo={
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="TITIAN Logo"
                            width={40}
                            height={40}
                            className="object-contain"
                        />
                        <span className="font-bold text-xl tracking-tight">TITIAN</span>
                    </div>
                }
                navigation={[
                    { label: "Katalog", onClick: () => router.push("/courses") },
                    { label: "Tentang", onClick: () => console.log("About") },
                    { label: "Bantuan", onClick: () => console.log("Help") },
                ]}
                ctaButton={{
                    label: "Masuk ke Platform",
                    onClick: () => router.push("/login"),
                }}
                title="Ruang Pembelajaran untuk Pengabdian yang Tangguh"
                subtitle="Transformasi Individu dan Talenta Aparatur Negara"
                children={
                    <div className="flex flex-col items-center text-center max-w-4xl gap-8 px-4">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="font-sans font-bold text-[clamp(36px,5vw,64px)] leading-[1.1] text-slate-900 dark:text-white tracking-tight"
                        >
                            Ruang Pembelajaran untuk Pengabdian yang Tangguh
                        </motion.h1>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="font-sans text-xl md:text-2xl font-medium text-slate-600 dark:text-slate-400"
                        >
                            Transformasi Individu dan Talenta Aparatur Negara
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="font-sans text-base md:text-lg text-slate-500 dark:text-slate-500 max-w-3xl leading-relaxed"
                        >
                            TITAN adalah ruang pembelajaran terpadu bagi Aparatur Negara—dirancang untuk memperkuat kompetensi, talenta, dan kapasitas ASN secara berkelanjutan, dengan menghubungkan pembelajaran, pengalaman, dan kebutuhan organisasi dalam satu ekosistem yang utuh dan relevan.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="flex flex-col sm:flex-row items-center gap-4 mt-4"
                        >
                            <Button
                                size="lg"
                                className="h-14 px-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xl hover:scale-105 transition-all text-lg"
                                onClick={() => router.push("/login")}
                            >
                                Mulai Belajar
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-14 px-10 rounded-full border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-lg"
                                onClick={() => router.push("/courses")}
                            >
                                Lihat Katalog
                            </Button>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 1 }}
                            className="text-sm font-medium text-slate-400 dark:text-slate-600 tracking-wide"
                        >
                            Belajar untuk tumbuh, mengabdi untuk negeri.
                        </motion.p>
                    </div>
                }
                disclaimer="*Akses khusus untuk Pegawai Negeri Sipil & PPPK"
                socialProof={{
                    avatars: [
                        "https://i.pravatar.cc/150?img=11",
                        "https://i.pravatar.cc/150?img=12",
                        "https://i.pravatar.cc/150?img=13",
                        "https://i.pravatar.cc/150?img=14",
                    ],
                    text: "Bergabung bersama 5.000+ ASN lainnya",
                }}
                programs={programs.map((prog) => ({
                    ...prog,
                    onClick: () => router.push(prog.href),
                }))}
            />
        </>
    )
}
