"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

export function ThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-200 dark:border-white/5" />
        )
    }

    const isDark = resolvedTheme === "dark"

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-lg overflow-hidden group"
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={isDark ? "dark" : "light"}
                    initial={{ y: 20, opacity: 0, rotate: -45 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {isDark ? (
                        <Moon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    ) : (
                        <Sun className="w-5 h-5 text-orange-500 group-hover:text-orange-600 transition-colors" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Background Glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity blur-xl ${isDark ? 'bg-indigo-500' : 'bg-orange-500'}`} />
        </motion.button>
    )
}
