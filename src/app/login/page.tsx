"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

function LoginContent() {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
    const error = searchParams.get("error")

    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const username = formData.get("username") as string
        const password = formData.get("password") as string

        try {
            const result = await signIn("ldap", {
                username,
                password,
                redirect: false,
                callbackUrl,
            })

            if (result?.error) {
                toast.error("Login gagal", {
                    description: "Username atau password tidak valid",
                })
            } else if (result?.ok) {
                toast.success("Login berhasil")
                window.location.href = callbackUrl
            }
        } catch {
            toast.error("Terjadi kesalahan", {
                description: "Tidak dapat terhubung ke server",
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleGoogleLogin() {
        setIsGoogleLoading(true)
        try {
            await signIn("google", { callbackUrl })
        } catch {
            toast.error("Gagal login dengan Google")
            setIsGoogleLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-100">
                <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
                    Sign in to your account
                </h1>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                        {error === "CredentialsSignin"
                            ? "Username atau password tidak valid"
                            : error === "OAuthAccountNotLinked"
                                ? "Email sudah terdaftar dengan metode lain"
                                : "Terjadi kesalahan saat login"}
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-600 font-medium">
                            Username
                        </Label>
                        <div className="relative">
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                required
                                autoComplete="username"
                                autoFocus
                                disabled={isLoading}
                                className="border-gray-300 focus:border-rose-400 focus:ring-rose-400/20 pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-6 h-6 rounded bg-rose-400 flex items-center justify-center">
                                    <span className="text-white text-xs">···</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-600 font-medium">
                            Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                disabled={isLoading}
                                className="border-gray-300 focus:border-rose-400 focus:ring-rose-400/20 pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-6 h-6 rounded bg-rose-400 flex items-center justify-center">
                                    <span className="text-white text-xs">···</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-rose-400 hover:bg-rose-500 text-white h-11 text-base font-medium"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-4 text-gray-500">Or sign in with</span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 h-11"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                >
                    {isGoogleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    )}
                    Google
                </Button>
            </div>
        </div>
    )
}

function LoginFallback() {
    return (
        <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-100">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mx-auto mb-8" />
                <div className="space-y-5">
                    <div className="space-y-2">
                        <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                        <div className="h-10 w-full bg-gray-100 animate-pulse rounded" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                        <div className="h-10 w-full bg-gray-100 animate-pulse rounded" />
                    </div>
                    <div className="h-11 w-full bg-rose-200 animate-pulse rounded" />
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-50 p-4 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-20 left-20 w-32 h-32 border-2 border-rose-200 rotate-45 opacity-50" />
            <div className="absolute top-40 right-40 w-16 h-16 border-2 border-rose-300 opacity-30" />
            <div className="absolute bottom-20 left-32 w-8 h-8 rounded-full border-2 border-rose-200 opacity-40" />
            <div className="absolute bottom-40 right-20 w-24 h-24 border-l-4 border-b-4 border-rose-300 opacity-40" />
            <div className="absolute top-1/4 left-1/4 grid grid-cols-6 gap-2 opacity-20">
                {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-rose-300" />
                ))}
            </div>

            <Suspense fallback={<LoginFallback />}>
                <LoginContent />
            </Suspense>
        </div>
    )
}

