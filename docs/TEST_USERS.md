# Test Users - ULP ASN Platform

## 🔑 Default Test Accounts

Berikut adalah akun testing yang sudah dibuat di sistem ULP ASN. Akun-akun ini akan dibuat otomatis saat menjalankan seed script.

### 1. Super Admin
- **Email**: `admin@ULP.go.id`
- **Password**: `admin123`
- **NIP**: `199001012020121001`
- **Role**: `SUPER_ADMIN`
- **Nama**: Super Admin
- **Unit Kerja**: Sekretariat Negara
- **Jabatan**: Administrator Sistem

**Akses**: Full system access untuk semua fitur administrasi

---

### 2. Admin Unit Kerja
- **Email**: `adminunit@ULP.go.id`
- **Password**: `admin123`
- **NIP**: `199002022020122002`
- **Role**: `ADMIN_UNIT`
- **Nama**: Admin Unit Kerja
- **Unit Kerja**: Pusdiklat Kemensetneg
- **Jabatan**: Kepala Bidang Pelatihan

**Akses**: Mengelola courses dan users di unit kerjanya

---

### 3. Instructor (Widyaiswara)
- **Email**: `instructor@ULP.go.id`
- **Password**: `instructor123`
- **NIP**: `198505152010121003`
- **Role**: `INSTRUCTOR`
- **Nama**: Dr. Budi Santoso
- **Unit Kerja**: Pusdiklat Kemensetneg
- **Jabatan**: Widyaiswara Ahli Utama

**Akses**: Membuat dan mengelola courses, melihat enrolled students, grading

---

### 4. Learner (Peserta)
- **Email**: `learner@ULP.go.id`
- **Password**: `learner123`
- **NIP**: `199203032019031004`
- **Role**: `LEARNER`
- **Nama**: Siti Aminah
- **Unit Kerja**: Biro Umum
- **Jabatan**: Pelaksana

**Akses**: Enroll courses, mengikuti pembelajaran, mengerjakan quiz, melihat certificates

---

## 📋 Cara Menggunakan Test Users

### Step 1: Jalankan Seed Script
```bash
# Buka browser dan navigasi ke:
http://localhost:3000/seed

# Klik tombol "Run Seed"
# Tunggu hingga muncul pesan sukses
```

Seed script akan otomatis membuat:
- ✅ 4 test users (sesuai tabel di atas)
- ✅ 3 sample courses dengan delivery mode berbeda
- ✅ Modules dan lessons untuk setiap course

### Step 2: Login dengan Test User
```bash
# Buka halaman login:
http://localhost:3000/login

# Gunakan EMAIL sebagai username (bukan NIP)
# Contoh untuk Learner:
Username: learner@ULP.go.id
Password: learner123

# Contoh untuk Admin:
Username: admin@ULP.go.id
Password: admin123
```

> **💡 Catatan**: Gunakan **EMAIL** sebagai username, bukan NIP!

### Step 3: Test Fitur Sesuai Role

#### Sebagai Learner:
1. Browse course catalog: `/courses`
2. View course detail: `/courses/[slug]`
3. Enroll in course
4. Access learning interface: `/courses/[slug]/learn`

#### Sebagai Instructor:
1. Access instructor dashboard: `/dashboard/courses`
2. Create new course: `/dashboard/courses/new`
3. Edit existing course: `/dashboard/courses/[id]/edit`
4. Manage modules and lessons
5. View enrolled students

#### Sebagai Admin Unit:
1. Manage courses in their unit
2. View enrollment reports
3. Manage instructors in their unit

#### Sebagai Super Admin:
1. Full system access
2. Manage all users and courses
3. System settings
4. View audit logs

---

## 🎯 Sample Courses yang Dibuat

Seed script membuat 3 sample courses dengan delivery mode berbeda:

### 1. Pelatihan Kepemimpinan Lingkungan Digital
- **Delivery Mode**: `ON_CLASSROOM` (Tatap Muka)
- **Difficulty**: `INTERMEDIATE`
- **Category**: Leadership
- **Duration**: 24 jam
- **Instructor**: Dr. Budi Santoso
- **Status**: Published

### 2. Dasar-Dasar Administrasi Publik Modern
- **Delivery Mode**: `HYBRID` (Campuran Online + Offline)
- **Difficulty**: `BEGINNER`
- **Category**: Administration
- **Duration**: 16 jam
- **Instructor**: Dr. Budi Santoso
- **Status**: Published

### 3. Literasi Data untuk Pengambilan Kebijakan
- **Delivery Mode**: `ASYNC_ONLINE` (E-Learning Mandiri)
- **Difficulty**: `ADVANCED`
- **Category**: Data Science
- **Duration**: 40 jam
- **Instructor**: Dr. Budi Santoso
- **Status**: Published

Setiap course memiliki 3 modules:
- **Module 1**: Pendahuluan (2 lessons)
- **Module 2**: Materi Inti (2 lessons)
- **Module 3**: Penutup (1 lesson)

---

## 🔐 Security Notes

⚠️ **PENTING**: Password ini hanya untuk development/testing!

**Untuk Production**:
- Ganti semua default passwords
- Gunakan password yang lebih kuat (min. 12 karakter)
- Aktifkan 2FA untuk admin accounts
- Hapus atau disable test accounts
- Gunakan environment variables untuk sensitive data

---

## 🛠️ Database Reset

Jika ingin reset database dan re-seed:

```bash
# Stop aplikasi
# Hapus data di database
npx prisma db push --force-reset

# Jalankan seed lagi
# Buka: http://localhost:3000/seed
```

---

## 📝 Catatan Tambahan

- Password di-hash menggunakan **bcrypt** dengan salt rounds 10
- NIP format: YYYYMMDDYYYYMMDDNNN (sesuai format ASN Indonesia)
- Email menggunakan domain `@ULP.go.id`
- Semua test users sudah complete profile (ada NIP dan unitKerja)
- Tidak perlu complete-profile flow untuk test users ini

---

## 🚀 Next Steps

Setelah berhasil login dan test basic features:

1. ✅ Test enrollment flow
2. ✅ Test course catalog filtering
3. ⏭️ Implement learning interface
4. ⏭️ Add quiz functionality
5. ⏭️ Add attendance system
6. ⏭️ Add certificate generation

---

**Last Updated**: 2026-01-16  
**Created By**: Development Team  
**Status**: Active for Testing
