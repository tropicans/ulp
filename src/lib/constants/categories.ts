// Course categories for ASN LMS
export const COURSE_CATEGORIES = [
    { value: "kompetensi-teknis-umum", label: "Kompetensi Teknis Umum", icon: "🎯" },
    { value: "pintar-bersama", label: "PINTAR Bersama", icon: "🔊" },
    { value: "setneg-knowledge-center", label: "Setneg Knowledge Center", icon: "📚" },
    { value: "keprotokolan", label: "Keprotokolan", icon: "🏛️" },
    { value: "teknologi-informasi-komunikasi", label: "Teknologi Informasi dan Komunikasi", icon: "💻" },
    { value: "administrasi-umum", label: "Administrasi Umum", icon: "📋" },
    { value: "sdm-kelembagaan-tata-laksana", label: "SDM, Kelembagaan, dan Tata Laksana", icon: "👥" },
] as const

export type CourseCategory = typeof COURSE_CATEGORIES[number]["value"]

export function getCategoryLabel(value: string): string {
    const category = COURSE_CATEGORIES.find(c => c.value === value)
    return category?.label || value
}

export function getCategoryIcon(value: string): string {
    const category = COURSE_CATEGORIES.find(c => c.value === value)
    return category?.icon || "📁"
}
