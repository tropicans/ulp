import { DeliveryMode } from "@/generated/prisma"
import { Building2, Laptop2, Monitor, Video } from "lucide-react"

export interface DeliveryModeConfig {
    label: string
    shortDescription: string
    fullDescription: string
    icon: typeof Building2
    color: string
}

export const deliveryModeConfig: Record<DeliveryMode, DeliveryModeConfig> = {
    ON_CLASSROOM: {
        label: "Tatap Muka",
        shortDescription: "100% kelas fisik",
        fullDescription: "Pelatihan tatap muka 100% di kelas fisik dengan workshop hands-on dan praktikum langsung",
        icon: Building2,
        color: "bg-green-500/80 hover:bg-green-500"
    },
    HYBRID: {
        label: "Hybrid",
        shortDescription: "Online + Kelas",
        fullDescription: "Kombinasi online (e-learning/Zoom) dan kelas tatap muka. Semua peserta wajib mengikuti kedua komponen",
        icon: Laptop2,
        color: "bg-purple-500/80 hover:bg-purple-500"
    },
    ASYNC_ONLINE: {
        label: "E-Learning",
        shortDescription: "Belajar mandiri",
        fullDescription: "100% online mandiri dengan fleksibilitas waktu. Akses materi kapan saja dengan progress tracking otomatis",
        icon: Monitor,
        color: "bg-blue-500/80 hover:bg-blue-500"
    },
    SYNC_ONLINE: {
        label: "Live Online",
        shortDescription: "Zoom/YouTube/IG/TikTok Live",
        fullDescription: "Live streaming 100% online via Zoom, YouTube Live, Instagram Live, atau TikTok Live dengan jadwal tetap",
        icon: Video,
        color: "bg-red-500/80 hover:bg-red-500"
    }
}

export function getDeliveryModeLabel(mode: DeliveryMode): string {
    return deliveryModeConfig[mode].label
}

export function getDeliveryModeDescription(mode: DeliveryMode, full: boolean = false): string {
    return full
        ? deliveryModeConfig[mode].fullDescription
        : deliveryModeConfig[mode].shortDescription
}

export function getDeliveryModeIcon(mode: DeliveryMode) {
    return deliveryModeConfig[mode].icon
}

export function getDeliveryModeColor(mode: DeliveryMode): string {
    return deliveryModeConfig[mode].color
}
