"use client";

import { ArrowRight, GraduationCap } from "lucide-react"
import { PulseFitHero } from "@/components/ui/pulse-fit-hero"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen">
      <PulseFitHero
        logo={
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight">LXP ASN</span>
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
        title="Sistem Pembelajaran Mandiri untuk ASN Unggul."
        subtitle="Tingkatkan kompetensi Anda dengan platform pembelajaran digital yang fleksibel, interaktif, dan terintegrasi dalam satu ekosistem."
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
        programs={[
          {
            image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=500&fit=crop",
            category: "DIGITAL LITERACY",
            title: "Transformasi Digital Sektor Publik",
            onClick: () => router.push("/courses"),
          },
          {
            image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=500&fit=crop",
            category: "LEADERSHIP",
            title: "Manajemen Perubahan & Kepemimpinan",
            onClick: () => router.push("/courses"),
          },
          {
            image: "https://images.unsplash.com/photo-1454165833767-02a9e406f0a5?w=400&h=500&fit=crop",
            category: "PUBLIC SERVICE",
            title: "Etika & Standar Pelayanan Publik",
            onClick: () => router.push("/courses"),
          },
          {
            image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=500&fit=crop",
            category: "GOVERNANCE",
            title: "Akuntabilitas & Tata Kelola Pemerintahan",
            onClick: () => router.push("/courses"),
          },
        ]}
      />

      {/* Sticky Mini Footer */}
      <footer className="absolute bottom-8 left-0 right-0 z-20 pointer-events-none">
        <div className="container mx-auto px-8 text-center bg-transparent">
          <p className="text-slate-400 text-xs">
            © 2026 LXP ASN. Kementerian Sekretariat Negara.
          </p>
        </div>
      </footer>
    </div>
  )
}
