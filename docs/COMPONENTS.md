# Component Library - ULP ASN

Dokumen ini menjelaskan komponen UI reusable yang tersedia dalam aplikasi TITAN ULP.

---

## 📚 Struktur Komponen

```
src/components/
├── admin/           # Komponen khusus admin
├── auth/            # Login, Register forms
├── course/          # Course detail components
├── courses/         # Course listing & cards
├── dashboard/       # Dashboard widgets
├── home/            # Homepage components
├── learning/        # Learning interface
├── navigation/      # Header, Footer, Sidebar
├── providers/       # Context providers
├── quizzes/         # Quiz components
├── sessions/        # Session & attendance
├── sync-course/     # Sync course components
└── ui/              # shadcn/ui base components
```

---

## 🎨 UI Components (shadcn/ui)

Komponen dasar dari shadcn/ui yang di-customize:

### Button

```tsx
import { Button } from "@/components/ui/button"

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Description of the dialog content.
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Form Components

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

// Text Input
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter name" />
</div>

// Select
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Table

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>Active</TableCell>
      <TableCell>
        <Button size="sm">Edit</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="modules">Modules</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    Overview content
  </TabsContent>
  <TabsContent value="modules">
    Modules content
  </TabsContent>
</Tabs>
```

---

## 📖 Course Components

### CourseCard

Menampilkan card preview untuk kursus.

```tsx
import { CourseCard } from "@/components/courses/course-card"

<CourseCard 
  course={{
    id: "course-id",
    title: "Course Title",
    slug: "course-slug",
    description: "Course description",
    thumbnail: "/thumbnail.jpg",
    deliveryMode: "ASYNC_ONLINE",
    difficulty: "BEGINNER",
    duration: 120,
    instructor: { name: "Dr. Budi" }
  }}
  enrolled={false}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `course` | `Course` | Data kursus |
| `enrolled` | `boolean` | Status enrollment |
| `showProgress` | `boolean` | Tampilkan progress bar |
| `progress` | `number` | Persentase progress (0-100) |

### CourseGrid

Grid layout untuk daftar kursus.

```tsx
import { CourseGrid } from "@/components/courses/course-grid"

<CourseGrid 
  courses={courses}
  enrolledIds={["course-1", "course-2"]}
/>
```

### DeliveryModeBadge

Badge untuk mode pembelajaran.

```tsx
import { DeliveryModeBadge } from "@/components/courses/delivery-mode-badge"

<DeliveryModeBadge mode="HYBRID" />
// Output: Badge dengan ikon dan label "Hybrid"
```

### DifficultyBadge

Badge untuk tingkat kesulitan.

```tsx
import { DifficultyBadge } from "@/components/courses/difficulty-badge"

<DifficultyBadge difficulty="INTERMEDIATE" />
```

---

## 📝 Learning Components

### VideoPlayer

Player video dengan tracking progress.

```tsx
import { VideoPlayer } from "@/components/learning/video-player"

<VideoPlayer
  lessonId="lesson-id"
  videoUrl="https://youtube.com/watch?v=..."
  onComplete={() => handleComplete()}
  onProgress={(seconds) => handleProgress(seconds)}
/>
```

### LessonContent

Menampilkan konten lesson sesuai tipe.

```tsx
import { LessonContent } from "@/components/learning/lesson-content"

<LessonContent
  lesson={lesson}
  onComplete={handleComplete}
/>
```

### ProgressTracker

Sidebar tracking progress kursus.

```tsx
import { ProgressTracker } from "@/components/learning/progress-tracker"

<ProgressTracker
  modules={modules}
  currentLessonId="current-lesson"
  progress={progressData}
/>
```

---

## 📋 Quiz Components

### QuizCard

Card untuk memulai quiz.

```tsx
import { QuizCard } from "@/components/quizzes/quiz-card"

<QuizCard
  quiz={quiz}
  onStart={() => startQuiz()}
  attempts={2}
  maxAttempts={3}
/>
```

### QuizQuestion

Menampilkan satu pertanyaan quiz.

```tsx
import { QuizQuestion } from "@/components/quizzes/quiz-question"

<QuizQuestion
  question={question}
  index={0}
  answer={selectedAnswer}
  onChange={(answer) => setAnswer(answer)}
  showFeedback={false}
/>
```

### QuizResult

Menampilkan hasil quiz.

```tsx
import { QuizResult } from "@/components/quizzes/quiz-result"

<QuizResult
  attempt={attemptData}
  quiz={quizData}
  onRetry={() => retryQuiz()}
/>
```

---

## 📅 Session Components

### SessionCard

Card untuk session tatap muka/online.

```tsx
import { SessionCard } from "@/components/sessions/session-card"

<SessionCard
  session={session}
  onCheckIn={() => handleCheckIn()}
  userAttendance={attendanceData}
