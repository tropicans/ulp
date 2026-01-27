# API Documentation - ULP ASN

Dokumen ini menjelaskan Server Actions dan API endpoints yang tersedia di aplikasi TITAN ULP.

---

## 📚 Arsitektur API

ULP ASN menggunakan **Next.js Server Actions** sebagai mekanisme utama untuk komunikasi client-server. Server Actions dipanggil langsung dari komponen React tanpa perlu membuat REST endpoints terpisah.

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│                         Client Components                    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼ Direct Function Call
┌─────────────────────────────────────────────────────────────┐
│                    SERVER ACTIONS                            │
│              src/lib/actions/*.ts                            │
│                                                              │
│  courses.ts | quizzes.ts | attendance.ts | certificates.ts  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      PRISMA ORM                              │
│                   Database Access Layer                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Daftar Server Actions

### courses.ts - Manajemen Kursus

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `getCourses(filters?)` | Mendapatkan daftar kursus dengan filter | Public |
| `getCourseBySlug(slug)` | Mendapatkan detail kursus by slug | Public |
| `createCourse(data)` | Membuat kursus baru | Instructor+ |
| `updateCourse(courseId, data)` | Update kursus | Instructor+ |
| `updateCourseThumbnail(courseId, url)` | Update thumbnail | Instructor+ |
| `toggleCoursePublish(courseId)` | Toggle publish/unpublish | Instructor+ |
| `enrollInCourse(courseId)` | Enroll ke kursus | Learner+ |
| `getUserEnrollments()` | Mendapatkan enrollment user | Learner+ |
| `getUserCreatedCourses()` | Mendapatkan kursus yang dibuat | Instructor+ |

**Contoh Penggunaan:**

```typescript
import { getCourses, enrollInCourse } from "@/lib/actions/courses"

// Get courses with filter
const { courses } = await getCourses({
  deliveryMode: "ASYNC_ONLINE",
  difficulty: "BEGINNER",
  isPublished: true,
  limit: 10
})

// Enroll in course
const result = await enrollInCourse("course-id")
if (result.error) {
  console.error(result.error)
}
```

---

### quizzes.ts - Manajemen Quiz

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `createQuiz(data)` | Membuat quiz baru | Instructor+ |
| `updateQuiz(quizId, data)` | Update quiz | Instructor+ |
| `deleteQuiz(quizId)` | Hapus quiz | Instructor+ |
| `getQuizById(quizId)` | Mendapatkan detail quiz | Learner+ |
| `submitQuizAttempt(data)` | Submit jawaban quiz | Learner+ |
| `getAttemptResult(attemptId)` | Mendapatkan hasil attempt | Learner+ |

**Contoh Penggunaan:**

```typescript
import { submitQuizAttempt } from "@/lib/actions/quizzes"

const result = await submitQuizAttempt({
  quizId: "quiz-id",
  answers: [
    { questionId: "q1", selectedOptions: [0] },
    { questionId: "q2", answerText: "Essay answer" }
  ]
})

if (result.success) {
  console.log(`Score: ${result.attempt.score}%`)
}
```

---

### attendance.ts - Sistem Kehadiran

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `checkInWithQR(sessionId, token)` | Check-in dengan QR code | Learner+ |
| `checkInWithGPS(sessionId, lat, lng)` | Check-in dengan GPS | Learner+ |
| `checkInManual(sessionId, userId)` | Check-in manual oleh instructor | Instructor+ |
| `getAttendanceBySession(sessionId)` | Mendapatkan attendance list | Instructor+ |
| `getUserAttendance(userId, courseId)` | Mendapatkan history attendance user | Learner+ |
| `updateAttendanceStatus(id, status, notes?)` | Update status attendance | Instructor+ |

**Contoh Penggunaan:**

```typescript
import { checkInWithGPS } from "@/lib/actions/attendance"

// Get current location
navigator.geolocation.getCurrentPosition(async (pos) => {
  const result = await checkInWithGPS(
    sessionId,
    pos.coords.latitude,
    pos.coords.longitude
  )
  
  if (result.success) {
    console.log("Check-in berhasil!")
  }
})
```

---

### certificates.ts - Sertifikat

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `generateCourseCertificate(courseId)` | Generate sertifikat | Learner+ |
| `downloadCertificatePDF(certificateId)` | Download PDF sertifikat | Learner+ |
| `verifyCertificate(code)` | Verifikasi sertifikat | Public |

**Contoh Penggunaan:**

```typescript
import { generateCourseCertificate } from "@/lib/actions/certificates"

const result = await generateCourseCertificate("course-id")
if (result.certificate) {
  console.log(`Sertifikat: ${result.certificate.certificateNo}`)
}
```

---

### gamification.ts - Sistem Gamifikasi

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `awardPoints(userId, action)` | Memberikan poin | Internal |
| `updateActivityStreak(userId)` | Update streak aktivitas | Internal |
| `getUserGamificationStats()` | Mendapatkan statistik gamifikasi | Learner+ |
| `getLeaderboard(limit?, unitKerja?)` | Mendapatkan leaderboard | Public |

**Point Values:**

| Action | Poin |
|--------|------|
| `LESSON_COMPLETE` | +10 |
| `QUIZ_PASS` | +30 |
| `COURSE_COMPLETE` | +100 |
| `DAILY_LOGIN` | +5 |
| `ATTENDANCE_PRESENT` | +20 |

---

### progress.ts - Tracking Progress

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `getLessonProgress(lessonId)` | Mendapatkan progress lesson | Learner+ |
| `markLessonComplete(lessonId)` | Tandai lesson selesai | Learner+ |
| `getCourseProgress(courseId)` | Mendapatkan progress course | Learner+ |

---

### modules.ts - Manajemen Module

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `createModule(data)` | Membuat module baru | Instructor+ |
| `updateModule(moduleId, data)` | Update module | Instructor+ |
| `deleteModule(moduleId)` | Hapus module | Instructor+ |
| `reorderModules(courseId, modules)` | Reorder modules | Instructor+ |

---

### sessions.ts - Manajemen Session

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `createSession(data)` | Membuat session baru | Instructor+ |
| `updateSession(sessionId, data)` | Update session | Instructor+ |
| `deleteSession(sessionId)` | Hapus session | Instructor+ |
| `getSessionsByDate(date)` | Mendapatkan session by date | Learner+ |
| `generateSessionQR(sessionId)` | Generate QR code untuk session | Instructor+ |

---

### admin.ts - Administrasi

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `getUsers(filters?)` | Mendapatkan daftar user | Admin+ |
| `updateUserRole(userId, role)` | Update role user | SuperAdmin |
| `toggleUserStatus(userId)` | Activate/deactivate user | Admin+ |
| `getAuditLogs(filters?)` | Mendapatkan audit logs | Admin+ |
| `getDashboardStats()` | Mendapatkan statistik dashboard | Admin+ |

---

### youtube.ts - YouTube Integration

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `importPlaylist(playlistUrl)` | Import YouTube playlist | Instructor+ |
| `refreshPlaylistData(courseId)` | Refresh data dari YouTube | Instructor+ |
| `getVideoMetadata(videoId)` | Mendapatkan metadata video | Internal |

---

### video-tracking.ts - Video Analytics

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `trackVideoPlay(lessonId)` | Track video started | Learner+ |
| `trackVideoPause(lessonId, position)` | Track video paused | Learner+ |
| `trackVideoSeek(lessonId, from, to)` | Track video seek | Learner+ |
| `trackVideoComplete(lessonId)` | Track video completed | Learner+ |

---

### xapi-analytics.ts - xAPI Integration

| Function | Deskripsi | Auth |
|----------|-----------|------|
| `getActivityStats(userId?)` | Mendapatkan statistik aktivitas | Admin+ |
| `exportXAPIStatements(filters)` | Export xAPI statements | Admin+ |

---

## 🌐 REST API Endpoints

Selain Server Actions, terdapat beberapa REST API endpoints:

### Authentication

```
POST /api/auth/register     - Register user baru
GET  /api/auth/session      - Get current session
POST /api/auth/login        - Login (via NextAuth)
POST /api/auth/logout       - Logout
```

### Utilities

```
POST /api/generate-thumbnail - Generate thumbnail dengan AI
GET  /api/user/enrollments  - Get user enrollments
```

### Webhooks

```
POST /api/webhooks/youtube  - YouTube webhook notifications
```

---

## 🔒 Authorization Levels

| Level | Role | Akses |
|-------|------|-------|
| Public | - | Read-only publik data |
| Learner+ | LEARNER, INSTRUCTOR, ADMIN_UNIT, SUPER_ADMIN | Fitur untuk peserta |
| Instructor+ | INSTRUCTOR, ADMIN_UNIT, SUPER_ADMIN | Fitur untuk instruktur |
| Admin+ | ADMIN_UNIT, SUPER_ADMIN | Fitur administrasi |
| SuperAdmin | SUPER_ADMIN | Full access |

---

## 📝 Response Format

Semua Server Actions mengembalikan format yang konsisten:

**Success Response:**
```typescript
{
  success: true,
  data: { ... },      // Optional: returned data
  message?: string    // Optional: success message
}
```

**Error Response:**
```typescript
{
  error: "Error message",
  code?: string       // Optional: error code
}
```

---

## 📊 Tipe Data Umum

### DeliveryMode

```typescript
enum DeliveryMode {
  ON_CLASSROOM    // Tatap muka
  HYBRID          // Kombinasi online + offline
  ASYNC_ONLINE    // E-learning mandiri
  SYNC_ONLINE     // Live online (Zoom/YouTube)
}
```

### Difficulty

```typescript
enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}
```

### Role

```typescript
enum Role {
  SUPER_ADMIN
  ADMIN_UNIT
  INSTRUCTOR
  LEARNER
}
```

### EnrollmentStatus

```typescript
enum EnrollmentStatus {
  ENROLLED
  IN_PROGRESS
  COMPLETED
  DROPPED
}
```

---

*Dokumen ini terakhir diperbarui: 27 Januari 2026*
