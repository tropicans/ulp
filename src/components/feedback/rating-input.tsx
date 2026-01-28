"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingInputProps {
    value: number
    onChange: (value: number) => void
    label: string
    description?: string
    required?: boolean
    disabled?: boolean
}

export function RatingInput({
    value,
    onChange,
    label,
    description,
    required = false,
    disabled = false
}: RatingInputProps) {
    const [hoverValue, setHoverValue] = useState(0)

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {description && (
                <p className="text-xs text-gray-500">{description}</p>
            )}
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={disabled}
                        className={cn(
                            "p-1 rounded-full transition-all duration-150",
                            "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400",
                            disabled && "cursor-not-allowed opacity-50"
                        )}
                        onMouseEnter={() => setHoverValue(star)}
                        onMouseLeave={() => setHoverValue(0)}
                        onClick={() => onChange(star)}
                    >
                        <Star
                            className={cn(
                                "w-8 h-8 transition-colors",
                                (hoverValue || value) >= star
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-gray-200 text-gray-300"
                            )}
                        />
                    </button>
                ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>Buruk</span>
                <span>Sangat Baik</span>
            </div>
        </div>
    )
}
