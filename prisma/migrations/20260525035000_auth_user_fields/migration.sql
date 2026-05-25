-- Add auth/account recovery fields to User required by auth controller
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerificationExpires" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
