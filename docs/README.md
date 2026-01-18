# LXP ASN - Documentation

Learning Experience Platform untuk Aparatur Sipil Negara (ASN)

## 📚 Documentation Index

### Getting Started
- [Installation Guide](./INSTALLATION.md) - Setup and installation instructions
- [Test Users](./TEST_USERS.md) - **Default test accounts and credentials** ⭐

### Development
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

### Deployment
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Environment Variables](./ENVIRONMENT.md) - Configuration settings
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

## 🚀 Quick Start

1. **Clone and install dependencies**
```bash
npm install
```

2. **Setup database**
```bash
npx prisma db push
```

3. **Run seed script**
- Navigate to: `http://localhost:3000/seed`
- Click "Run Seed" button

4. **Login with test account**
- Go to: `http://localhost:3000/login`
- Use credentials from [TEST_USERS.md](./TEST_USERS.md)

## 🔑 Quick Access - Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Learner | `learner@lxp.go.id` | `learner123` |
| Instructor | `instructor@lxp.go.id` | `instructor123` |
| Admin | `admin@lxp.go.id` | `admin123` |

📖 **Full details**: See [TEST_USERS.md](./TEST_USERS.md)

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js (LDAP/SSO + Google OAuth)
- **UI**: Tailwind CSS + Shadcn/UI
- **Icons**: Lucide React

## 📁 Project Structure

```
lxp-asn/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── (auth)/       # Authentication pages
│   │   ├── courses/      # Course catalog and detail
│   │   ├── dashboard/    # User dashboards
│   │   └── api/          # API routes
│   ├── components/       # Reusable components
│   │   ├── ui/           # Shadcn/UI components
│   │   ├── courses/      # Course-specific components
│   │   ├── auth/         # Auth-related components
│   │   └── dashboard/    # Dashboard components
│   ├── lib/              # Utilities and helpers
│   │   ├── actions/      # Server actions
│   │   ├── auth.ts       # NextAuth config
│   │   ├── db.ts         # Prisma client
│   │   └── ldap.ts       # LDAP utilities
│   └── generated/        # Prisma generated types
├── prisma/
│   └── schema.prisma     # Database schema
├── docs/                 # Documentation
└── public/               # Static assets
```

## 🎯 Development Phases

- [x] **Phase 1**: Project Setup
- [x] **Phase 2**: UI Foundation
- [x] **Phase 3**: Authentication
- [🔄] **Phase 4**: Course Management (In Progress)
- [ ] **Phase 5**: Sessions & Attendance
- [ ] **Phase 6**: Assessment & Quizzes
- [ ] **Phase 7**: Gamification & Certificates

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly with test users
4. Submit a pull request

## 📞 Support

For issues and questions, please refer to:
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/your-org/lxp-asn/issues)

---

**Version**: 1.0.0-alpha  
**Last Updated**: 2026-01-16
