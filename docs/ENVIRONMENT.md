# Environment Variables - ULP ASN

Dokumen ini menjelaskan semua environment variable yang digunakan dalam aplikasi TITAN ULP.

---

## 📝 Cara Penggunaan

1. Copy file `.env.example` ke `.env`
2. Edit nilai-nilai sesuai environment Anda
3. Restart aplikasi setelah mengubah environment

```bash
cp .env.example .env
```

---

## 🗄️ Database

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:password@host:port/database?schema=public` |

**Format Connection String:**
```
postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=public
```

**Contoh untuk Development:**
```env
DATABASE_URL="postgresql://postgres:ULP_password@localhost:5433/ULP_asn?schema=public"
```

**Contoh untuk Docker:**
```env
DATABASE_URL="postgresql://postgres:password@postgres:5432/ULP_asn?schema=public&connection_limit=10"
```

---

## 🔐 Authentication

| Variable | Required | Deskripsi |
|----------|----------|-----------|
| `AUTH_SECRET` | ✅ Ya | Secret key untuk enkripsi JWT (min. 32 karakter) |
| `AUTH_URL` | ✅ Ya | Base URL aplikasi untuk callback |

```env
# WAJIB: Generate secret yang kuat untuk production
AUTH_SECRET="your-super-secret-key-at-least-32-characters"
AUTH_URL="http://localhost:3001"
```

> ⚠️ **PENTING**: Gunakan secret yang berbeda untuk setiap environment (dev, staging, production)

---

## 🔑 Google OAuth (Opsional)

Untuk mengaktifkan login dengan Google:

| Variable | Deskripsi |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | Client ID dari Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret dari Google Cloud Console |

**Cara Mendapatkan:**
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Enable **Google+ API**
4. Buat **OAuth 2.0 Client ID**
5. Tambahkan authorized redirect URI: `http://localhost:3001/api/auth/callback/google`

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"
```

---

## 🏢 LDAP Configuration (Opsional)

Untuk integrasi dengan Active Directory/LDAP ASN:

| Variable | Deskripsi |
|----------|-----------|
| `LDAP_URL` | URL server LDAP |
| `LDAP_BIND_DN` | Distinguished Name untuk bind |
| `LDAP_BIND_PASSWORD` | Password untuk bind |
| `LDAP_SEARCH_BASE` | Base DN untuk search user |
| `LDAP_SEARCH_FILTER` | Filter untuk search user |

```env
LDAP_URL="ldap://ldap.example.go.id:389"
LDAP_BIND_DN="cn=admin,dc=example,dc=go,dc=id"
LDAP_BIND_PASSWORD="admin-password"
LDAP_SEARCH_BASE="ou=users,dc=example,dc=go,dc=id"
LDAP_SEARCH_FILTER="(uid={{username}})"
```

> Kosongkan jika tidak menggunakan LDAP. Aplikasi akan fallback ke database authentication.

---

## 📹 Zoom API (Opsional)

Untuk fitur live online sessions:

| Variable | Deskripsi |
|----------|-----------|
| `ZOOM_ACCOUNT_ID` | Zoom Account ID |
| `ZOOM_CLIENT_ID` | OAuth Client ID |
| `ZOOM_CLIENT_SECRET` | OAuth Client Secret |

```env
ZOOM_ACCOUNT_ID="your-zoom-account-id"
ZOOM_CLIENT_ID="your-zoom-client-id"
ZOOM_CLIENT_SECRET="your-zoom-client-secret"
```

---

## 🤖 AI Services

### OpenAI

| Variable | Deskripsi |
|----------|-----------|
| `OPENAI_API_KEY` | API Key dari OpenAI |

```env
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
```

### AI Proxy (Custom)

| Variable | Deskripsi |
|----------|-----------|
| `AI_PROXY_URL` | URL proxy AI |
| `AI_PROXY_KEY` | API Key untuk proxy |
| `AI_MODEL` | Model yang digunakan |

```env
AI_PROXY_URL="https://your-ai-proxy.com"
AI_PROXY_KEY="your-api-key"
AI_MODEL="gpt-4"
```

### Ollama (Local LLM)

| Variable | Deskripsi |
|----------|-----------|
| `OLLAMA_BASE_URL` | URL Ollama server |
| `OLLAMA_MODEL` | Model yang digunakan |

```env
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:14b-instruct"
```

---

## 📦 Storage (MinIO/S3)

| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `S3_ENDPOINT` | Endpoint MinIO/S3 | `http://localhost:9000` |
| `S3_ACCESS_KEY` | Access key | `minioadmin` |
| `S3_SECRET_KEY` | Secret key | `minioadmin` |
| `S3_BUCKET` | Nama bucket | `ULP-files` |

```env
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="ULP-files"
```

---

