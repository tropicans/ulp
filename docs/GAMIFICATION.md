# Gamification - ULP ASN

Dokumen ini menjelaskan sistem gamifikasi dalam aplikasi TITAN ULP.

---

## 📚 Gambaran Umum

Sistem gamifikasi dirancang untuk meningkatkan engagement dan motivasi peserta dengan:

- **Points** - Poin dari berbagai aktivitas
- **Levels** - Level berdasarkan akumulasi poin
- **Badges** - Penghargaan untuk pencapaian tertentu
- **Streaks** - Bonus untuk aktivitas berturut-turut
- **Leaderboard** - Ranking kompetitif
- **Certificates** - Sertifikat penyelesaian

---

## 🎯 Point System

### Point Values

| Action | Points | Description |
|--------|--------|-------------|
| `LESSON_COMPLETE` | +10 | Menyelesaikan 1 lesson |
| `QUIZ_PASS` | +30 | Lulus quiz |
| `COURSE_COMPLETE` | +100 | Menyelesaikan kursus |
| `DAILY_LOGIN` | +5 | Login harian |
| `ATTENDANCE_PRESENT` | +20 | Hadir di sesi tatap muka |

### Bonus Points

| Achievement | Bonus |
|-------------|-------|
| First try quiz pass | +10 |
| Perfect score (100%) | +20 |
| 7-day streak | +50 |
| 30-day streak | +200 |

### Implementation

```typescript
export async function awardPoints(userId: string, action: GamificationAction) {
  const pointsToAdd = POINT_VALUES[action]
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      points: { increment: pointsToAdd },
      lastActiveAt: new Date()
    }
  })
  
  // Check level up
  const newLevel = Math.floor(user.points / 200) + 1
  if (newLevel > user.level) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel }
    })
    await checkAndAwardLevelBadges(userId, newLevel)
  }
  
  return { pointsEarned: pointsToAdd, currentPoints: user.points }
}
```

---

## 📈 Level System

### Level Calculation

```
Level = floor(TotalPoints / 200) + 1
```

| Level | Points Required | Title |
|-------|-----------------|-------|
| 1 | 0 | Pemula |
| 2 | 200 | Pelajar |
| 3 | 400 | Terampil |
| 4 | 600 | Mahir |
| 5 | 800 | Ahli |
| 6 | 1000 | Master |
| 7 | 1200 | Grandmaster |
| 8+ | 1400+ | Legend |

### Level Progress

```typescript
function getLevelProgress(points: number): LevelProgress {
  const currentLevel = Math.floor(points / 200) + 1
  const currentLevelPoints = (currentLevel - 1) * 200
  const nextLevelPoints = currentLevel * 200
  const progress = points - currentLevelPoints
  const required = 200
  
  return {
    level: currentLevel,
    progress,
    required,
    percentage: (progress / required) * 100
  }
}
```

### Level Up Notification

```tsx
<Dialog open={showLevelUp}>
  <DialogContent className="text-center">
    <div className="text-6xl mb-4">🎉</div>
    <DialogTitle>Level Up!</DialogTitle>
    <p>Selamat! Anda naik ke Level {newLevel}</p>
    <p className="text-sm text-muted-foreground">
      {getLevelTitle(newLevel)}
    </p>
  </DialogContent>
</Dialog>
```

---

## 🏅 Badge System

### Badge Types

| Type | Description |
|------|-------------|
| `ACHIEVEMENT` | Pencapaian spesifik |
| `MILESTONE` | Milestone tertentu |
| `SPECIAL` | Event khusus |

### Available Badges

#### Achievement Badges

| Badge | Criteria | Icon |
|-------|----------|------|
| First Course | Selesaikan kursus pertama | 🎓 |
| Quiz Master | Lulus 10 quiz | 📝 |
| Perfect Score | Nilai 100% di quiz | ⭐ |
| Fast Learner | Selesaikan kursus dalam 1 minggu | 🚀 |
| Bookworm | Selesaikan 10 kursus | 📚 |
| Knowledge Seeker | Selesaikan 50 lessons | 🔍 |

#### Milestone Badges

| Badge | Criteria | Icon |
|-------|----------|------|
| Level 5 | Capai level 5 | 🥉 |
| Level 10 | Capai level 10 | 🥈 |
| Level 20 | Capai level 20 | 🥇 |
| 1000 Points | Kumpulkan 1000 poin | 💎 |
| Full Attendance | 100% kehadiran | ✅ |

#### Special Badges

