# TITAN - Architecture Context for AI Coding

> **Tempel konteks ini di setiap prompt AI untuk menjaga konsistensi arsitektur**
> 
> **TITAN** adalah ruang pembelajaran terpadu bagi Aparatur Negara (Unified Learning Platform / ULP)

## Quick Architecture

```
[Browser] → [Next.js App Router] → [Server Actions/API]
                    │                      │
                    ▼                      ▼
           ┌─────────────────────────────────────┐
           │         AUTHORIZATION LAYER         │
           │    src/lib/auth/policies.ts         │
           └─────────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
┌──────────┐        ┌──────────┐           ┌──────────┐
│ LEARNING │        │ASSESSMENT│           │   WBLM   │
│/actions/ │        │/actions/ │           │/actions/ │
└────┬─────┘        └────┬─────┘           └────┬─────┘
     └─────────────────────┼───────────────────┘
                           ▼
                    ┌──────────┐
                    │  PRISMA  │ → PostgreSQL
                    └──────────┘
```

## 5 Domains

| Domain | Files | Owns |
|--------|-------|------|
| **USER** | `auth.ts`, `user.ts` | User, Account, Session, Badge |
| **LEARNING** | `courses.ts`, `modules.ts`, `progress.ts` | Course, Module, Lesson, Enrollment |
| **ASSESSMENT** | `quizzes.ts`, `questions.ts` | Quiz, Question, QuizAttempt |
| **PBGM** | `pbgm-*.ts` (service layer → Wblm* tables) | WblmProgram, WblmMilestone, WblmSubmission |
| **ANALYTICS** | `xapi/*.ts` | XapiOutbox, LearnerActivity, Attendance |

## Dependency Rules

- ❌ LEARNING tidak boleh import PBGM
- ❌ USER tidak boleh import domain lain
- ❌ page.tsx tidak boleh query prisma langsung
- ✅ Semua domain boleh import `auth.ts`, `db.ts`, `xapi/`
- ℹ️ PBGM adalah service layer, tabel DB tetap bernama Wblm*

## Standard Response Format

```typescript
// SUCCESS
{ success: true, data?: T, message?: string }

// ERROR
{ success: false, error: { code: string, message: string, details?: object } }
```

## DO ✅

1. Validasi input dengan Zod
2. Cek `auth()` di baris pertama
3. Gunakan `$transaction` untuk multi-entity writes
4. Return standard response format
5. Panggil `recordActivity()` untuk event penting
6. Gunakan `revalidatePath()` setelah mutations
7. Log error dengan context: `console.error("[DOMAIN] message:", error)`
8. TypeScript strict types (hindari `any`)

## DON'T ❌

1. Query prisma di page.tsx → Harus via server actions
2. Throw error dari actions → Return `{ error }`
3. Inline role check → Via policy function
4. Pattern baru tanpa approval
5. Import cross-domain untuk write
6. Hardcode role strings → Gunakan Prisma enum
7. Console.log data sensitif
8. Skip validation

## Template Action

```typescript
"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { recordActivity } from "@/lib/xapi"

const inputSchema = z.object({ /* fields */ })

export async function myAction(data: z.infer<typeof inputSchema>) {
  // 1. AUTH
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Login required" } }
  }

  // 2. VALIDATE
  const parsed = inputSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } }
  }

  try {
    // 3. TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      // operations
    })

    // 4. ANALYTICS
    recordActivity(session.user.id, "ACTION_TYPE", result.id)

    // 5. CACHE
    revalidatePath("/path")

    return { success: true, data: result }
  } catch (error) {
    console.error("[DOMAIN] myAction error:", error)
    return { success: false, error: { code: "SERVER_ERROR", message: "Gagal" } }
  }
}
```

## Prompt Checklist

Sebelum submit ke AI, pastikan prompt include:
- [ ] Domain yang akan dimodifikasi
- [ ] File yang akan dimodifikasi
- [ ] Constraint arsitektur yang relevan
- [ ] Expected checklist sebelum complete
