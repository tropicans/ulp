# Dokumentasi Teknis TITIAN LXP

## Gambaran Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 16 (App Router) + React + TypeScript               │
│  Tailwind CSS + shadcn/ui + Framer Motion                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVER ACTIONS                           │
│  19 Action Files (~100KB) - Typed Server Functions          │
│  courses.ts | quizzes.ts | progress.ts | certificates.ts   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  PostgreSQL   │   │     Redis       │   │     MinIO       │
│  (Database)   │   │  (Session/Cache)│   │  (File Storage) │
└───────────────┘   └─────────────────┘   └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   xAPI LRS      │
                    │ (Yet Analytics) │
                    └─────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Next.js | 16.1.2 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | shadcn/ui | Latest |
| **Animation** | Framer Motion | 11.x |
| **Database ORM** | Prisma | 6.x |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **File Storage** | MinIO | Latest |
| **Authentication** | NextAuth.js | 5 (Beta) |
| **xAPI/LRS** | Yet Analytics | LRSQL |
| **Container** | Docker | 24+ |

---

## Struktur Direktori

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── generate-thumbnail/
│   │   ├── user/
│   │   └── webhooks/
│   ├── courses/              # Public course pages
│   ├── dashboard/            # Protected dashboard
│   │   ├── admin/            # Admin pages
│   │   ├── courses/          # Course management
│   │   ├── instructor/       # Instructor tools
│   │   └── learner/          # Learner dashboard
│   ├── login/
│   ├── register/
│   └── layout.tsx
├── components/
│   ├── courses/              # Course-related components
│   ├── dashboard/            # Dashboard widgets
│   ├── learning/             # Learning experience
│   ├── navigation/           # Header, Footer, etc
│   ├── providers/            # Context providers
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── actions/              # Server Actions (19 files)
│   ├── xapi/                 # xAPI integration
│   ├── utils/                # Utility functions
│   ├── auth.ts               # Auth configuration
│   └── db.ts                 # Prisma client
└── generated/
    └── prisma/               # Prisma generated types
```

---

## Database Schema

### Model Utama (22+ Models)

#### User & Auth
```prisma
model User {
    id            String      @id
    email         String      @unique
    name          String?
    role          Role        @default(LEARNER)
    status        UserStatus  @default(ACTIVE)
    nip           String?
    unitKerja     String?
    points        Int         @default(0)
    level         Int         @default(1)
    streak        Int         @default(0)
    // ... relations
}

enum Role {
    SUPER_ADMIN
    ADMIN_UNIT
    INSTRUCTOR
    LEARNER
}
```

#### Course Structure
```prisma
model Course {
    id           String       @id
    title        String
    slug         String       @unique
    description  String
    deliveryMode DeliveryMode
    difficulty   Difficulty
    isPublished  Boolean      @default(false)
    thumbnail    String?
    ytPlaylistId String?
    instructorId String
    // ... relations to Module, Enrollment, etc
}

model Module {
    id       String   @id
    courseId String
    title    String
    order    Int
    // ... relations to Lesson, Quiz
}

model Lesson {
    id          String      @id
    moduleId    String
    title       String
    contentType ContentType
    videoUrl    String?
    ytVideoId   String?
    content     String?
    order       Int
    // ... relations
}
```

#### Learning Progress
```prisma
model Enrollment {
    id        String           @id
    userId    String
    courseId  String
    status    EnrollmentStatus @default(ENROLLED)
    progress  Float            @default(0)
    // ... timestamps
}

model Progress {
    id          String    @id
    userId      String
    lessonId    String
    isCompleted Boolean   @default(false)
    completedAt DateTime?
    // ... timestamps
}
```

#### Assessment
```prisma
model Quiz {
    id           String    @id
    moduleId     String
    title        String
    passingScore Int       @default(70)
    timeLimit    Int?
    // ... relations to Question, QuizAttempt
}

model QuizAttempt {
    id        String  @id
    userId    String
    quizId    String
    score     Float
    isPassed  Boolean
    // ... timestamps
}
```

---

## Server Actions

### Daftar Action Files

| File | Functions | Deskripsi |
|------|-----------|-----------|
| `courses.ts` | 8 | CRUD courses, enrollment |
| `progress.ts` | 3 | Lesson completion tracking |
| `quizzes.ts` | 6 | Quiz CRUD, submission |
| `certificates.ts` | 3 | Certificate generation |
| `attendance.ts` | 6 | Check-in (QR/GPS/Manual) |
| `gamification.ts` | 5 | Points, levels, badges |
| `admin.ts` | 8 | User management, analytics |
| `video-tracking.ts` | 4 | xAPI video events |
| `xapi-analytics.ts` | 2 | LRS data fetching |
| `youtube.ts` | 5 | YouTube playlist import |
| `curation.ts` | 3 | AI content curation |
| `modules.ts` | 4 | Module management |
| `questions.ts` | 3 | Quiz questions |
| `sessions.ts` | 5 | Course sessions |
| `forums.ts` | 4 | Discussion forums |
| `reports.ts` | 2 | Analytics reports |
| `user.ts` | 2 | User profile |
| `instructor.ts` | 2 | Instructor dashboard |
| `auth.ts` | 2 | Registration |

---

## xAPI Integration

### Architecture

```
┌─────────────────┐
│  User Action    │
│  (Browser)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Server Action   │
│ (Next.js)       │
└────────┬────────┘
         │ Fire-and-forget
         ▼
