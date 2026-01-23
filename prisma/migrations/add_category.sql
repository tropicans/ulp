-- Create Category table
CREATE TABLE IF NOT EXISTS "Category" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT,
    "order" INT DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) DEFAULT NOW()
);

-- Add categoryId column to Course table if not exists
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS category_id TEXT;

-- Create index on Course.category_id
CREATE INDEX IF NOT EXISTS "Course_category_id_idx" ON "Course"(category_id);