| Badge | Criteria | Icon |
|-------|----------|------|
| Early Adopter | Register di bulan pertama | 🌟 |
| Top Performer | #1 di leaderboard bulan ini | 🏆 |
| Helper | Membantu 10 peserta di forum | 🤝 |

### Badge Award Logic

```typescript
// Check and award badges
async function checkBadgeCriteria(userId: string) {
  const user = await getUserWithStats(userId)
  const badges = await getUnlockedBadges(userId)
  
  const newBadges = []
  
  // Check course completion badges
  if (user.completedCourses >= 1 && !hasBadge(badges, "first_course")) {
    newBadges.push(await awardBadge(userId, "first_course"))
  }
  
  if (user.completedCourses >= 10 && !hasBadge(badges, "bookworm")) {
    newBadges.push(await awardBadge(userId, "bookworm"))
  }
  
  // Check quiz badges
  if (user.quizzesPassed >= 10 && !hasBadge(badges, "quiz_master")) {
    newBadges.push(await awardBadge(userId, "quiz_master"))
  }
  
  // Check level badges
  if (user.level >= 5 && !hasBadge(badges, "level_5")) {
    newBadges.push(await awardBadge(userId, "level_5"))
  }
  
  return newBadges
}
```

---

## 🔥 Streak System

### How It Works

1. Login setiap hari untuk mempertahankan streak
2. Streak direset jika skip 1 hari
3. Bonus poin untuk milestone streak

### Streak Implementation

```typescript
export async function updateActivityStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveAt: true, streak: true }
  })
  
  const now = new Date()
  const lastActive = user.lastActiveAt
  
  if (!lastActive) {
    // First activity
    await prisma.user.update({
      where: { id: userId },
      data: { streak: 1, lastActiveAt: now }
    })
    return { streak: 1 }
  }
  
  const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    // Consecutive day
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        streak: { increment: 1 },
        lastActiveAt: now
      }
    })
    
    // Award daily login bonus
    await awardPoints(userId, "DAILY_LOGIN")
    
    // Check streak milestones
    if (updatedUser.streak === 7) {
      await awardBonusPoints(userId, 50, "7-day streak")
    } else if (updatedUser.streak === 30) {
      await awardBonusPoints(userId, 200, "30-day streak")
    }
    
    return { streak: updatedUser.streak }
  } else if (diffDays > 1) {
    // Streak broken
    await prisma.user.update({
      where: { id: userId },
      data: { streak: 1, lastActiveAt: now }
    })
    return { streak: 1, broken: true }
  }
  
  // Same day
  return { streak: user.streak }
}
```

### Streak UI

```tsx
<div className="streak-widget">
  <div className="streak-fire">🔥</div>
  <div className="streak-count">{streak}</div>
  <div className="streak-label">hari berturut-turut</div>
  
  {/* Streak calendar */}
  <div className="streak-calendar">
    {last7Days.map(day => (
      <div 
        key={day.date}
        className={cn(
          "streak-day",
          day.active && "streak-day-active"
        )}
      />
    ))}
  </div>
</div>
```

---

## 🏆 Leaderboard

### Types

| Leaderboard | Scope |
|-------------|-------|
| Global | Semua pengguna |
| Unit Kerja | Pengguna dalam unit kerja |
| Course | Peserta dalam kursus |
| Monthly | Poin bulan ini |

### Implementation

```typescript
export async function getLeaderboard(
  limit = 10, 
  unitKerja?: string
): Promise<LeaderboardEntry[]> {
  const players = await prisma.user.findMany({
    where: unitKerja ? { unitKerja } : undefined,
    orderBy: { points: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      image: true,
      points: true,
      level: true,
      unitKerja: true
    }
  })
  
  return players.map((player, index) => ({
    ...player,
    rank: index + 1
  }))
}
```

### Leaderboard UI

