"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
    name: string
    image?: string | null
    className?: string
}

export function UserAvatar({ name, image, className }: UserAvatarProps) {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)

    return (
        <Avatar className={cn("h-8 w-8", className)}>
            <AvatarImage src={image || ""} alt={name} />
            <AvatarFallback className="bg-slate-800 text-slate-400 font-medium">
                {initials}
            </AvatarFallback>
        </Avatar>
    )
}
