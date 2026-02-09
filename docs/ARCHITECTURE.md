# TITAN - Architecture Documentation

> **Version**: 1.0  
> **Last Updated**: 2026-02-04  
> **Status**: Active

---

## 1. Overview

**TITAN** adalah ruang pembelajaran terpadu bagi Aparatur Negara—dirancang untuk memperkuat kompetensi, talenta, dan kapasitas ASN secara berkelanjutan, dengan menghubungkan pembelajaran, pengalaman, dan kebutuhan organisasi dalam satu ekosistem yang utuh dan relevan.

Platform ini dibangun dengan arsitektur **Unified Learning Platform (ULP)** yang mendukung multiple learning modalities dan terintegrasi dengan sistem kepegawaian ASN.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS |
| **Backend** | Next.js Server Actions, API Routes |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Cache** | Redis |
| **Storage** | MinIO (S3-compatible) |
| **Auth** | NextAuth.js v5 (LDAP, Google OAuth, Credentials) |
| **Analytics** | xAPI (Learning Record Store) |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            TITAN                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   [Browser] ──→ [Next.js App Router] ──→ [Server Actions/API]       │
│                         │                        │                   │
│                         ▼                        ▼                   │
│                  ┌─────────────────────────────────────┐            │
│                  │         AUTHORIZATION LAYER         │            │
│                  │       src/lib/auth/policies.ts      │            │
│                  └─────────────────────────────────────┘            │
│                                    │                                 │
│         ┌──────────────────────────┼──────────────────────┐         │
│         ▼                          ▼                      ▼         │
│   ┌──────────┐             ┌──────────┐            ┌──────────┐    │
│   │ LEARNING │             │ASSESSMENT│            │   PBGM   │    │
│   │ Domain   │             │  Domain  │            │  Domain  │    │
│   └────┬─────┘             └────┬─────┘            └────┬─────┘    │
│        │                        │                       │           │
│        └────────────────────────┼───────────────────────┘           │
│                                 ▼                                    │
│                  ┌─────────────────────────────────┐                │
│                  │           PRISMA ORM            │                │
│                  │          src/lib/db.ts          │                │
│                  └─────────────────────────────────┘                │
│                                 │                                    │
│           ┌─────────────────────┼─────────────────────┐             │
│           ▼                     ▼                     ▼             │
│     [PostgreSQL]           [Redis]              [MinIO]             │
│                                                                      │
│   ────────────────── ASYNC PROCESSING ──────────────────            │
│                                 │                                    │
│                  ┌─────────────────────────────────┐                │
│                  │         xAPI SUBSYSTEM          │                │
│                  │  outbox.ts → worker.ts → LRS    │                │
│                  └─────────────────────────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Architecture

### 3.1 Domain Boundaries

| Domain | Responsibility | Key Files | Data Ownership |
|--------|----------------|-----------|----------------|
| **USER** | Authentication, profiles, roles, badges | `auth.ts`, `user.ts` | User, Account, Session, Badge, UserBadge |
| **LEARNING** | Courses, modules, lessons, enrollments | `courses.ts`, `modules.ts`, `progress.ts` | Course, Module, Lesson, Enrollment, Certificate |
| **ASSESSMENT** | Quizzes, questions, grading | `quizzes.ts`, `questions.ts` | Quiz, Question, QuizAttempt |
| **PBGM** | Project-based learning programs | `pbgm-*.ts` | WblmProgram, WblmMilestone, WblmSubmission |
| **ANALYTICS** | xAPI, learner activities, reporting | `xapi/*.ts` | XapiOutbox, LearnerActivity, Attendance |

### 3.2 Dependency Rules

```
┌─────────────────────────────────────────────────────┐
│                 Dependency Rules                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ANALYTICS ←──────── ALL domains (emit events)     │
│        │                                             │
│   PBGM ←───────────── USER, read LEARNING           │
│        │                                             │
│   ASSESSMENT ←─────── LEARNING, USER                │
│        │                                             │
│   LEARNING ←───────── USER only                     │
│        │                                             │
│   USER ←───────────── NONE (foundation)             │
│                                                      │
│   ❌ LEARNING tidak boleh import PBGM               │
│   ❌ USER tidak boleh import domain lain            │
│   ❌ Cross-domain DB write harus via service        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Data Flow

### 4.1 Request Flow

```
1. Browser → Next.js App Router
2. App Router → Server Action / API Route
3. Server Action → auth() check (authentication)
4. Server Action → policy check (authorization)
5. Server Action → Prisma (database operations)
6. Server Action → recordActivity() (analytics)
7. Server Action → revalidatePath() (cache invalidation)
8. Response → Browser
```

### 4.2 xAPI Event Flow (Transactional Outbox)

```
1. User Action (enrollment, quiz completion, etc.)
2. Server Action → prisma.$transaction([
      create_enrollment,
      insert_into_xapi_outbox
   ])
