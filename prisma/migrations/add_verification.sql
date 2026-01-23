-- Add phoneVerified to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" TIMESTAMP;

-- Create UserVerificationOTP table
CREATE TABLE IF NOT EXISTS "UserVerificationOTP" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uvo_token ON "UserVerificationOTP"(token);
CREATE INDEX IF NOT EXISTS idx_uvo_user ON "UserVerificationOTP"("userId");
CREATE INDEX IF NOT EXISTS idx_uvo_expires ON "UserVerificationOTP"("expiresAt");
