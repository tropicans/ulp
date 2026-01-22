import { GraduationCap } from "lucide-react"
import { PulseFitHero } from "@/components/ui/pulse-fit-hero"
import { prisma } from "@/lib/db"

// Force dynamic rendering so Prisma can fetch data at request time
export const dynamic = 'force-dynamic'

// Map category to display name
const categoryLabels: Record<string, string> = {
  "leadership": "LEADERSHIP",
  "digital": "DIGITAL LITERACY",
  "governance": "GOVERNANCE",
  "public-service": "PUBLIC SERVICE",
  "management": "MANAGEMENT",
  "communication": "COMMUNICATION",
}

export default async function HomePage() {
  // Get featured/published courses for the carousel
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      category: true,
      ytPlaylistId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  // Get YouTube thumbnails for courses without custom thumbnails
  const coursesWithThumbnails = await Promise.all(
    courses.map(async (course) => {
      let thumbnail = course.thumbnail
      if (!thumbnail && course.ytPlaylistId) {
        const firstVideo = await prisma.ytPlaylistItem.findFirst({
          where: { playlistId: course.ytPlaylistId },
          orderBy: { videoNo: 'asc' },
          select: { videoId: true }
        })
        if (firstVideo) {
          thumbnail = `https://i.ytimg.com/vi/${firstVideo.videoId}/maxresdefault.jpg`
        }
      }
      return { ...course, thumbnail }
    })
  )

  // Build programs array for the hero carousel
  const programs = coursesWithThumbnails.map((course) => ({
    image: course.thumbnail || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=500&fit=crop",
    category: categoryLabels[course.category?.toLowerCase() || ""] || course.category?.toUpperCase() || "LEARNING",
    title: course.title,
    href: `/courses/${course.slug}`,
  }))

  // Fallback to default programs if no courses
  const defaultPrograms = [
    {
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=500&fit=crop",
      category: "DIGITAL LITERACY",
      title: "Transformasi Digital Sektor Publik",
      href: "/courses",
    },
    {
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=500&fit=crop",
      category: "LEADERSHIP",
      title: "Manajemen Perubahan & Kepemimpinan",
      href: "/courses",
    },
    {
      image: "https://images.unsplash.com/photo-1454165833767-02a9e406f0a5?w=400&h=500&fit=crop",
      category: "PUBLIC SERVICE",
      title: "Etika & Standar Pelayanan Publik",
      href: "/courses",
    },
    {
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=500&fit=crop",
      category: "GOVERNANCE",
      title: "Akuntabilitas & Tata Kelola Pemerintahan",
      href: "/courses",
    },
  ]

  return (
    <div className="min-h-screen">
      <HomePageClient programs={programs.length > 0 ? programs : defaultPrograms} />
    </div>
  )
}

// Client component for interactivity
import { HomePageClient } from "@/components/home/home-page-client"
