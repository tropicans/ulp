# Panduan Instalasi ULP ASN (TITAN)

Dokumen ini menjelaskan langkah-langkah lengkap untuk menginstal dan menjalankan aplikasi Learning Experience Platform ASN.

---

## 📋 Prerequisites

### Sistem Operasi yang Didukung
- Windows 10/11
- macOS 12+
- Linux (Ubuntu 20.04+, Debian 11+)

### Software yang Diperlukan

| Software | Versi Minimum | Fungsi |
|----------|---------------|--------|
| **Node.js** | 18.x atau lebih | Runtime JavaScript |
| **npm** | 9.x atau lebih | Package manager |
| **PostgreSQL** | 16 | Database utama |
| **Git** | 2.x | Version control |
| **Docker** (opsional) | 24+ | Containerization |

### Periksa Instalasi

```bash
# Verifikasi Node.js
node --version  # Harus >= v18.0.0

# Verifikasi npm
npm --version   # Harus >= 9.0.0

# Verifikasi PostgreSQL
psql --version

# Verifikasi Git
git --version
```

---

## 🚀 Metode Instalasi

### Metode 1: Instalasi Manual (Development)

#### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/ULP-asn.git
cd ULP-asn
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Konfigurasi Environment

```bash
# Copy environment template
cp .env.example .env

# Edit file .env sesuai kebutuhan
# Lihat: docs/ENVIRONMENT.md untuk penjelasan lengkap
```

**Konfigurasi Wajib:**

```env
# Database - sesuaikan dengan setup PostgreSQL Anda
DATABASE_URL="postgresql://postgres:password@localhost:5433/ULP_asn?schema=public"

# Auth Secret - WAJIB diganti untuk production
AUTH_SECRET="generate-random-string-min-32-chars"
AUTH_URL="http://localhost:3001"
```

#### Step 4: Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema ke database
npx prisma db push

# (Opsional) Lihat database dengan Prisma Studio
npx prisma studio
```

#### Step 5: Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di: **http://localhost:3001**

#### Step 6: Seed Data Sample (Opsional)

1. Buka browser: http://localhost:3001/seed
2. Klik tombol **"Run Seed"**
3. Tunggu hingga muncul pesan sukses

---

### Metode 2: Docker Compose (Recommended for Production)

#### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/ULP-asn.git
cd ULP-asn
```

#### Step 2: Konfigurasi Environment

```bash
# Buat file .env (Docker akan membaca dari sini)
cp .env.example .env

# Edit sesuai kebutuhan production
```

#### Step 3: Jalankan dengan Docker Compose

```bash
# Build dan jalankan semua services
docker compose up -d --build

# Lihat logs
docker compose logs -f app
```

**Services yang akan berjalan:**

| Service | Port | Fungsi |
|---------|------|--------|
| `app` | 3001 | Aplikasi Next.js |
| `postgres` | 5433 | Database PostgreSQL |
| `redis` | 6380 | Cache & Session |
| `minio` | 9000, 9001 | File Storage (S3-compatible) |

#### Step 4: Setup Database (dalam container)

```bash
# Akses container app
docker compose exec app sh

# Generate Prisma Client
npx prisma generate

# Push schema
npx prisma db push
```

---

## ✅ Verifikasi Instalasi

### Checklist

- [ ] Aplikasi berjalan di http://localhost:3001
- [ ] Halaman login muncul di /login
- [ ] Database terkoneksi (tidak ada error di console)
- [ ] Seed berhasil dijalankan

### Test Login

Setelah seed berhasil, gunakan kredensial berikut:

| Role | Email | Password |
|------|-------|----------|
| Learner | `learner@ULP.go.id` | `learner123` |
| Instructor | `instructor@ULP.go.id` | `instructor123` |
| Admin | `admin@ULP.go.id` | `admin123` |

---

## 🔧 Konfigurasi Tambahan

### MinIO (File Storage)

1. Akses MinIO Console: http://localhost:9001
2. Login dengan: `minioadmin` / `minioadmin`
3. Buat bucket: `ULP-files`

### Redis

Redis digunakan untuk caching dan session storage. Tidak perlu konfigurasi tambahan untuk development.

### xAPI LRS Integration

Untuk tracking analytics dengan xAPI:

```env
LRS_ENDPOINT="http://lrsql:8080/xapi/statements"
LRS_API_KEY="your-api-key"
LRS_SECRET_KEY="your-secret-key"
```

---

## ❓ Troubleshooting

### Error: "Cannot connect to database"

```bash
# Pastikan PostgreSQL berjalan
pg_isready -h localhost -p 5433

# Jika menggunakan Docker
docker compose ps
docker compose restart postgres
```

### Error: "Prisma Client not generated"

```bash
npx prisma generate
```

### Error: "Port already in use"

```bash
# Cari proses yang menggunakan port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/macOS

# Atau ganti port di .env
# AUTH_URL="http://localhost:3002"
```

### Error: "Node modules not found"

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## 📚 Referensi

- [Environment Variables](./ENVIRONMENT.md)
- [Database Schema](./DATABASE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

*Dokumen ini terakhir diperbarui: 27 Januari 2026*
