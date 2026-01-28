"use client"

import { useState, useEffect } from "react"
import { getSystemSettings, updateSystemSetting } from "@/lib/actions/admin"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Settings,
    Shield,
    Save,
    Database,
    Bell,
    Lock,
    Globe,
    Cpu,
    Palette,
    Youtube,
    Sparkles,
    GraduationCap,
    Clock,
    Users,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    Mail,
    Key,
    Mic,
    Wifi,
    WifiOff,
    AlertCircle,
    RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

// Setting type definition
interface SettingConfig {
    label: string
    default: string
    type: "text" | "email" | "number" | "password" | "switch" | "select" | "color"
    description: string
    options?: string[]
}

// Setting definitions with metadata
const SETTINGS_CONFIG: Record<string, SettingConfig> = {
    // General
    site_name: { label: "Nama Platform", default: "TITAN", type: "text", description: "Judul yang muncul di browser dan email" },
    site_tagline: { label: "Tagline", default: "Learning Experience Platform ASN", type: "text", description: "Deskripsi singkat platform" },
    support_email: { label: "Email Support", default: "admin@setneg.go.id", type: "email", description: "Alamat kontak bantuan teknis" },
    footer_text: { label: "Teks Footer", default: "© 2026 Sekretariat Negara RI", type: "text", description: "Copyright yang muncul di footer" },

    // Learning
    default_jp: { label: "Default JP (Jam Pelajaran)", default: "2", type: "number", description: "JP default untuk kursus baru" },
    completion_threshold: { label: "Passing Grade (%)", default: "70", type: "number", description: "Minimum nilai untuk lulus kursus" },
    certificate_auto_issue: { label: "Sertifikat Otomatis", default: "true", type: "switch", description: "Terbitkan sertifikat otomatis saat lulus" },
    max_quiz_attempts: { label: "Maks Percobaan Quiz", default: "3", type: "number", description: "Jumlah percobaan maksimal untuk quiz" },

    // Security
    allow_registration: { label: "Registrasi Mandiri", default: "true", type: "switch", description: "Izinkan pengguna baru mendaftar tanpa undangan" },
    require_email_verification: { label: "Verifikasi Email Wajib", default: "false", type: "switch", description: "Pengguna harus memverifikasi email sebelum login" },
    session_timeout: { label: "Session Timeout (menit)", default: "60", type: "number", description: "Waktu kedaluwarsa sesi login" },
    allowed_domains: { label: "Domain Email yang Diizinkan", default: "", type: "text", description: "Kosongkan untuk semua domain, atau pisahkan dengan koma (setneg.go.id,kemenpan.go.id)" },

    // Appearance
    primary_color: { label: "Warna Utama", default: "#3B82F6", type: "color", description: "Warna aksen utama platform" },
    logo_url: { label: "URL Logo", default: "", type: "text", description: "URL logo platform (opsional)" },
    dark_mode_default: { label: "Dark Mode Default", default: "false", type: "switch", description: "Gunakan dark mode sebagai default" },
}

type SettingKey = keyof typeof SETTINGS_CONFIG

// Integration status types
interface IntegrationStatus {
    id: string
    name: string
    description: string
    status: "connected" | "error" | "not_configured" | "checking"
    message?: string
}

// Icon mapping for integrations
const INTEGRATION_ICONS: Record<string, { icon: React.ReactNode; bgColor: string }> = {
    youtube: { icon: <Youtube className="w-5 h-5 text-red-500" />, bgColor: "bg-red-100 dark:bg-red-950" },
    ollama: { icon: <Sparkles className="w-5 h-5 text-purple-500" />, bgColor: "bg-purple-100 dark:bg-purple-950" },
    elevenlabs: { icon: <Mic className="w-5 h-5 text-blue-500" />, bgColor: "bg-blue-100 dark:bg-blue-950" },
    xapi: { icon: <GraduationCap className="w-5 h-5 text-orange-500" />, bgColor: "bg-orange-100 dark:bg-orange-950" },
    minio: { icon: <Database className="w-5 h-5 text-cyan-500" />, bgColor: "bg-cyan-100 dark:bg-cyan-950" },
    n8n: { icon: <Cpu className="w-5 h-5 text-green-500" />, bgColor: "bg-green-100 dark:bg-green-950" },
    proxy: { icon: <Wifi className="w-5 h-5 text-indigo-500" />, bgColor: "bg-indigo-100 dark:bg-indigo-950" },
}