/>
```

### QRScanner

Scanner QR code untuk check-in.

```tsx
import { QRScanner } from "@/components/sessions/qr-scanner"

<QRScanner
  onScan={(token) => handleQRScan(token)}
  onError={(error) => handleError(error)}
/>
```

### AttendanceList

Daftar kehadiran session.

```tsx
import { AttendanceList } from "@/components/sessions/attendance-list"

<AttendanceList
  sessionId="session-id"
  attendance={attendanceData}
  onUpdateStatus={(id, status) => updateStatus(id, status)}
/>
```

---

## 🏢 Dashboard Components

### StatsCard

Card statistik untuk dashboard.

```tsx
import { StatsCard } from "@/components/dashboard/stats-card"

<StatsCard
  title="Total Learners"
  value={1234}
  icon={<Users />}
  trend={{ value: 12, direction: "up" }}
/>
```

### ActivityFeed

Feed aktivitas terbaru.

```tsx
import { ActivityFeed } from "@/components/dashboard/activity-feed"

<ActivityFeed
  activities={recentActivities}
  maxItems={5}
/>
```

### LeaderboardWidget

Widget leaderboard untuk gamifikasi.

```tsx
import { LeaderboardWidget } from "@/components/dashboard/leaderboard-widget"

<LeaderboardWidget
  players={topPlayers}
  currentUserId="user-id"
/>
```

---

## 🧭 Navigation Components

### SiteHeader

Header utama aplikasi.

```tsx
import { SiteHeader } from "@/components/navigation/site-header"

<SiteHeader 
  user={sessionUser}
  notifications={notifications}
/>
```

### Sidebar

Sidebar navigasi dashboard.

```tsx
import { Sidebar } from "@/components/navigation/sidebar"

<Sidebar
  user={sessionUser}
  currentPath="/dashboard/courses"
/>
```

### Footer

Footer aplikasi.

```tsx
import { Footer } from "@/components/navigation/footer"

<Footer />
```

---

## 🎯 Providers

### ThemeProvider

Provider untuk dark/light mode.

```tsx
import { ThemeProvider } from "@/components/providers/theme-provider"

<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
>
  <App />
</ThemeProvider>
```

### LanguageProvider

Provider untuk multi-bahasa (ID/EN).

```tsx
import { LanguageProvider, useLanguage } from "@/components/providers/language-provider"

// Wrap app
<LanguageProvider>
  <App />
</LanguageProvider>

// Use in component
const { language, setLanguage, t } = useLanguage()

<Button onClick={() => setLanguage("id")}>
  {t("changeLanguage")}
</Button>
```

---

## 🎨 Styling Conventions

### Tailwind CSS Classes

```tsx
// Spacing
className="p-4 m-2"           // Padding & margin
className="space-y-4"         // Vertical spacing
className="gap-4"             // Grid/flex gap

// Typography
className="text-lg font-bold" // Large bold text
className="text-muted-foreground" // Muted text color

// Colors
className="bg-primary text-primary-foreground"
className="bg-muted"
className="border-border"

// Responsive
className="md:flex-row flex-col"
className="lg:grid-cols-3 md:grid-cols-2 grid-cols-1"
```

### Custom CSS Variables

```css
:root {
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --destructive: 0 84.2% 60.2%;
  --border: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}
```

---

## 📦 Third-Party Components

### Framer Motion

Untuk animasi.

```tsx
import { motion } from "framer-motion"

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Animated content
</motion.div>
```

### Lucide Icons

```tsx
import { 
  BookOpen, 
  Users, 
  Award, 
  Play,
  CheckCircle,
  Clock,
  MapPin
} from "lucide-react"

<BookOpen className="h-5 w-5" />
```

---

## 📝 Component Guidelines

### Naming Conventions

- PascalCase untuk nama komponen: `CourseCard`, `QuizQuestion`
- kebab-case untuk nama file: `course-card.tsx`, `quiz-question.tsx`
- Prefix dengan domain: `course-`, `quiz-`, `session-`

### File Structure

```
components/courses/
├── course-card.tsx        # Main component
├── course-card.test.tsx   # Tests (optional)
├── course-grid.tsx
├── delivery-mode-badge.tsx
└── index.ts               # Barrel exports
```

### Props Interface

```tsx
// Define explicit interface
interface CourseCardProps {
  course: Course
  enrolled?: boolean
  showProgress?: boolean
  progress?: number
  className?: string
  onEnroll?: () => void
}

export function CourseCard({
  course,
  enrolled = false,
  showProgress = false,
  progress = 0,
  className,
  onEnroll
}: CourseCardProps) {
  // ...
}
```

---

*Dokumen ini terakhir diperbarui: 27 Januari 2026*
