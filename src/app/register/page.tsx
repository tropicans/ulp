"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { GraduationCap, ArrowRight, Github, Chrome, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const registerSchema = z.object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    nip: z.string().min(1, "NIP wajib diisi"),
})

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            nip: "",
        },
    })

    async function onSubmit(values: z.infer<typeof registerSchema>) {
        setIsLoading(true)
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            const data = await response.json()

            if (response.ok) {
                toast.success("Registrasi berhasil! Silakan login.")
                router.push("/login")
            } else {
                toast.error(data.error || "Registrasi gagal")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 mb-4 animate-bounce-slow">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Daftar Akun LXP</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Mulai perjalanan belajar mandiri Anda hari ini</p>
                </div>

                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border-t-blue-500/30 border-t-2">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl text-slate-900 dark:text-white">Buat Akun Baru</CardTitle>
                        <CardDescription className="text-slate-500 italic">Lengkapi data diri Anda di bawah ini</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nama Lengkap</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Nama Sesuai KTP"
                                                    {...field}
                                                    className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="nip"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">NIP / ID Kepegawaian</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Masukkan NIP"
                                                    {...field}
                                                    className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Alamat Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="nama@instansi.go.id"
                                                    {...field}
                                                    className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Kata Sandi</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                    className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-blue-900/40 mt-6"
                                    type="submit"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    ) : (
                                        <>
                                            Daftar Sekarang
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-800 py-6 bg-slate-50 dark:bg-slate-950/30">
                        <p className="text-sm text-slate-500">
                            Sudah punya akun?{" "}
                            <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                                Login di sini
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