┌─────────────────┐
│ xAPI Service    │
│ sendStatementAsync()
└────────┬────────┘
         │ HTTP POST (retry logic)
         ▼
┌─────────────────┐
│   LRS (LRSQL)   │
│ lrsql:8080      │
└─────────────────┘
```

### Files
- `src/lib/xapi/types.ts` - TypeScript interfaces
- `src/lib/xapi/verbs.ts` - xAPI verbs & activity types
- `src/lib/xapi/service.ts` - HTTP client with retry
- `src/lib/xapi/index.ts` - Public exports

### Tracked Events

| Event | Verb IRI |
|-------|----------|
| Enrollment | `http://adlnet.gov/expapi/verbs/registered` |
| Lesson Complete | `http://adlnet.gov/expapi/verbs/completed` |
| Video Play | `https://w3id.org/xapi/video/verbs/played` |
| Video Pause | `https://w3id.org/xapi/video/verbs/paused` |
| Quiz Passed | `http://adlnet.gov/expapi/verbs/passed` |
| Quiz Failed | `http://adlnet.gov/expapi/verbs/failed` |
| Certificate Earned | `http://adlnet.gov/expapi/verbs/earned` |

---

## Authentication

### NextAuth.js v5 Configuration

```typescript
// src/lib/auth.ts
export const { auth, signIn, signOut, handlers } = NextAuth({
    providers: [
        Credentials({ ... }),
        Google({ ... }),
    ],
    callbacks: {
        jwt({ token, user }) { ... },
        session({ session, token }) { ... },
    },
    pages: {
        signIn: '/login',
        newUser: '/complete-profile',
    }
})
```

### Session Data
```typescript
interface Session {
    user: {
        id: string
        email: string
        name: string
        role: Role
        unitKerja?: string
        image?: string
    }
}
```

---

## Docker Setup

### Services

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3001:3000"]
    depends_on: [postgres, redis, minio]
    
  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]
    
  redis:
    image: redis:7-alpine
    
  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]
```

### Networks
- `localai_default` - For LRS communication
- Default compose network for internal services

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001

# OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...

# xAPI LRS
LRS_ENDPOINT=http://lrsql:8080
LRS_API_KEY=...
LRS_SECRET_KEY=...

# AI Services
OPENAI_API_KEY=...
OLLAMA_BASE_URL=...

# External APIs
YOUTUBE_API_KEY=...
```

---

## API Endpoints

### Auth API (`/api/auth/*`)
- NextAuth.js managed endpoints
- `/api/auth/register` - Custom registration

### Webhook API
- `/api/webhooks/youtube` - YouTube notifications

### Utility API
- `/api/generate-thumbnail` - AI thumbnail generation
- `/api/user/enrollments` - User enrollment data

---

## Performance Considerations

### Current Setup (Single Instance)
- Handles ~1,000-2,000 concurrent users
- RAM: ~500MB-1GB per container
- Cold start: ~200-500ms

### Scaling Options
1. **Horizontal**: 2-3 instances with load balancer
2. **Caching**: Redis for session & data cache
3. **CDN**: Static assets & images
4. **Database**: Connection pooling (Prisma default)

---

## Security

### Implementation
- ✅ Server-side authentication checks
- ✅ Role-based access control (RBAC)
- ✅ CSRF protection (NextAuth)
- ✅ Environment variables for secrets
- ✅ SQL injection prevention (Prisma)
- ✅ XSS prevention (React)

### Authorization Flow
```typescript
// Every server action
const session = await auth()
if (!session?.user) {
    return { error: "Unauthorized" }
}

// Role check
if (!["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
    return { error: "Forbidden" }
}
```

---

## Testing

### Recommended Approach
1. **Unit Tests**: Vitest for utility functions
2. **Integration Tests**: Server action testing
3. **E2E Tests**: Playwright for user flows
4. **Manual Testing**: Browser-based verification

### Test Users (see docs/TEST_USERS.md)
- Various roles pre-seeded for testing

---

*Dokumentasi ini berdasarkan analisis kode sumber per 21 Januari 2026*
