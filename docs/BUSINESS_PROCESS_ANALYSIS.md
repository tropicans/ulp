# Analisis Proses Bisnis Aplikasi TITAN ULP

## Gambaran Umum

TITAN adalah Learning Experience Platform (ULP) untuk Aparatur Sipil Negara (ASN) yang mendukung berbagai mode pembelajaran: **Classroom**, **Hybrid**, **Live Online**, dan **Self-Paced**.

---

## 1. Struktur Peran Pengguna

| Role | Akses | Deskripsi |
|------|-------|-----------|
| **SUPER_ADMIN** | Penuh | Kelola semua user, kursus, pengaturan sistem, audit logs |
| **ADMIN_UNIT** | Unit Kerja | Kelola user dan kursus dalam unit kerjanya |
| **INSTRUCTOR** | Mengajar | Buat kursus, kelola konten, lihat progress siswa |
| **LEARNER** | Belajar | Enroll kursus, ikuti pembelajaran, ikut kuis |

---

## 2. Alur Proses Utama

### 2.1 Alur Pembelajaran (Learner Journey)

```mermaid
flowchart TD
    A[Login/Register] --> B[Complete Profile]
    B --> C[Browse Katalog Kursus]
    C --> D{Pilih Kursus}
    D --> E[Enrollment]
    E --> F[Mulai Belajar]
    
    F --> G[Tonton Video Lesson]
    G --> H{Video Selesai?}
    H -->|Ya| I[Lesson Marked Complete]
    H -->|Tidak| G
    
    I --> J{Ada Quiz?}
    J -->|Ya| K[Ikuti Quiz]
    K --> L{Lulus?}
    L -->|Ya| M[Points Added]
    L -->|Tidak| K
    
    J -->|Tidak| N{Semua Lesson Selesai?}
    M --> N
    N -->|Ya| O[Generate Sertifikat]
    N -->|Tidak| F
    
    O --> P[Download PDF Sertifikat]
```

### 2.2 Alur Pembuatan Kursus (Instructor Journey)

```mermaid
flowchart TD
    A[Login sebagai Instructor] --> B[Dashboard Courses]
    B --> C[Create New Course]
    C --> D[Isi Detail Kursus]
    D --> E[Upload/Generate Thumbnail]
    
    E --> F{Sumber Konten}
    F -->|YouTube Playlist| G[Import dari YouTube]
    F -->|Manual| H[Buat Module & Lesson Manual]
    
    G --> I[AI Curate Content]
    I --> J[Generate Summary & Quiz]
    
    H --> K[Add Video/Article/Document]
    
    J --> L[Tambah Quiz Manual jika perlu]
    K --> L
    
    L --> M[Preview Kursus]
    M --> N{Siap Publish?}
    N -->|Ya| O[Toggle Publish]
    N -->|Tidak| D
    
    O --> P[Kursus Tampil di Katalog]
```

### 2.3 Alur Sesi Tatap Muka (Attendance Flow)

```mermaid
flowchart TD
    A[Instructor Buat Session] --> B[Set Jadwal & Lokasi]
    B --> C{Metode Check-in}
    
    C --> D[QR Code]
    C --> E[GPS Based]
    C --> F[Manual]
    
    D --> G[Instructor Show QR]
    G --> H[Learner Scan QR]
    
    E --> I[Learner Share Location]
    I --> J{Dalam Radius?}
    J -->|Ya| K[Check-in Success]
    J -->|Tidak| L[Check-in Gagal]
    
    F --> M[Instructor Centang Manual]
    H --> K
    M --> K
    
    K --> N[Award Attendance Points]
    N --> O[Record in xAPI]
```

---

## 3. Sistem Gamifikasi

### 3.1 Skema Poin

| Aksi | Poin |
|------|------|
| Menyelesaikan 1 Lesson | +10 |
| Lulus Quiz | +30 |
| Menyelesaikan Kursus | +100 |
| Daily Login | +5 |
| Hadir di Sesi | +20 |

### 3.2 Level System
- Setiap **200 poin** = naik 1 level
- Badge otomatis diberikan saat mencapai milestone tertentu

