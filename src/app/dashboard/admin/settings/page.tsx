"use client"

import { useState, useEffect } from "react"
import { getSystemSettings, updateSystemSetting } from "@/lib/actions/admin"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Settings,
    Shield,
    Save,
    Database,
    Bell,
    Lock,
    Globe,
    Cpu,
    Briefcase
} from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
    const [settings, setSettings] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState<string | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    async function fetchSettings() {
        setIsLoading(true)
        const result = await getSystemSettings()
        if (result.settings) {
            setSettings(result.settings)
        }
        setIsLoading(false)
    }

    const handleUpdate = async (key: string, value: string) => {
        setIsSaving(key)
        const result = await updateSystemSetting(key, value)
        if (result.success) {
            toast.success(`Pengaturan '${key}' diperbarui`)
            fetchSettings()
        } else {
            toast.error(result.error || "Gagal memperbarui")
        }
        setIsSaving(null)
    }

    const getSettingValue = (key: string, defaultValue = "") => {
        return settings.find(s => s.key === key)?.value || defaultValue
    }

    if (isLoading) return <div className="container mx-auto p-12 animate-pulse bg-white dark:bg-slate-900 min-h-screen" />

    return (
        <div className="container max-w-5xl mx-auto px-4 py-12">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                    <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-900/20">
                        <Settings className="w-8 h-8 text-white" />
                    </div>
                    Pengaturan Sistem
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Konfigurasi parameter global dan kebijakan platform LXP</p>
            </div>

            <Tabs defaultValue="general" className="space-y-8">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl">
                    <TabsTrigger value="general" className="rounded-xl px-8 font-bold data-[state=active]:bg-red-600">
                        <Globe className="w-4 h-4 mr-2" /> Umum
                    </TabsTrigger>
                    <TabsTrigger value="auth" className="rounded-xl px-8 font-bold data-[state=active]:bg-red-600">
                        <Lock className="w-4 h-4 mr-2" /> Keamanan
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-xl px-8 font-bold data-[state=active]:bg-red-600">
                        <Bell className="w-4 h-4 mr-2" /> Notifikasi
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-6">
                            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-red-500" /> Profil Platform
                            </CardTitle>
                            <CardDescription>Atur identitas aplikasi dan preferensi dasar</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Label className="text-slate-900 dark:text-white font-bold">Nama Platform</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            defaultValue={getSettingValue("site_name", "TITIAN")}
                                            className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                                            id="site_name"
                                        />
                                        <Button
                                            onClick={() => handleUpdate("site_name", (document.getElementById("site_name") as HTMLInputElement).value)}
                                            disabled={isSaving === "site_name"}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            {isSaving === "site_name" ? "..." : <Save className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Judul yang muncul di browser dan email</p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-900 dark:text-white font-bold">Support Email</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            defaultValue={getSettingValue("support_email", "admin@lxp.id")}
                                            className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                                            id="support_email"
                                        />
                                        <Button
                                            onClick={() => handleUpdate("support_email", (document.getElementById("support_email") as HTMLInputElement).value)}
                                            disabled={isSaving === "support_email"}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            {isSaving === "support_email" ? "..." : <Save className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alamat kontak bantuan teknis</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="auth" className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-6">
                            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-500" /> Kebijakan Akses
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <div className="space-y-0.5">
                                    <Label className="text-slate-900 dark:text-white font-bold">Registrasi Mandiri</Label>
                                    <p className="text-xs text-slate-500">Izinkan pengguna baru mendaftar tanpa undangan</p>
                                </div>
                                <Switch
                                    checked={getSettingValue("allow_registration", "true") === "true"}
                                    onCheckedChange={(checked) => handleUpdate("allow_registration", checked.toString())}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <div className="space-y-0.5">
                                    <Label className="text-slate-900 dark:text-white font-bold">Verifikasi Email Wajib</Label>
                                    <p className="text-xs text-slate-500">Pengguna harus memverifikasi email sebelum login</p>
                                </div>
                                <Switch
                                    checked={getSettingValue("require_email_verification", "false") === "true"}
                                    onCheckedChange={(checked) => handleUpdate("require_email_verification", checked.toString())}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-6">
                            <CardTitle className="text-slate-900 dark:text-white">Preferensi Server Notifikasi</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 text-center py-20">
                            <Database className="w-16 h-16 text-slate-300 dark:text-slate-800 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Konfigurasi SMTP</h3>
                            <p className="text-slate-500 italic max-w-sm mx-auto">
                                Fitur ini memerlukan konfigurasi environment variable tambahan pada server untuk aktivasi penuh.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
