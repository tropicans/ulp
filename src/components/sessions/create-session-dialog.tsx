"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createSession } from "@/lib/actions/sessions"
import { useRouter } from "next/navigation"

interface CreateSessionDialogProps {
    courseId: string
}

export function CreateSessionDialog({ courseId }: CreateSessionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [sessionType, setSessionType] = useState<string>("CLASSROOM")
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)

        const data = {
            courseId,
            title: formData.get("title") as string,
            description: formData.get("description") as string || undefined,
            type: sessionType as "CLASSROOM" | "HYBRID" | "LIVE_ONLINE" | "SELF_PACED",
            startTime: formData.get("startTime") as string,
            endTime: formData.get("endTime") as string,
            location: formData.get("location") as string || undefined,
            address: formData.get("address") as string || undefined,
            latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : undefined,
            longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : undefined,
            geoRadius: formData.get("geoRadius") ? parseInt(formData.get("geoRadius") as string) : undefined,
            zoomMeetingId: formData.get("zoomMeetingId") as string || undefined,
            zoomJoinUrl: formData.get("zoomJoinUrl") as string || undefined,
            zoomPassword: formData.get("zoomPassword") as string || undefined,
            maxParticipants: formData.get("maxParticipants") ? parseInt(formData.get("maxParticipants") as string) : undefined,
        }

        const result = await createSession(data)

        if (result.error) {
            toast.error("Gagal membuat session", {
                description: result.error,
            })
        } else {
            toast.success("Session berhasil dibuat!")
            setOpen(false)
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Session
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Buat Session Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan sesi pertemuan untuk kursus ini
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Basic Info */}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Judul Session *</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="contoh: Pertemuan 1 - Pengenalan"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Deskripsi session..."
                                rows={2}
                                disabled={loading}
                            />
                        </div>

                        {/* Session Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="type">Tipe Session *</Label>
                            <Select
                                name="type"
                                value={sessionType}
                                onValueChange={setSessionType}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLASSROOM">Tatap Muka (Classroom)</SelectItem>
                                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                                    <SelectItem value="LIVE_ONLINE">Online Live</SelectItem>
                                    <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime">Waktu Mulai *</Label>
                                <Input
                                    id="startTime"
                                    name="startTime"
                                    type="datetime-local"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime">Waktu Selesai *</Label>
                                <Input
                                    id="endTime"
                                    name="endTime"
                                    type="datetime-local"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Classroom/Hybrid Fields */}
                        {(sessionType === "CLASSROOM" || sessionType === "HYBRID") && (
                            <>
                                <div className="border-t pt-4 mt-2">
                                    <h4 className="font-medium mb-3">Lokasi Tatap Muka</h4>
                                    <div className="grid gap-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="location">Nama Lokasi *</Label>
                                            <Input
                                                id="location"
                                                name="location"
                                                placeholder="contoh: Ruang 301"
                                                required={sessionType === "CLASSROOM"}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="address">Alamat</Label>
                                            <Input
                                                id="address"
                                                name="address"
                                                placeholder="Alamat lengkap"
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor="latitude">Latitude (GPS)</Label>
                                                <Input
                                                    id="latitude"
                                                    name="latitude"
                                                    type="number"
                                                    step="any"
                                                    placeholder="-6.2088"
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="longitude">Longitude (GPS)</Label>
                                                <Input
                                                    id="longitude"
                                                    name="longitude"
                                                    type="number"
                                                    step="any"
                                                    placeholder="106.8456"
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="geoRadius">Radius GPS (meter)</Label>
                                            <Input
                                                id="geoRadius"
                                                name="geoRadius"
                                                type="number"
                                                placeholder="50"
                                                disabled={loading}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Jarak maksimal untuk absen dengan GPS
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Online/Hybrid Fields */}
                        {(sessionType === "LIVE_ONLINE" || sessionType === "HYBRID") && (
                            <>
                                <div className="border-t pt-4 mt-2">
                                    <h4 className="font-medium mb-3">Zoom Meeting</h4>
                                    <div className="grid gap-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="zoomJoinUrl">Zoom Join URL *</Label>
                                            <Input
                                                id="zoomJoinUrl"
                                                name="zoomJoinUrl"
                                                type="url"
                                                placeholder="https://zoom.us/j/..."
                                                required={sessionType === "LIVE_ONLINE"}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="zoomMeetingId">Meeting ID</Label>
                                            <Input
                                                id="zoomMeetingId"
                                                name="zoomMeetingId"
                                                placeholder="123 456 7890"
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="zoomPassword">Password</Label>
                                            <Input
                                                id="zoomPassword"
                                                name="zoomPassword"
                                                placeholder="Password (opsional)"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Max Participants */}
                        <div className="grid gap-2">
                            <Label htmlFor="maxParticipants">Maksimal Peserta</Label>
                            <Input
                                id="maxParticipants"
                                name="maxParticipants"
                                type="number"
                                placeholder="30"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Buat Session
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
