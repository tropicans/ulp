"use client"

import { PulseFitHero } from "@/components/ui/pulse-fit-hero"
import { useRouter } from "next/navigation"

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
                title="Transformasi Individu & Talenta Integratif Aparatur Negara"
                subtitle="TITIAN adalah Learning Experience Platform (LXP) yang dirancang sebagai jembatan strategis pengembangan kompetensi ASN secara berkelanjutan—menghubungkan pembelajaran, penguatan talenta, dan perjalanan karier aparatur negara berbasis kebutuhan organisasi dan transformasi digital."
                primaryAction={{
                    label: "Mulai Belajar",
                    onClick: () => router.push("/login"),
                }}
                secondaryAction={{
                    label: "Lihat Katalog",
                    onClick: () => router.push("/courses"),
                }}
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
