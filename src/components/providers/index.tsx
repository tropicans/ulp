"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { SessionProvider } from "./session-provider"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <SessionProvider>
                {children}
                <Toaster richColors position="top-center" />
            </SessionProvider>
        </NextThemesProvider>
    )
}