3. Cron Worker → process xapi_outbox
4. Worker → send to LRS
5. Worker → mark as SENT or retry
```

---

## 5. Key Patterns

### 5.1 Standard Response Format

```typescript
// SUCCESS
{ success: true, data?: T, message?: string }

// ERROR
{ 
  success: false, 
  error: { 
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "SERVER_ERROR",
    message: string,
    details?: object 
  } 
}
```

### 5.2 Server Action Template

```typescript
"use server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { success, error, unauthorized } from "@/lib/response"
import { canEditCourse } from "@/lib/auth/policies"
import { z } from "zod"

const inputSchema = z.object({ /* fields */ })

export async function myAction(data: z.infer<typeof inputSchema>) {
  // 1. AUTH
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  // 2. AUTHZ
  const authz = await canEditCourse(session.user.id, session.user.role, courseId)
  if (!authz.allowed) return forbidden(authz.reason)

  // 3. VALIDATE
  const parsed = inputSchema.safeParse(data)
  if (!parsed.success) return validationError(parsed.error)

  try {
    // 4. TRANSACTION
    const result = await prisma.$transaction(async (tx) => { ... })
    
    // 5. ANALYTICS
    recordActivity(session.user.id, "ACTION_TYPE", result.id)
    
    // 6. CACHE
    revalidatePath("/path")
    
    return success(result)
  } catch (err) {
    console.error("[DOMAIN] action error:", err)
    return serverError()
  }
}
```

---

## 6. Security

### 6.1 Authentication

- **Primary**: LDAP (ASN employees)
- **Secondary**: Google OAuth (external users)
- **Fallback**: Credentials (seeded/test users)

### 6.2 Authorization

- Centralized in `src/lib/auth/policies.ts`
- Role-based: SUPER_ADMIN, ADMIN_UNIT, INSTRUCTOR, LEARNER
- Resource-based: ownership checks (instructorId, participantUserId)

### 6.3 Session

- JWT-based sessions via NextAuth.js
- Token includes: id, email, role, nip, unitKerja
- Middleware validates token on protected routes

---

## 7. File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # Protected pages
│   └── (public)/          # Public pages
├── components/            # React components
├── lib/
│   ├── actions/           # Server Actions by domain
│   │   ├── courses.ts     # LEARNING
│   │   ├── quizzes.ts     # ASSESSMENT
│   │   └── pbgm-*.ts      # PBGM
│   ├── auth/
│   │   ├── index.ts       # NextAuth config
│   │   └── policies.ts    # Authorization policies
│   ├── xapi/              # xAPI subsystem
│   │   ├── outbox.ts      # Transactional outbox
│   │   ├── worker.ts      # Background processor
│   │   └── verbs.ts       # xAPI vocabulary
│   ├── db.ts              # Prisma client
│   └── response.ts        # Standard response helpers
└── generated/prisma/      # Generated Prisma types
```

---

## 8. Infrastructure

### 8.1 Docker Services

| Service | Port | Purpose |
|---------|------|---------|
| postgres | 5432 | Primary database |
| redis | 6379 | Cache & sessions |
| minio | 9000/9001 | Object storage |
| app | 3000 | Next.js application |
| cron | - | Background jobs |

### 8.2 Environment Variables

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
S3_ENDPOINT=http://minio:9000
AUTH_SECRET=...
LDAP_URL=ldap://...
LRS_ENDPOINT=https://...
```

---

## 9. Architecture Decision Records (ADR)

### ADR-001: Modular Monolith over Microservices

**Status**: Accepted  
**Context**: Perlu menentukan arsitektur yang tepat untuk tim kecil (2-5 developer) dengan kebutuhan deployment cepat.

**Decision**: Menggunakan Modular Monolith dengan domain boundaries yang jelas.

**Rationale**:
| Factor | Microservices | Modular Monolith |
|--------|--------------|------------------|
| Team Size | ❌ Butuh tim besar | ✅ Cocok tim kecil |
| Deployment | ❌ Complex orchestration | ✅ Single deployment |
| Development Speed | ❌ Overhead network calls | ✅ Fast iteration |
| Data Consistency | ❌ Eventual consistency | ✅ ACID transactions |
| Future Migration | N/A | ✅ Bisa split ke microservices |

**Consequences**: 
- ✅ Faster development, simpler ops
- ⚠️ Need discipline untuk domain boundaries

---

### ADR-002: Server Actions over REST API

**Status**: Accepted  
**Context**: Perlu menentukan pola komunikasi frontend-backend.

**Decision**: Menggunakan Next.js Server Actions sebagai primary pattern.

**Rationale**:
- **Type Safety**: End-to-end TypeScript tanpa codegen
- **No Client-Side State**: Data fetching langsung di server
- **Caching**: Built-in revalidation dengan `revalidatePath`
- **Security**: Automatic CSRF protection

**Trade-offs**:
- ⚠️ Vendor lock-in ke Next.js
- ⚠️ Tidak cocok untuk public API (gunakan API Routes jika perlu)

---

### ADR-003: xAPI Transactional Outbox

**Status**: Accepted  
**Context**: Perlu menjamin event analytics ter-record meski ada network failure.

**Decision**: Menggunakan transactional outbox pattern untuk xAPI.

**Rationale**:
```
❌ Direct Send (unreliable):
   Action → Send to LRS → (network error) → Event lost

