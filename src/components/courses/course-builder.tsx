"use client"

import { useState } from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
    GripVertical,
    FileText,
    FileQuestion,
    Calendar,
    Plus,
    Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { CreateModuleDialog } from "./create-module-dialog"
import { CreateLessonDialog } from "./create-lesson-dialog"
import { CreateQuizDialog } from "../quizzes/create-quiz-dialog"
import { EditModuleDialog } from "./edit-module-dialog"
import { EditLessonDialog } from "./edit-lesson-dialog"
import { LessonLibrary } from "./lesson-library"
import { RefineAllTitlesButton } from "./refine-all-titles-button"
import { reorderModules, reorderLessons } from "@/lib/actions/modules"
import { toast } from "sonner"

interface CourseBuilderProps {
    course: any
}

// Sortable Lesson/Quiz Item
function SortableItem({ item, type }: { item: any, type: "lesson" | "quiz" }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    }

    if (type === "lesson") {
        return (
            <div ref={setNodeRef} style={style}>
                <div className={`group flex items-center justify-between p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800/50 ${isDragging ? "bg-slate-200 dark:bg-slate-800 shadow-sm" : ""}`}>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4" />
                        </div>
                        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                        {item.title}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{item.contentType}</span>
                        <EditLessonDialog lesson={item} />
                    </div>
                </div>
            </div>
        )
    }

    // Quiz is currently not sortable in the same list as lessons in this schema, 
    // but we can render it similarly.
    return (
        <div className="flex items-center justify-between p-2 rounded bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center gap-2 text-sm text-blue-300">
                <FileQuestion className="w-4 h-4" />
                {item.title}
                <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-400">
                    {item.type}
                </Badge>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-blue-400 hover:text-blue-300">
                <Link href={`/dashboard/quizzes/${item.id}/edit`}>
                    Edit Kuis
                </Link>
            </Button>
        </div>
    )
}

// Sortable Module Card
function SortableModuleCard({
    module,
    index,
    onLessonsReorder
}: {
    module: any,
    index: number,
    onLessonsReorder: (moduleId: string, lessonIds: string[]) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: module.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 5 : 1,
    }

    const lessonSensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleLessonDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = module.Lesson.findIndex((l: any) => l.id === active.id)
            const newIndex = module.Lesson.findIndex((l: any) => l.id === over.id)
            const newLessons = arrayMove(module.Lesson, oldIndex, newIndex)
            onLessonsReorder(module.id, newLessons.map((l: any) => l.id))
        }
    }

    return (
        <div ref={setNodeRef} style={style}>
            <div className={`p-4 rounded-lg bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 ${isDragging ? "ring-2 ring-blue-500 shadow-lg" : ""}`}>
                <div className="flex items-start justify-between mb-3 group">
                    <div className="flex items-center gap-3">
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold text-sm">
                            {index + 1}
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">{module.title}</h4>
                            {module.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefineAllTitlesButton moduleId={module.id} />
                        <EditModuleDialog module={module} />
                    </div>
                </div>

                <div className="ml-11 space-y-2">
                    <DndContext
                        sensors={lessonSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleLessonDragEnd}
                    >
                        <SortableContext
                            items={module.Lesson.map((l: any) => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {module.Lesson.map((lesson: any) => (
                                <SortableItem key={lesson.id} item={lesson} type="lesson" />
                            ))}
                        </SortableContext>
                    </DndContext>

                    <div className="flex items-center gap-2 mt-2">
                        <CreateLessonDialog
                            moduleId={module.id}
                            nextOrder={(module.Lesson.length || 0) + 1}
                        />
                        <LessonLibrary moduleId={module.id} />
                    </div>

                    {/* Quizzes (Currently static, as they aren't interleaved with lessons in this schema) */}
                    <div className="mt-4 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Evaluasi / Kuis</h5>
                        {module.Quiz?.length > 0 ? (
                            module.Quiz.map((quiz: any) => (
                                <SortableItem key={quiz.id} item={quiz} type="quiz" />
                            ))
                        ) : (
                            <p className="text-xs text-slate-600 italic">Belum ada kuis evaluasi</p>
                        )}
                        <CreateQuizDialog moduleId={module.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export function CourseBuilder({ course }: CourseBuilderProps) {
    const [modules, setModules] = useState(course.Module || [])
    const [isSaving, setIsSaving] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleModuleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = modules.findIndex((m: any) => m.id === active.id)
            const newIndex = modules.findIndex((m: any) => m.id === over.id)

            const newModules = arrayMove(modules, oldIndex, newIndex)
            setModules(newModules)

            // Save to DB
            const result = await reorderModules(course.id, newModules.map((m: any) => m.id))
            if (result.success) {
                toast.success("Urutan modul diperbarui")
            } else {
                toast.error(result.error || "Gagal memperbarui urutan")
                setModules(modules) // Revert
            }
        }
    }

    const handleLessonsReorder = async (moduleId: string, lessonIds: string[]) => {
        // Update local state first for snappiness
        const newModules = modules.map((m: any) => {
            if (m.id === moduleId) {
                const oldLessons = [...m.Lesson]
                const sortedLessons = lessonIds.map(id => oldLessons.find(l => l.id === id))
                return { ...m, Lesson: sortedLessons }
            }
            return m
        })
        setModules(newModules)

        // Save to DB
        const result = await reorderLessons(moduleId, lessonIds)
        if (result.success) {
            toast.success("Urutan materi diperbarui")
        } else {
            toast.error(result.error || "Gagal memperbarui urutan")
            // Revert state would be complex here, usually rely on full refresh or fetching
            window.location.reload()
        }
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white">Modul & Materi</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <Link href={`/dashboard/courses/${course.id}/sessions`}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Kelola Sesi
                        </Link>
                    </Button>
                    <CreateModuleDialog
                        courseId={course.id}
                        nextOrder={(modules.length || 0) + 1}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {modules.length > 0 ? (
                    <div className="space-y-4">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleModuleDragEnd}
                        >
                            <SortableContext
                                items={modules.map((m: any) => m.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {modules.map((module: any, idx: number) => (
                                    <SortableModuleCard
                                        key={module.id}
                                        module={module}
                                        index={idx}
                                        onLessonsReorder={handleLessonsReorder}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500">
                        <p className="mb-4">Belum ada modul. Mulai tambahkan modul pertama Anda.</p>
                        <CreateModuleDialog
                            courseId={course.id}
                            nextOrder={1}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
