"use server"

import { prisma } from "@/lib/db"
import { DeliveryMode, Difficulty, Role, BadgeType, SessionType } from "@/generated/prisma"
import bcrypt from "bcryptjs"
import { createId } from "@paralleldrive/cuid2"

export async function seedSampleCourses() {
    try {
        // First, create test users for each role
        const testUsers = [
            {
                id: createId(),
                nip: "199001012020121001",
                email: "admin@lxp.go.id",
                name: "Super Admin",
                password: await bcrypt.hash("admin123", 10),
                role: Role.SUPER_ADMIN,
                unitKerja: "Sekretariat Negara",
                jabatan: "Administrator Sistem",
                updatedAt: new Date(),
            },
            {
                id: createId(),
                nip: "199002022020122002",
                email: "adminunit@lxp.go.id",
                name: "Admin Unit Kerja",
                password: await bcrypt.hash("admin123", 10),
                role: Role.ADMIN_UNIT,
                unitKerja: "Pusdiklat Kemensetneg",
                jabatan: "Kepala Bidang Pelatihan",
                updatedAt: new Date(),
            },
            {
                id: createId(),
                nip: "198505152010121003",
                email: "instructor@lxp.go.id",
                name: "Dr. Budi Santoso",
                password: await bcrypt.hash("instructor123", 10),
                role: Role.INSTRUCTOR,
                unitKerja: "Pusdiklat Kemensetneg",
                jabatan: "Widyaiswara Ahli Utama",
                updatedAt: new Date(),
            },
            {
                id: createId(),
                nip: "199203032019031004",
                email: "learner@lxp.go.id",
                name: "Siti Aminah",
                password: await bcrypt.hash("learner123", 10),
                role: Role.LEARNER,
                unitKerja: "Biro Umum",
                jabatan: "Pelaksana",
                updatedAt: new Date(),
            }
        ]

        // Create users (skip if already exists)
        for (const userData of testUsers) {
            const existing = await prisma.user.findUnique({ where: { email: userData.email } })
            if (!existing) {
                await prisma.user.create({ data: userData })
            }
        }

        // Get instructor for courses
        const instructor = await prisma.user.findFirst({
            where: { role: { in: [Role.INSTRUCTOR, Role.SUPER_ADMIN] } }
        })

        if (!instructor) {
            return { error: "Failed to find instructor" }
        }

        // Create sample courses with different delivery modes
        const courses = [
            {
                id: createId(),
                title: "Pelatihan Kepemimpinan Lingkungan Digital",
                slug: "pelatihan-kepemimpinan-digital-" + createId().substring(0, 6),
                description: "Program intensif tatap muka untuk mengembangkan kompetensi kepemimpinan di era transformasi digital pemerintahan.",
                deliveryMode: DeliveryMode.ON_CLASSROOM,
                difficulty: Difficulty.INTERMEDIATE,
                category: "Leadership",
                instructorId: instructor.id,
                isPublished: true,
                duration: 24,
                updatedAt: new Date(),
            },
            {
                id: createId(),
                title: "Dasar-Dasar Administrasi Publik Modern",
                slug: "administrasi-publik-modern-" + createId().substring(0, 6),
                description: "Kursus hybrid yang menggabungkan sesi webinar live dan materi mandiri tentang tata kelola administrasi modern.",
                deliveryMode: DeliveryMode.HYBRID,
                difficulty: Difficulty.BEGINNER,
                category: "Administration",
                instructorId: instructor.id,
                isPublished: true,
                duration: 16,
                updatedAt: new Date(),
            },
            {
                id: createId(),
                title: "Literasi Data untuk Pengambilan Kebijakan",
                slug: "literasi-data-kebijakan-" + createId().substring(0, 6),
                description: "Pelatihan asinkronus (E-Learning) tentang cara mengolah dan menganalisis data untuk mendukung data-driven policy making.",
                deliveryMode: DeliveryMode.ASYNC_ONLINE,
                difficulty: Difficulty.ADVANCED,
                category: "Data Science",
                instructorId: instructor.id,
                isPublished: true,
                duration: 40,
                updatedAt: new Date(),
            },
        ]

        const badges = [
            {
                id: "badge-first-step",
                name: "Langkah Pertama",
                description: "Menyelesaikan materi pertama Anda",
                icon: "Footprints",
                type: BadgeType.ACHIEVEMENT,
                points: 10,
                criteria: { type: "lesson_count", count: 1 }
            },
            {
                id: "badge-quiz-master",
                name: "Quiz Master",
                description: "Mendapatkan nilai 100% pada sebuah kuis",
                icon: "Brain",
                type: BadgeType.ACHIEVEMENT,
                points: 50,
                criteria: { type: "quiz_perfect", count: 1 }
            },
            {
                id: "badge-streak-3",
                name: "Belajar Tekun",
                description: "Mempertahankan streak belajar selama 3 hari berturut-turut",
                icon: "Flame",
                type: BadgeType.STREAK,
                points: 30,
                criteria: { type: "streak_days", count: 3 }
            },
            {
                id: "badge-course-finisher",
                name: "Penuntas Kursus",
                description: "Menyelesaikan satu kursus penuh",
                icon: "Award",
                type: BadgeType.MILESTONE,
                points: 100,
                criteria: { type: "course_complete", count: 1 }
            }
        ]

        // Seed badges
        for (const badge of badges) {
            await prisma.badge.upsert({
                where: { id: badge.id },
                update: badge,
                create: badge,
            })
        }

        const createdCourses = []
        for (const courseData of courses) {
            const course = await prisma.course.create({
                data: {
                    ...courseData,
                    Module: {
                        create: [
                            {
                                id: createId(),
                                title: "Pendahuluan",
                                order: 1,
                                updatedAt: new Date(),
                                Lesson: {
                                    create: [
                                        {
                                            id: createId(),
                                            title: "Pengenalan Kursus",
                                            order: 1,
                                            contentType: "VIDEO",
                                            videoUrl: "https://example.com/video1",
                                            duration: 15,
                                            updatedAt: new Date(),
                                        },
                                        {
                                            id: createId(),
                                            title: "Tujuan Pembelajaran",
                                            order: 2,
                                            contentType: "ARTICLE",
                                            content: "Materi tulisan tentang tujuan pembelajaran...",
                                            duration: 10,
                                            updatedAt: new Date(),
                                        }
                                    ]
                                }
                            },
                            {
                                id: createId(),
                                title: "Materi Inti",
                                order: 2,
                                updatedAt: new Date(),
                                Lesson: {
                                    create: [
                                        {
                                            id: createId(),
                                            title: "Konsep Dasar",
                                            order: 1,
                                            contentType: "DOCUMENT",
                                            fileUrl: "https://example.com/doc1.pdf",
                                            duration: 30,
                                            updatedAt: new Date(),
                                        },
                                        {
                                            id: createId(),
                                            title: "Studi Kasus",
                                            order: 2,
                                            contentType: "VIDEO",
                                            videoUrl: "https://example.com/video2",
                                            duration: 45,
                                            updatedAt: new Date(),
                                        }
                                    ]
                                }
                            },
                            {
                                id: createId(),
                                title: "Penutup",
                                order: 3,
                                updatedAt: new Date(),
                                Lesson: {
                                    create: [
                                        {
                                            id: createId(),
                                            title: "Rangkuman",
                                            order: 1,
                                            contentType: "ARTICLE",
                                            content: "Rangkuman materi pembelajaran...",
                                            duration: 10,
                                            updatedAt: new Date(),
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            })
            createdCourses.push(course)
        }

        // Create CourseSessions for non-ASYNC courses
        const now = new Date()
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

        for (const course of createdCourses) {
            if (course.deliveryMode === DeliveryMode.ON_CLASSROOM) {
                // Tatap Muka - Classroom sessions only
                await prisma.courseSession.createMany({
                    data: [
                        {
                            id: createId(),
                            courseId: course.id,
                            title: "Sesi Kelas 1: Orientasi",
                            type: SessionType.CLASSROOM,
                            startTime: new Date(tomorrow.setHours(9, 0, 0, 0)),
                            endTime: new Date(tomorrow.setHours(12, 0, 0, 0)),
                            location: "Ruang Pelatihan A, Gedung Pusdiklat Lt. 3",
                            address: "Jl. Veteran III No. 21, Jakarta Pusat",
                            maxParticipants: 30,
                            updatedAt: new Date(),
                        },
                        {
                            id: createId(),
                            courseId: course.id,
                            title: "Sesi Kelas 2: Workshop Praktik",
                            type: SessionType.CLASSROOM,
                            startTime: new Date(nextWeek.setHours(9, 0, 0, 0)),
                            endTime: new Date(nextWeek.setHours(16, 0, 0, 0)),
                            location: "Lab Komputer B, Gedung Pusdiklat Lt. 2",
                            address: "Jl. Veteran III No. 21, Jakarta Pusat",
                            maxParticipants: 25,
                            updatedAt: new Date(),
                        },
                    ]
                })
            } else if (course.deliveryMode === DeliveryMode.HYBRID) {
                // Hybrid - Mix of classroom and online
                await prisma.courseSession.createMany({
                    data: [
                        {
                            id: createId(),
                            courseId: course.id,
                            title: "Webinar Pembukaan",
                            type: SessionType.LIVE_ONLINE,
                            startTime: new Date(tomorrow.setHours(13, 0, 0, 0)),
                            endTime: new Date(tomorrow.setHours(15, 0, 0, 0)),
                            zoomMeetingId: "123-456-789",
                            zoomJoinUrl: "https://zoom.us/j/123456789",
                            zoomPassword: "abc123",
                            maxParticipants: 100,
                            updatedAt: new Date(),
                        },
                        {
                            id: createId(),
                            courseId: course.id,
                            title: "Kelas Tatap Muka: Diskusi Kelompok",
                            type: SessionType.CLASSROOM,
                            startTime: new Date(nextWeek.setHours(9, 0, 0, 0)),
                            endTime: new Date(nextWeek.setHours(12, 0, 0, 0)),
                            location: "Ruang Diskusi C, Gedung Pusdiklat Lt. 4",
                            address: "Jl. Veteran III No. 21, Jakarta Pusat",
                            maxParticipants: 20,
                            updatedAt: new Date(),
                        },
                        {
                            id: createId(),
                            courseId: course.id,
                            title: "Webinar Penutupan & Evaluasi",
                            type: SessionType.LIVE_ONLINE,
                            startTime: new Date(twoWeeks.setHours(14, 0, 0, 0)),
                            endTime: new Date(twoWeeks.setHours(16, 0, 0, 0)),
                            zoomMeetingId: "987-654-321",
                            zoomJoinUrl: "https://zoom.us/j/987654321",
                            zoomPassword: "xyz789",
                            maxParticipants: 100,
                            updatedAt: new Date(),
                        },
                    ]
                })
            }
            // ASYNC_ONLINE doesn't have sessions
        }

        return {
            success: true,
            message: "✅ Seed completed successfully!",
            users: {
                superAdmin: { email: "admin@lxp.go.id", password: "admin123" },
                adminUnit: { email: "adminunit@lxp.go.id", password: "admin123" },
                instructor: { email: "instructor@lxp.go.id", password: "instructor123" },
                learner: { email: "learner@lxp.go.id", password: "learner123" },
            }
        }
    } catch (error) {
        console.error("Seed error:", error)
        return { error: "Gagal seeding: " + (error as Error).message }
    }
}
