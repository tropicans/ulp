"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { CalendarIcon, Search, X, Filter } from "lucide-react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { getCourseListForFilter } from "@/lib/actions/xapi-extended-analytics"

export interface FilterState {
    dateFrom?: Date
    dateTo?: Date
    verb?: string
    courseId?: string
    actorEmail?: string
}

interface XAPIFiltersProps {
    onFilterChange: (filters: FilterState) => void
    initialFilters?: FilterState
}

const VERB_OPTIONS = [
    { value: "", label: "Semua Aktivitas" },
    { value: "http://adlnet.gov/expapi/verbs/registered", label: "Enrolled" },
    { value: "http://adlnet.gov/expapi/verbs/completed", label: "Completed" },
    { value: "http://adlnet.gov/expapi/verbs/passed", label: "Passed" },
    { value: "http://adlnet.gov/expapi/verbs/failed", label: "Failed" },
    { value: "https://w3id.org/xapi/video/verbs/played", label: "Video Played" },
    { value: "https://w3id.org/xapi/video/verbs/paused", label: "Video Paused" },
]

export function XAPIFilters({ onFilterChange, initialFilters = {} }: XAPIFiltersProps) {
    const [filters, setFilters] = useState<FilterState>(initialFilters)
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
    const [isExpanded, setIsExpanded] = useState(false)

    // Load course list
    useEffect(() => {
        getCourseListForFilter().then(setCourses)
    }, [])

    // Notify parent when filters change
    const updateFilter = (key: keyof FilterState, value: any) => {
        const newFilters = { ...filters, [key]: value || undefined }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const clearFilters = () => {
        const emptyFilters: FilterState = {}
        setFilters(emptyFilters)
        onFilterChange(emptyFilters)
    }

    const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.verb || filters.courseId || filters.actorEmail

    return (
        <div className="space-y-3">
            {/* Compact view - always visible */}
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={hasActiveFilters ? "border-indigo-500 text-indigo-600" : ""}
                >
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                    {hasActiveFilters && (
                        <span className="ml-2 w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">
                            {Object.values(filters).filter(Boolean).length}
                        </span>
                    )}
                </Button>

                {/* Quick date filters */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-[130px]">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {filters.dateFrom ? format(filters.dateFrom, "dd MMM", { locale: localeId }) : "Dari"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={filters.dateFrom}
                            onSelect={(date) => updateFilter("dateFrom", date)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <span className="text-slate-400">—</span>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-[130px]">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {filters.dateTo ? format(filters.dateTo, "dd MMM", { locale: localeId }) : "Sampai"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={filters.dateTo}
                            onSelect={(date) => updateFilter("dateTo", date)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* Clear filters button */}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                        <X className="w-4 h-4 mr-1" />
                        Reset
                    </Button>
                )}
            </div>

            {/* Expanded view - additional filters */}
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    {/* Verb Type */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Jenis Aktivitas</label>
                        <Select value={filters.verb || ""} onValueChange={(val) => updateFilter("verb", val)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih aktivitas..." />
                            </SelectTrigger>
                            <SelectContent>
                                {VERB_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value || "all"}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Course */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Kursus</label>
                        <Select value={filters.courseId || ""} onValueChange={(val) => updateFilter("courseId", val)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih kursus..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kursus</SelectItem>
                                {courses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Learner Search */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Cari Learner</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Email learner..."
                                value={filters.actorEmail || ""}
                                onChange={(e) => updateFilter("actorEmail", e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
