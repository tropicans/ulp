-- Add sync_config column to Course
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "sync_config" JSONB;

-- Create SyncCourseStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "SyncCourseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create SyncCourseProgress table
CREATE TABLE IF NOT EXISTS "sync_course_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "pre_learn_accessed_at" TIMESTAMP(3),
    "live_accessed_at" TIMESTAMP(3),
    "concept_markers" JSONB,
    "post_learn_submitted_at" TIMESTAMP(3),
    "assessment_score" DOUBLE PRECISION,
    "assessment_response" JSONB,
    "status" "SyncCourseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_course_progress_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint (ignore if exists)
DO $$ BEGIN
    ALTER TABLE "sync_course_progress" ADD CONSTRAINT "sync_course_progress_user_id_course_id_key" UNIQUE ("user_id", "course_id");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "sync_course_progress_user_id_status_idx" ON "sync_course_progress"("user_id", "status");
CREATE INDEX IF NOT EXISTS "sync_course_progress_course_id_idx" ON "sync_course_progress"("course_id");

-- Add foreign keys (ignore if exists)
DO $$ BEGIN
    ALTER TABLE "sync_course_progress" ADD CONSTRAINT "sync_course_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "sync_course_progress" ADD CONSTRAINT "sync_course_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