## 🔄 Redis

| Variable | Deskripsi |
|----------|-----------|
| `REDIS_URL` | Connection string Redis |

```env
REDIS_URL="redis://localhost:6380"
```

---

## 📺 YouTube Integration

| Variable | Deskripsi |
|----------|-----------|
| `YOUTUBE_API_KEY` | API Key dari Google Console |

```env
YOUTUBE_API_KEY="AIzaSy-xxxxxxxxxxxxxxxx"
```

**Cara Mendapatkan:**
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **YouTube Data API v3**
3. Buat **API Key**

---

## 📊 xAPI LRS (Learning Record Store)

| Variable | Deskripsi |
|----------|-----------|
| `LRS_ENDPOINT` | Endpoint xAPI statements |
| `LRS_API_KEY` | API Key untuk LRS |
| `LRS_SECRET_KEY` | Secret Key untuk LRS |

```env
LRS_ENDPOINT="http://lrsql:8080/xapi/statements"
LRS_API_KEY="your-lrs-api-key"
LRS_SECRET_KEY="your-lrs-secret-key"
```

---

## 📧 Email (Resend)

| Variable | Deskripsi |
|----------|-----------|
| `RESEND_API_KEY` | API Key dari Resend |
| `EMAIL_FROM` | Alamat email pengirim |

```env
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="noreply@your-domain.com"
```

---

## 📱 WhatsApp (Fonnte)

| Variable | Deskripsi |
|----------|-----------|
| `FONNTE_API_KEY` | API Key dari Fonnte |

```env
FONNTE_API_KEY="your-fonnte-api-key"
```

---

## 🌐 Application Config

| Variable | Deskripsi |
|----------|-----------|
| `NEXT_PUBLIC_APP_NAME` | Nama aplikasi (tampil di UI) |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi |

```env
NEXT_PUBLIC_APP_NAME="TITAN"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

---

## 🎙️ Audio & Voice Services (ElevenLabs)

| Variable | Deskripsi |
|----------|-----------|
| `ELEVENLABS_API_KEY` | API Key dari ElevenLabs |
| `ELEVENLABS_VOICE_ID` | Voice ID default untuk TTS |

```env
ELEVENLABS_API_KEY="your-elevenlabs-api-key"
ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"
```

**Cara Mendapatkan:**
1. Daftar di [ElevenLabs](https://elevenlabs.io/)
2. Buka Settings → API Keys
3. Generate new API key

---

## 🌐 AI Proxy (proxy.kelazz.my.id)

| Variable | Deskripsi |
|----------|-----------|
| `AI_PROXY_URL` | URL AI Proxy gateway |

```env
AI_PROXY_URL="https://proxy.kelazz.my.id"
```

Proxy ini digunakan untuk:
- Generate course info
- Refine lesson titles
- Generate thumbnails
- Generate quiz questions

---

## 🔗 Webhook URLs

| Variable | Deskripsi |
|----------|-----------|
| `WEBHOOK_URL` | URL webhook utama |
| `CURATION_WEBHOOK_URL` | Webhook untuk curation |
| `WORKFLOW2_WEBHOOK_URL` | Webhook untuk metadata generation |
| `WEBHOOK_HMAC_SECRET` | Secret untuk validasi HMAC |

---

## 📋 Environment Template

```env
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL="postgresql://postgres:password@localhost:5433/ULP_asn?schema=public"

# ===========================================
# AUTHENTICATION
# ===========================================
AUTH_SECRET="change-this-to-a-random-32-char-string"
AUTH_URL="http://localhost:3001"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# LDAP (optional)
LDAP_URL=""
LDAP_BIND_DN=""
LDAP_BIND_PASSWORD=""
LDAP_SEARCH_BASE=""
LDAP_SEARCH_FILTER=""

# ===========================================
# STORAGE
# ===========================================
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="ULP-files"

# ===========================================
# CACHE
# ===========================================
REDIS_URL="redis://localhost:6380"

# ===========================================
# AI SERVICES
# ===========================================
OPENAI_API_KEY=""
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:14b-instruct"

# ===========================================
# EXTERNAL APIS
# ===========================================
YOUTUBE_API_KEY=""

# ===========================================
# xAPI LRS
# ===========================================
LRS_ENDPOINT="http://lrsql:8080/xapi/statements"
LRS_API_KEY=""
LRS_SECRET_KEY=""

# ===========================================
# EMAIL & NOTIFICATIONS
# ===========================================
RESEND_API_KEY=""
EMAIL_FROM="noreply@example.com"
FONNTE_API_KEY=""

# ===========================================
# APPLICATION
# ===========================================
NEXT_PUBLIC_APP_NAME="TITAN"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

---

*Dokumen ini terakhir diperbarui: 27 Januari 2026*
