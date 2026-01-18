"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BookOpen, Users, BarChart } from "lucide-react"
import { DeliveryMode, Difficulty } from "@/generated/prisma"
import { deliveryModeConfig } from "@/lib/utils/delivery-modes"
import { UserAvatar } from "../ui/user-avatar"

interface CourseCardProps {
    course: {
        id: string
        title: string
        slug: string
        description: string
        thumbnail: string | null
        deliveryMode: DeliveryMode
        difficulty: Difficulty
        category: string | null
        User: {
            name: string
            image: string | null
        }
        _count: {
            Enrollment: number
        }
    }
}

const difficultyLabels: Record<Difficulty, string> = {
    BEGINNER: "Pemula",
    INTERMEDIATE: "Menengah",
    ADVANCED: "Lanjut",
}

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

export function CourseCard({ course }: CourseCardProps) {
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const mouseXSpring = useSpring(x)
    const mouseYSpring = useSpring(y)

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"])
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"])

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const xPct = mouseX / width - 0.5
        const yPct = mouseY / height - 0.5
        x.set(xPct)
        y.set(yPct)
    }

    const handleMouseLeave = () => {
        x.set(0)
        y.set(0)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
            }}
            className="group relative"
        >
            <Card
                glass
                className="overflow-hidden border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 backdrop-blur-md group-hover:border-blue-500/50 transition-colors duration-300 h-full flex flex-col pt-0 pb-4 shadow-xl"
            >
                <div className="relative aspect-video overflow-hidden rounded-t-xl">
                    {course.thumbnail ? (
                        <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-60" />
                    <div className="absolute top-3 left-3 flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge className={`${deliveryModeConfig[course.deliveryMode].color} text-white border-none shadow-lg`}>
                                        {deliveryModeConfig[course.deliveryMode].label}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <p className="font-semibold text-slate-900 dark:text-white">{deliveryModeConfig[course.deliveryMode].label}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">{deliveryModeConfig[course.deliveryMode].fullDescription}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <UserAvatar className="w-6 h-6 ring-1 ring-white/10" name={course.User?.name || ""} image={course.User?.image || ""} />
                            <span className="text-xs text-slate-400 font-medium">{course.User?.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-bold">{course._count.Enrollment}</span>
                        </div>
                    </div>
                    <CardTitle className="text-lg text-slate-900 dark:text-white line-clamp-2 min-h-[3.5rem] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {course.title}
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex-grow">
                    <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                        {course.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
                                <Users className="w-3 h-3" />
                            </div>
                            <span className="font-bold tracking-tight">{course._count.Enrollment} Peserta</span>
                        </div>
                        <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-[10px] uppercase tracking-widest font-black text-slate-500">
                            {difficultyLabels[course.difficulty]}
                        </Badge>
                    </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                    <Link href={`/courses/${course.slug}`} className="w-full">
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20">
                            Lihat Detail
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </motion.div>
    )
}