```tsx
<Card>
  <CardHeader>
    <CardTitle>🏆 Leaderboard</CardTitle>
    <Tabs value={scope} onValueChange={setScope}>
      <TabsList>
        <TabsTrigger value="global">Global</TabsTrigger>
        <TabsTrigger value="unit">Unit Kerja</TabsTrigger>
        <TabsTrigger value="monthly">Bulan Ini</TabsTrigger>
      </TabsList>
    </Tabs>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Level</TableHead>
          <TableHead>Poin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => (
          <TableRow key={player.id}>
            <TableCell>
              {player.rank <= 3 ? (
                <span className="medal">
                  {player.rank === 1 && "🥇"}
                  {player.rank === 2 && "🥈"}
                  {player.rank === 3 && "🥉"}
                </span>
              ) : (
                <span>{player.rank}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src={player.image} />
                  <AvatarFallback>{player.name?.[0]}</AvatarFallback>
                </Avatar>
                <span>{player.name}</span>
              </div>
            </TableCell>
            <TableCell>Lv. {player.level}</TableCell>
            <TableCell className="font-bold">{player.points}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

---

## 📜 Certificate System

### Certificate Generation

```typescript
async function generateCourseCertificate(courseId: string) {
  const session = await auth()
  const userId = session.user.id
  
  // Verify completion
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } }
  })
  
  if (enrollment.progress < 100) {
    return { error: "Kursus belum selesai" }
  }
  
  // Generate certificate
  const certificate = await prisma.certificate.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      courseId,
      certificateNo: generateCertificateNo(),
      verificationCode: generateVerificationCode(),
      issuedAt: new Date()
    }
  })
  
  // Generate PDF
  const pdfUrl = await generateCertificatePDF(certificate)
  
  // Update with PDF URL
  await prisma.certificate.update({
    where: { id: certificate.id },
    data: { pdfUrl }
  })
  
  // Track xAPI
  await trackCertificateEarned(userId, courseId, certificate.id)
  
  return { certificate }
}
```

### Certificate PDF

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         SERTIFIKAT                              │
│                                                                 │
│                   Nomor: CERT-2026-00001                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│                   Diberikan kepada:                             │
│                                                                 │
│                     SITI AMINAH                                 │
│                  NIP: 199203032019031004                        │
│                                                                 │
│             Yang telah menyelesaikan pelatihan:                 │
│                                                                 │
│         PELATIHAN KEPEMIMPINAN LINGKUNGAN DIGITAL               │
│                                                                 │
│              Dengan hasil: SANGAT BAIK                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│     Jakarta, 27 Januari 2026                                    │
│                                                                 │
│     [QR Code]                          [Signature]              │
│     Scan untuk                         Kepala Pusdiklat         │
│     verifikasi                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Certificate Verification

```typescript
export async function verifyCertificate(code: string) {
  const certificate = await prisma.certificate.findFirst({
    where: {
      OR: [
        { certificateNo: code },
        { verificationCode: code }
      ]
    },
    include: {
      user: { select: { name: true, nip: true } },
      course: { select: { title: true } }
    }
  })
  
  if (!certificate) {
    return { valid: false, error: "Sertifikat tidak ditemukan" }
  }
  
  return {
    valid: true,
    certificate: {
      certificateNo: certificate.certificateNo,
      userName: certificate.user.name,
      userNip: certificate.user.nip,
      courseName: certificate.course.title,
      issuedAt: certificate.issuedAt
    }
  }
}
```

---

## 📊 Gamification Stats

### User Stats Widget

```tsx
<Card>
  <CardHeader>
    <CardTitle>Statistik Anda</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Level Progress */}
    <div>
      <div className="flex justify-between mb-2">
        <span>Level {stats.level}</span>
        <span>{stats.currentProgress}/{stats.nextLevelExp} XP</span>
      </div>
      <Progress value={(stats.currentProgress / stats.nextLevelExp) * 100} />
    </div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-2xl font-bold">{stats.points}</div>
        <div className="text-sm text-muted-foreground">Poin</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{stats.badges.length}</div>
        <div className="text-sm text-muted-foreground">Badge</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{stats.streak}🔥</div>
        <div className="text-sm text-muted-foreground">Streak</div>
      </div>
    </div>
    
    {/* Recent Badges */}
    <div>
      <h4 className="font-medium mb-2">Badge Terbaru</h4>
      <div className="flex gap-2">
        {stats.badges.slice(0, 5).map(badge => (
          <Badge key={badge.id} icon={badge.icon} name={badge.name} />
        ))}
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 🔧 API Reference

### Server Actions

| Function | Description |
|----------|-------------|
| `awardPoints(userId, action)` | Award points |
| `updateActivityStreak(userId)` | Update streak |
| `getUserGamificationStats()` | Get user stats |
| `getLeaderboard(limit?, unitKerja?)` | Get leaderboard |
| `awardBadge(userId, badgeId)` | Award badge |
| `generateCourseCertificate(courseId)` | Generate certificate |
| `verifyCertificate(code)` | Verify certificate |

---

*Dokumen ini terakhir diperbarui: 27 Januari 2026*
