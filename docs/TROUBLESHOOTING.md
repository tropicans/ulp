# Troubleshooting Guide - ULP ASN

Panduan mengatasi masalah umum di aplikasi TITAN ULP.

---

## 🔐 Authentication Issues

### Login Gagal

**Gejala:** "Invalid credentials" atau redirect loop

**Solusi:**
1. Pastikan email/password benar
2. Cek `AUTH_SECRET` sudah di-set
3. Untuk Docker, set `SECURE_COOKIES=false` jika development
4. Clear browser cookies dan coba lagi

```bash
# Regenerate AUTH_SECRET
openssl rand -base64 32
```

### Session Tidak Tersimpan

**Solusi:**
1. Pastikan `AUTH_URL` sesuai dengan domain
2. Cek cookie domain settings
3. Restart aplikasi setelah ubah environment

---

## 🗄️ Database Issues

### Connection Refused

**Gejala:** `ECONNREFUSED` atau `Connection refused`

**Solusi:**
```bash
# Cek PostgreSQL running
docker compose ps postgres

# Restart database
docker compose restart postgres

# Cek logs
docker compose logs postgres
```

### Migration Failed

**Solusi:**
```bash
# Reset database (DEVELOPMENT ONLY!)
npx prisma db push --force-reset

# Atau apply migrations
npx prisma migrate deploy
```

---

## 🐳 Docker Issues

### Container Restart Loop

**Solusi:**
```bash
# Cek logs
docker compose logs app

# Rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Out of Memory

**Solusi:**
```bash
# Cek memory
docker stats

# Tambah swap jika perlu
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📹 Video Issues

### Video Tidak Play

**Solusi:**
1. Cek URL video valid
2. Pastikan browser allow autoplay
3. Cek network connection
4. Refresh halaman

### Progress Tidak Tersimpan

**Solusi:**
1. Cek login status
2. Buka browser console untuk error
3. Cek database connection

---

## 📱 Mobile Issues

### UI Tidak Responsive

**Solusi:**
1. Clear cache browser
2. Update browser ke versi terbaru
3. Coba mode incognito

### QR Scanner Tidak Berfungsi

**Solusi:**
1. Izinkan akses kamera
2. Pastikan HTTPS (bukan HTTP)
3. Coba browser lain (Chrome recommended)

---

## 🔧 Common Commands

```bash
# Restart semua services
docker compose restart

# Lihat logs
docker compose logs -f app

# Masuk ke container
docker compose exec app sh

# Cek database
docker compose exec postgres psql -U postgres -d ULP_asn

# Clear Prisma cache
npx prisma generate
```

---

## 🆘 Getting Help

1. Cek dokumentasi di `/docs`
2. Buka issue di repository
3. Hubungi tim support

---

*Dokumen ini terakhir diperbarui: 27 Januari 2026*
