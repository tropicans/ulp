"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { useCallback, useState, useTransition } from "react"

interface AdminCourseFiltersProps {
    deliveryModes: string[]
}

export function AdminCourseFilters({ deliveryModes }: AdminCourseFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const currentSearch = searchParams.get("search") || ""
    const currentStatus = searchParams.get("status") || "all"
    const currentMode = searchParams.get("mode") || "all"

    const [searchValue, setSearchValue] = useState(currentSearch)

    const createQueryString = useCallback(
        (params: Record<string, string | null>) => {
            const newParams = new URLSearchParams(searchParams.toString())

            Object.entries(params).forEach(([key, value]) => {
                if (value === null || value === "" || value === "all") {
                    newParams.delete(key)
                } else {
                    newParams.set(key, value)
                }
            })

            return newParams.toString()
        },
        [searchParams]
    )

    const updateFilter = (key: string, value: string) => {
        startTransition(() => {
            const queryString = createQueryString({ [key]: value })
            router.push(`${pathname}${queryString ? `?${queryString}` : ""}`)
        })
    }

    const handleSearch = () => {
        updateFilter("search", searchValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    const clearFilters = () => {
        setSearchValue("")
        startTransition(() => {
            router.push(pathname)
        })
    }

    const hasActiveFilters = currentSearch || currentStatus !== "all" || currentMode !== "all"

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            {/* Search */}
            <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari kursus..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                </div>
                <Button onClick={handleSearch} variant="outline" className="border-slate-200 dark:border-slate-700">
                    Cari
                </Button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
                <select
                    value={currentStatus}
                    onChange={(e) => updateFilter("status", e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300"
                >
                    <option value="all">Semua Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                </select>

                {/* Delivery Mode Filter */}
                <select
                    value={currentMode}
                    onChange={(e) => updateFilter("mode", e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300"
                >
                    <option value="all">Semua Mode</option>
                    {deliveryModes.map((mode) => (
                        <option key={mode} value={mode}>{mode.replace(/_/g, " ")}</option>
                    ))}
                </select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <Button
                        onClick={clearFilters}
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {isPending && (
                <div className="flex items-center text-sm text-slate-500">
                    <span className="animate-pulse">Loading...</span>
                </div>
            )}
        </div>
    )
}
