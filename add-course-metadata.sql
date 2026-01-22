-- Add course metadata fields to Course table
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "course_short_desc" VARCHAR;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "course_desc" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "course_level" VARCHAR DEFAULT 'Beginner';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "language" VARCHAR DEFAULT 'Bahasa Indonesia';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "requirements" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "outcomes" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "recommended_next" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "jp" DECIMAL(8,2);