### 3.3 Leaderboard
- Ranking berdasarkan total poin
- Filter by Unit Kerja untuk kompetisi internal

---

## 4. Tracking & Analytics (xAPI)

### 4.1 Event yang Ditrack

| Event | Verb xAPI | Kapan Terjadi |
|-------|-----------|---------------|
| Enrollment | `registered` | User enroll kursus |
| Video Play | `played` | Video mulai diputar |
| Video Pause | `paused` | Video di-pause |
| Video Complete | `completed` | Video selesai |
| Lesson Complete | `completed` | Lesson ditandai selesai |
| Quiz Passed | `passed` | Quiz lulus (>= passing score) |
| Quiz Failed | `failed` | Quiz tidak lulus |
| Certificate Earned | `earned` | Sertifikat diterbitkan |

### 4.2 Data Analytics
- Dashboard admin untuk melihat statistik real-time
- Trend aktivitas harian/mingguan/bulanan
- Popular courses berdasarkan enrollment

---

## 5. Mode Pembelajaran

| Mode | Deskripsi | Fitur Terkait |
|------|-----------|---------------|
| **CLASSROOM** | 100% tatap muka | QR/GPS check-in, manual attendance |
| **HYBRID** | Kombinasi online + tatap muka | Video lessons + scheduled sessions |
| **LIVE_ONLINE** | Kelas virtual langsung | Zoom integration (planned) |
| **SELF_PACED** | Belajar mandiri kapan saja | Video lessons, quiz, auto-completion |

---

## 6. Proses Sertifikasi

### Syarat Mendapat Sertifikat:
1. ✅ 100% lessons completed
2. ✅ Semua quiz lulus (jika ada)
3. ✅ Attendance memenuhi threshold (untuk classroom/hybrid)

### Output Sertifikat:
- PDF dengan desain formal
- QR Code untuk verifikasi
- Nomor sertifikat unik
- Verification URL publik

---

## 7. Peran Admin

### SUPER_ADMIN:
- Manajemen semua user (role, status)
- Audit logs sistem
- System settings
- xAPI analytics
- Platform reports

### ADMIN_UNIT:
- Kelola user dalam unit kerjanya saja
- Lihat progress learner di unitnya
- Limited audit logs (hanya unit)

---

## 8. Identifikasi Gap & Perbaikan

### ❌ Proses yang Belum Lengkap:

| No | Proses | Status | Catatan |
|----|--------|--------|---------|
| 1 | Zoom Integration | ⏳ Planned | Untuk LIVE_ONLINE sessions |
| 2 | Forum Diskusi | 🟡 Basic | Ada tapi minimal fitur |
| 3 | Reminder/Notifikasi | ⏳ Basic | Perlu email/WhatsApp integration |
| 4 | Learning Path | ❌ Belum | Urutan kursus yang direkomendasikan |
| 5 | Approval Workflow | ❌ Belum | Untuk enrollment yang butuh approval |
| 6 | Reporting to HR | ⏳ Basic | Export data untuk keperluan SDM |
| 7 | Pre-Test/Post-Test | 🟡 Partial | Quiz ada, tapi belum ada pembanding |

### ✅ Proses yang Sudah Berjalan Baik:
- Self-paced learning flow
- Course creation & publishing
- Quiz system dengan auto-grading
- Certificate generation & verification
- Gamification (points, levels)
- xAPI tracking & analytics
- Attendance (QR, GPS, manual)

---

## 9. Rekomendasi Prioritas

### Prioritas Tinggi:
1. **Learning Path** - Guideline urutan kursus untuk kompetensi tertentu
2. **Notification System** - Email/WhatsApp reminder untuk deadline
3. **Pre/Post Test Comparison** - Untuk mengukur efektivitas pelatihan

### Prioritas Menengah:
4. **Approval Workflow** - Untuk kursus yang butuh persetujuan atasan
5. **HR Reporting** - Export data ke format SDM standar
6. **Forum Enhancement** - Q&A per lesson, @mention, upvote

### Prioritas Rendah:
7. **Zoom Integration** - Jika ada kebutuhan live online
8. **Social Learning** - Share progress, badges ke sosmed

---

*Dokumen ini berdasarkan analisis kode sumber per 21 Januari 2026*
