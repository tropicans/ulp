"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock } from "lucide-react";
import Link from "next/link";
import { DeliveryMode, Difficulty } from "@/generated/prisma";

interface CourseCardProps {
    course: {
        id: string;
        title: string;
        slug: string;
        description: string;
        thumbnail?: string | null;
        deliveryMode: DeliveryMode;
        difficulty: Difficulty;
        category?: string | null;
        duration?: number | null;
        User: {
            name: string | null;
            image?: string | null;
        };
        _count: {
            Enrollment: number;
        };
    };
}

const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
        case "BEGINNER": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        case "INTERMEDIATE": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
        case "ADVANCED": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
        default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
};

function CourseCardComponent({ course }: CourseCardProps) {
    return (
        <Link href={`/courses/${course.slug}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                {course.thumbnail && (
                    <div className="aspect-video relative overflow-hidden rounded-t-lg bg-muted">
                        <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="object-cover w-full h-full"
                            loading="lazy"
                        />
                    </div>
                )}
                <CardHeader>
                    <div className="flex gap-2 mb-2">
                        <Badge className={getDifficultyColor(course.difficulty)}>
                            {course.difficulty}
                        </Badge>
                        {course.category && (
                            <Badge variant="outline">{course.category}</Badge>
                        )}
                    </div>
                    <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                        {course.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{course._count.Enrollment} enrolled</span>
                        </div>
                        {course.duration && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{course.duration} hours</span>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                    By {course.User.name}
                </CardFooter>
            </Card>
        </Link>
    );
}

// Memoize to prevent re-renders when parent re-renders
export const CourseCard = React.memo(CourseCardComponent);
