# TITAN - Documentation

> Platform Pembelajaran Terpadu untuk Aparatur Negara

## 📚 Documentation Index

### Getting Started
- [Installation Guide](./INSTALLATION.md) - Setup and installation instructions
- [Test Users](./TEST_USERS.md) - **Default test accounts and credentials** ⭐

### Architecture & Development
- [Architecture](./ARCHITECTURE.md) - System design and ADRs
- [Database Schema](./DATABASE.md) - Prisma schema documentation
- [API Documentation](./API.md) - Server actions and API endpoints
- [Component Library](./COMPONENTS.md) - Reusable UI components

### Features
- [Authentication](./AUTHENTICATION.md) - SSO/LDAP and OAuth setup
- [Course Management](./COURSE_MANAGEMENT.md) - Creating and managing courses
- [Learning Interface](./LEARNING_INTERFACE.md) - Student learning experience
- [Assessment](./ASSESSMENT.md) - Quizzes and grading
- [Attendance](./ATTENDANCE.md) - QR code and GPS attendance
- [Gamification](./GAMIFICATION.md) - Badges and certificates
- [YouTube Curation](./YOUTUBE_CURATION.md) - AI-powered video curation ⭐ NEW
- [Work-Based Learning](./WBLM.md) - Project-based growth module ⭐ NEW

### Deployment
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Environment Variables](./ENVIRONMENT.md) - Configuration settings
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup database
npx prisma db push

# 3. Seed data
npm run seed  # or visit http://localhost:3001/seed

# 4. Start development server
npm run dev
```

**Login**: Use credentials from [TEST_USERS.md](./TEST_USERS.md)

## 🔑 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Learner | `learner@titan.go.id` | `learner123` |
| Instructor | `instructor@titan.go.id` | `instructor123` |
| Admin | `admin@titan.go.id` | `admin123` |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache** | Redis |
| **Storage** | MinIO (S3-compatible) |
| **Auth** | NextAuth.js v5 (LDAP, Google OAuth) |
| **UI** | Tailwind CSS + Shadcn/UI |
| **Analytics** | xAPI (Learning Record Store) |
| **Workflow** | n8n (automation) |
| **AI** | Google Gemini, Ollama, AI Proxy |

---

## 📁 Project Structure

```
titan/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes & webhooks
│   │   ├── dashboard/      # Protected pages
│   │   └── courses/        # Course catalog
│   ├── components/         # React components (102 files)
│   ├── lib/
│   │   ├── actions/        # Server Actions (43 files)
│   │   ├── auth/           # NextAuth + policies
│   │   ├── xapi/           # xAPI subsystem
│   │   └── db.ts           # Prisma client
│   └── generated/prisma/   # Generated types
├── prisma/
│   └── schema.prisma       # 45 models
├── n8n_workflows/          # n8n workflow JSONs
└── docs/                   # This documentation
```

---

## 🎯 Features Status

| Feature | Status | Description |
|---------|--------|-------------|
| Authentication | ✅ Complete | LDAP, Google OAuth, Credentials |
| Course Management | ✅ Complete | CRUD, modules, lessons |
| YouTube Integration | ✅ Complete | Import courses from YouTube |
| **YouTube Curation** | ✅ Complete | AI-powered video curation |
| Quizzes & Assessment | ✅ Complete | Pre/Post tests, AI grading |
| Attendance | ✅ Complete | QR code, GPS, Zoom |
| Gamification | ✅ Complete | Badges, certificates, points |
| **WBLM/PBGM** | ✅ Complete | Work-based learning module |
| xAPI Analytics | ✅ Complete | Learning record tracking |
| n8n Workflows | ✅ Complete | Automation pipelines |

---

## 🐳 Docker Services

| Service | Port | Purpose |
|---------|------|---------|
| titan-app | 3001 | Main application |
| titan-postgres | 5433 | Primary database |
| titan-redis | 6380 | Cache & queues |
| titan-minio | 9000 | Object storage |
| n8n | 5678 | Workflow automation |
| lrsql | 8080 | xAPI Learning Record Store |

Start all services:
```bash
docker compose up -d
```

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly with test users
4. Submit a pull request

---

**Version**: 2.0.0  
**Last Updated**: 2026-02-09