✅ Outbox Pattern (reliable):
   Action → $transaction([insert, queue_xapi]) → Worker → LRS
```

**Consequences**:
- ✅ At-least-once delivery guarantee
- ✅ Retry mechanism
- ⚠️ Eventual consistency (delay 1-5 menit)

---

## 10. Scalability Strategy

### 10.1 Current Capacity (Single Node)

| Metric | Estimate |
|--------|----------|
| Concurrent Users | ~500-1000 |
| Database Connections | 20 (pooled) |
| Request Throughput | ~100 RPS |

### 10.2 Horizontal Scaling Path

```
Phase 1: CURRENT
┌─────────────────────────────────────┐
│  [App] → [PostgreSQL] → [Redis]    │
└─────────────────────────────────────┘

Phase 2: READ REPLICAS (10K users)
┌─────────────────────────────────────────────┐
│  [App x2] → [PostgreSQL Primary]            │
│         ↘  [PostgreSQL Replica (read)]      │
│            [Redis Cluster]                  │
└─────────────────────────────────────────────┘

Phase 3: DOMAIN SPLIT (50K+ users)
┌───────────────────────────────────────────────────┐
│  [Learning Service]  →  [Learning DB]             │
│  [Assessment Service] → [Assessment DB]           │
│  [PBGM Service]       → [PBGM DB]                 │
│         ↓                                         │
│      [Event Bus (Kafka/Redis)]                    │
└───────────────────────────────────────────────────┘
```

### 10.3 Performance Optimizations (Implemented)

| Optimization | Impact | Location |
|--------------|--------|----------|
| Redis caching | ⚡ Reduce DB queries 60% | `src/lib/redis.ts` |
| Prisma connection pooling | 🔗 Efficient DB connections | `docker-compose.yml` |
| Static generation (SSG) | 📄 Public pages cached at CDN | Next.js defaults |
| Image optimization (MinIO) | 🖼️ Lazy loading + thumbnails | `src/lib/minio.ts` |
| **Redis attendance queue** | 🚀 5000+ concurrent check-ins | `src/lib/queues/attendance-queue.ts` |
| **xAPI throttling** | ⏱️ 30-second batch updates | `live-session-view.tsx` |
| **Health checks** | 💓 Load balancer ready | `src/app/api/health/route.ts` |

---

## 11. Risk & Mitigation

### 11.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Database bottleneck** | Medium | High | Read replicas, query optimization, connection pooling |
| **Session hijacking** | Low | Critical | JWT + secure cookies, short expiry, refresh tokens |
| **Data loss** | Low | Critical | Daily backups, transaction logs, outbox pattern |
| **Vendor lock-in (Next.js)** | Medium | Medium | Domain logic isolated in `lib/`, minimal framework coupling |

### 11.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Single point of failure** | High | High | Multi-container deployment, health checks, auto-restart |
| **Secret exposure** | Medium | Critical | Environment variables, never commit secrets, rotate regularly |
| **Deployment failure** | Medium | Medium | Blue-green deployment, rollback scripts, staging environment |

### 11.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Slow onboarding** | Medium | Medium | Seed data, demo accounts, documentation |
| **Feature creep** | High | Medium | Domain boundaries, prioritization, MVP mindset |
| **Integration failure (LDAP)** | Medium | High | Fallback to credentials, health monitoring |

---

## 12. Appendix

### 12.1 Related Documents

- [Architecture Context for AI](.agent/architecture-context.md)
- [Prisma Schema](prisma/schema.prisma)
- [README](README.md)

### 12.2 Glossary

| Term | Definition |
|------|------------|
| **ULP** | Unified Learning Platform - arsitektur platform |
| **TITAN** | Nama aplikasi |
| **PBGM** | Project-Based Growth Module |
| **xAPI** | Experience API - standar analytics pembelajaran |
| **LRS** | Learning Record Store - penyimpanan xAPI statements |
| **ASN** | Aparatur Sipil Negara |

### 12.3 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-04 | 1.1 | Added ADR, Scalability, Risk sections |
| 2026-02-04 | 1.0 | Initial architecture documentation |
