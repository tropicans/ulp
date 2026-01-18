"use client"

import { seedSampleCourses } from "@/lib/seed-data"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function SeedPage() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const router = useRouter()

    const runSeed = async () => {
        setLoading(true)
        const res = await seedSampleCourses()
        setResult(res)
        setLoading(false)
        if (res.success) {
            setTimeout(() => router.push("/courses"), 2000)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold">Seed Sample Data</h1>
                <Button onClick={runSeed} disabled={loading}>
                    {loading ? "Seeding..." : "Run Seed"}
                </Button>
                {result && (
                    <pre className="p-4 bg-slate-800 rounded mt-4 text-xs text-left overflow-auto max-w-md">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    )
}
