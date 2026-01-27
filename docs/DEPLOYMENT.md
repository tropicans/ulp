# Deployment Guide - ULP ASN

Dokumen ini menjelaskan cara deploy aplikasi TITAN ULP ke production.

---

## 🐳 Docker Compose (Recommended)

### Prerequisites

- Linux server (Ubuntu 20.04+)
- Docker 24+ dan Docker Compose v2+
- Minimum 4GB RAM, 2 vCPU
- Domain name configured

### Step 1: Clone & Configure

```bash
git clone https://github.com/your-org/ULP-asn.git /opt/ULP-asn
cd /opt/ULP-asn
cp .env.example .env
nano .env  # Edit with production values
```

**Production Environment:**

```env
POSTGRES_PASSWORD=strong_random_password_here
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="https://ULP.yourdomain.go.id"
NEXT_PUBLIC_APP_URL="https://ULP.yourdomain.go.id"
```

### Step 2: Build and Start

```bash
docker compose build
docker compose up -d
docker compose exec app npx prisma db push
```

### Step 3: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name ULP.yourdomain.go.id;

    ssl_certificate /etc/letsencrypt/live/ULP.yourdomain.go.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ULP.yourdomain.go.id/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🗄️ Database Backup

```bash
#!/bin/bash
# backup.sh
docker compose exec -T postgres pg_dump -U postgres ULP_asn | gzip > /opt/backups/db_$(date +%Y%m%d).sql.gz
```

Schedule with cron: `0 2 * * * /opt/ULP-asn/backup.sh`

---

## 🔄 Update Procedure

```bash
cd /opt/ULP-asn
git pull origin main
docker compose build
docker compose up -d
docker compose exec -T app npx prisma migrate deploy
```

---

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Generate strong AUTH_SECRET
- [ ] Enable SSL/TLS
- [ ] Configure firewall (UFW)
- [ ] Set up backup automation
- [ ] Configure rate limiting

---

*Dokumen ini terakhir diperbarui: 27 Januari 2026*