// Integration Status Panel Component
function IntegrationStatusPanel() {
    const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [lastChecked, setLastChecked] = useState<string | null>(null)

    async function checkIntegrations() {
        setIsLoading(true)
        try {
            const response = await fetch("/api/integration-status")
            const data = await response.json()
            if (data.success) {
                setIntegrations(data.integrations)
                setLastChecked(data.checkedAt)
            }
        } catch (error) {
            console.error("Failed to check integrations:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkIntegrations()
    }, [])

    const getStatusBadge = (status: IntegrationStatus["status"], message?: string) => {
        switch (status) {
            case "connected":
                return (
                    <span className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Terkoneksi
                    </span>
                )
            case "error":
                return (
                    <span className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1" title={message}>
                        <WifiOff className="w-4 h-4" /> Error
                    </span>
                )
            case "not_configured":
                return (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1" title={message}>
                        <AlertCircle className="w-4 h-4" /> Belum Dikonfigurasi
                    </span>
                )
            case "checking":
                return (
                    <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa...
                    </span>
                )
        }
    }

    return (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-blue-500" /> Status Integrasi
                        </CardTitle>
                        <CardDescription>
                            Konfigurasi integrasi dikelola melalui file <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">.env</code> pada server
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={checkIntegrations}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
                {lastChecked && (
                    <p className="text-xs text-slate-400 mt-2">
                        Terakhir diperiksa: {new Date(lastChecked).toLocaleString("id-ID")}
                    </p>
                )}
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {/* Info banner */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 mb-6">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>ℹ️ Info:</strong> Status integrasi diperiksa secara real-time. Untuk mengubah konfigurasi, edit file <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">.env</code> dan restart container.
                    </p>
                </div>

                {isLoading && integrations.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    integrations.map((integration) => {
                        const iconConfig = INTEGRATION_ICONS[integration.id] || {
                            icon: <Cpu className="w-5 h-5 text-slate-500" />,
                            bgColor: "bg-slate-100 dark:bg-slate-950"
                        }

                        return (
                            <div
                                key={integration.id}
                                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${iconConfig.bgColor}`}>
                                        {iconConfig.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{integration.name}</h4>
                                        <p className="text-xs text-slate-500">{integration.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(integration.status, integration.message)}
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set())
    const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set())
    const [localValues, setLocalValues] = useState<Record<string, string>>({})

    useEffect(() => {
        fetchSettings()
    }, [])

    async function fetchSettings() {
        setIsLoading(true)
        const result = await getSystemSettings()
        if (result.settings) {
            setSettings(result.settings)
            // Initialize local values
            const values: Record<string, string> = {}
            Object.keys(SETTINGS_CONFIG).forEach(key => {
                const setting = result.settings.find((s: any) => s.key === key)
                values[key] = setting?.value || SETTINGS_CONFIG[key as SettingKey].default
            })
            setLocalValues(values)
        }
        setIsLoading(false)
    }

    const handleChange = (key: string, value: string) => {
        setLocalValues(prev => ({ ...prev, [key]: value }))
        const originalValue = settings.find(s => s.key === key)?.value || SETTINGS_CONFIG[key as SettingKey]?.default || ""
        if (value !== originalValue) {
            setChangedKeys(prev => new Set(prev).add(key))
        } else {
            setChangedKeys(prev => {
                const newSet = new Set(prev)
                newSet.delete(key)
                return newSet
            })
        }
    }

    const handleSave = async (key: string) => {
        setSavingKeys(prev => new Set(prev).add(key))
        const result = await updateSystemSetting(key, localValues[key])
        if (result.success) {
            toast.success(`Pengaturan '${SETTINGS_CONFIG[key as SettingKey]?.label || key}' disimpan`)
            setChangedKeys(prev => {
                const newSet = new Set(prev)
                newSet.delete(key)
                return newSet
            })
            fetchSettings()
        } else {
            toast.error(result.error || "Gagal menyimpan")
        }
        setSavingKeys(prev => {
            const newSet = new Set(prev)
            newSet.delete(key)
            return newSet
        })
    }

    const handleSaveAll = async () => {
        const keys = Array.from(changedKeys)
        for (const key of keys) {
            await handleSave(key)
        }
    }

    const renderSettingInput = (key: string) => {
        const config = SETTINGS_CONFIG[key]
        if (!config) return null
        const value = localValues[key] || config.default
        const isSaving = savingKeys.has(key)
        const isChanged = changedKeys.has(key)

        if (config.type === "switch") {
            return (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5">
                        <Label className="text-slate-900 dark:text-white font-bold">{config.label}</Label>
                        <p className="text-xs text-slate-500">{config.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        <Switch
                            checked={value === "true"}
                            onCheckedChange={(checked) => {
                                handleChange(key, checked.toString())
                                // Auto-save for switches
                                setTimeout(() => handleSave(key), 100)
                            }}
                            disabled={isSaving}
                        />
                    </div>
                </div>
            )
        }

        if (config.type === "select" && config.options) {
            return (
                <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-white font-bold">{config.label}</Label>
                    <div className="flex gap-2">
                        <Select value={value} onValueChange={(v) => handleChange(key, v)}>
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {config.options.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => handleSave(key)}
                            disabled={isSaving || !isChanged}
                            size="icon"
                            className={isChanged ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 dark:bg-slate-700"}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">{config.description}</p>
                </div>
            )
        }

        return (
            <div className="space-y-2">
                <Label className="text-slate-900 dark:text-white font-bold">{config.label}</Label>
                <div className="flex gap-2">
                    <Input
                        type={config.type === "password" ? "password" : config.type === "number" ? "number" : "text"}
                        value={value}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className={`bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white ${isChanged ? 'ring-2 ring-blue-500/50' : ''}`}
                        placeholder={config.default || `Masukkan ${config.label.toLowerCase()}`}
                    />
                    <Button
                        onClick={() => handleSave(key)}
                        disabled={isSaving || !isChanged}
                        size="icon"
                        className={isChanged ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 dark:bg-slate-700"}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isChanged ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </Button>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">{config.description}</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="animate-pulse space-y-8">
                    <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/2" />
                    <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg shadow-red-500/20">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Pengaturan Sistem</h1>
                        <p className="text-sm text-slate-500">Konfigurasi parameter global platform</p>
                    </div>
                </div>
                {changedKeys.size > 0 && (
                    <Button onClick={handleSaveAll} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Semua ({changedKeys.size})
                    </Button>
                )}
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl grid grid-cols-5 w-full">
                    <TabsTrigger value="general" className="rounded-lg text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                        <Globe className="w-4 h-4 mr-1.5" /> Umum
                    </TabsTrigger>
                    <TabsTrigger value="learning" className="rounded-lg text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                        <GraduationCap className="w-4 h-4 mr-1.5" /> Pembelajaran
                    </TabsTrigger>
                    <TabsTrigger value="auth" className="rounded-lg text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                        <Lock className="w-4 h-4 mr-1.5" /> Keamanan
                    </TabsTrigger>
                    <TabsTrigger value="integration" className="rounded-lg text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                        <Cpu className="w-4 h-4 mr-1.5" /> Integrasi
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="rounded-lg text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                        <Palette className="w-4 h-4 mr-1.5" /> Tampilan
                    </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-blue-500" /> Profil Platform
                            </CardTitle>
                            <CardDescription>Atur identitas aplikasi dan informasi dasar</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderSettingInput("site_name")}
                                {renderSettingInput("site_tagline")}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderSettingInput("support_email")}
                                {renderSettingInput("footer_text")}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Learning Tab */}
                <TabsContent value="learning" className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-green-500" /> Pengaturan Pembelajaran
                            </CardTitle>
                            <CardDescription>Konfigurasi default untuk kursus dan penilaian</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderSettingInput("default_jp")}
                                {renderSettingInput("completion_threshold")}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderSettingInput("max_quiz_attempts")}
                            </div>
                            <div className="space-y-4">
                                {renderSettingInput("certificate_auto_issue")}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="auth" className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-500" /> Kebijakan Akses
                            </CardTitle>
                            <CardDescription>Kelola registrasi dan autentikasi pengguna</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {renderSettingInput("allow_registration")}
                            {renderSettingInput("require_email_verification")}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                {renderSettingInput("session_timeout")}
                                {renderSettingInput("allowed_domains")}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Integration Tab - Shows ENV status with real-time checks */}
                <TabsContent value="integration" className="space-y-6">
                    <IntegrationStatusPanel />
                </TabsContent>

                {/* Appearance Tab */}
                <TabsContent value="appearance" className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                                <Palette className="w-5 h-5 text-pink-500" /> Branding
                            </CardTitle>
                            <CardDescription>Sesuaikan tampilan dan identitas visual platform</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderSettingInput("primary_color")}
                                {renderSettingInput("logo_url")}
                            </div>
                            <div className="space-y-4">
                                {renderSettingInput("dark_mode_default")}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
