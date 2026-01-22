"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { CourseSidebar } from "./course-sidebar"

interface MobileSidebarProps {
    course: any
    modules: any[]
    currentLessonId?: string
    currentQuizId?: string
    progress: any
}

export function MobileSidebar({
    course,
    modules,
    currentLessonId,
    currentQuizId,
    progress
}: MobileSidebarProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Mobile Toggle Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="lg:hidden text-slate-500 dark:text-slate-400"
            >
                <Menu className="w-5 h-5" />
            </Button>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Sidebar */}
                    <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300">
                        {/* Close Button */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Daftar Materi</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Sidebar Content */}
                        <div onClick={() => setIsOpen(false)}>
                            <CourseSidebar
                                course={course}
                                modules={modules}
                                currentLessonId={currentLessonId}
                                currentQuizId={currentQuizId}
                                progress={progress}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
