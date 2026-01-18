# LXP ASN - Learning Experience Platform

Platform pembelajaran modern untuk pelatihan ASN dengan dukungan multi-modal learning.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm/pnpm/yarn

### Development Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Setup database:**
```bash
npx prisma generate
npx prisma db push
```

4. **Run development server:**
```bash
npm run dev
```

5. **Seed sample data (optional):**
Navigate to [http://localhost:3000/seed](http://localhost:3000/seed)

## 🎓 Multi-Modal Learning Support

LXP ASN mendukung 4 mode pembelajaran untuk pelatihan ASN yang komprehensif:

### 1. ON_CLASSROOM (Tatap Muka)
**100% pelatihan offline di kelas fisik**

- **Use Cases:** Workshop teknis, praktikum hands-on, pelatihan keterampilan fisik
- **Platform:** Ruang kelas fisik
- **Attendance:** QR code check-in dengan GPS validation

**Contoh:**
- Pelatihan SAP untuk bendahara
- Workshop pembuatan dokumen administratif
- Praktikum laboratorium komputer

---

### 2. HYBRID (Blended Learning)
**HARUS mengombinasikan online + classroom** (tidak bisa standalone)

- **Komponen Wajib:** 
  - Online (async self-study ATAU Zoom/live sessions) 
  - DAN Classroom (tatap muka)
- **Use Cases:** Teori online → praktik kelas, flipped classroom, rotasi mingguan
- **Attendance:** QR + Zoom tracking + GPS

**Contoh Implementasi:**

*Scenario 1: Flipped Classroom*
- Minggu 1-2: E-learning mandiri (teori) → **ONLINE**
- Minggu 3: Live Zoom discussion (tanya jawab) → **ONLINE**
- Minggu 4: Workshop kelas (praktik) → **CLASSROOM**

*Scenario 2: Weekly Rotation*
- Senin-Rabu: Self-study videos + modul online → **ONLINE**
- Kamis-Jumat: Pelatihan praktik on-site → **CLASSROOM**

> **PENTING:** Mode HYBRID harus selalu mencakup kedua komponen (online DAN classroom). Jika hanya online atau hanya classroom, gunakan mode yang sesuai (SYNC_ONLINE, ASYNC_ONLINE, atau ON_CLASSROOM).

---

### 3. ASYNC_ONLINE (E-Learning Mandiri)
**100% pembelajaran online mandiri tanpa jadwal tetap**

- **Use Cases:** Pembelajaran fleksibel untuk ASN yang sibuk, kursus teori
- **Platform:** Video on-demand, modul interaktif, quiz online
- **Attendance:** Progress tracking otomatis

**Contoh:**
- Kursus pengantar reformasi birokrasi
- Tutorial software office
- Materi persiapan ujian kompetensi

---

### 4. SYNC_ONLINE (Live Online)
**100% sesi online langsung dengan jadwal tetap**

- **Use Cases:** Webinar, kuliah online langsung, live streaming  
- **Platform:** 
  - Zoom meetings
  - YouTube Live
  - Instagram Live
  - TikTok Live
- **Attendance:** Zoom auto-tracking atau manual check-in

**Contoh:**
- Webinar inovasi pelayanan publik via YouTube Live
- Kuliah kepemimpinan ASN via Zoom
- Town hall meeting via Instagram Live

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16.1 (App Router + Turbopack)
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** NextAuth.js v5 (LDAP + Google OAuth)
- **UI:** Shadcn/UI + Tailwind CSS
- **Features:** 
  - Multi-modal learning (4 delivery modes)
  - QR code attendance with GPS validation
  - Zoom integration
  - Gamification (points, badges, certificates)
  - AI-powered quiz generation & grading
  - Progress tracking & analytics

## 📚 Key Features

- ✅ **Multi-Modal Learning** - 4 delivery modes untuk fleksibilitas maksimal
- ✅ **Smart Attendance** - QR code, GPS, Zoom auto-tracking
- ✅ **Zoom Integration** - Meeting management & automatic attendance
- ✅ **Gamification** - Points, badges, leaderboards, certificates
- ✅ **AI Features** - Quiz generation, essay auto-grading
- ✅ **ASN-Specific** - NIP, unit kerja, jabatan, pangkat
- ✅ **Role-Based Access** - Super Admin, Admin Unit, Instructor, Learner
- ✅ **Progress Analytics** - Real-time tracking & reporting

## 🔐 Authentication

Supports multiple authentication methods:
- **LDAP** - Enterprise ASN login
- **Google OAuth** - Social login
- **Credentials** - Email/password (local)

## 📖 Documentation

- [Walkthrough](./docs/walkthrough.md) - Environment verification results
- [Implementation Plan](./docs/implementation_plan.md) - Current development plan
- [Prisma Schema](./prisma/schema.prisma) - Database models

## 🤝 Contributing

This is an internal ASN project. For questions or issues, contact the development team.

## 📄 License

Proprietary - ASN Internal Use Only
