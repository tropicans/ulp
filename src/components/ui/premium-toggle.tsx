"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleOption {
    value: string
    label: string
}

interface PremiumToggleProps {
    options: ToggleOption[]
    value: string
    onChange: (value: string) => void
    className?: string
}

export function PremiumToggle({ options, value, onChange, className }: PremiumToggleProps) {
    return (
        <div className={cn(
            "flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl",
            className
        )}>
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        value === option.value
                            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40"
                            : "text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}
