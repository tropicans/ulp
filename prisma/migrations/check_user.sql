-- Check current user
SELECT id, email, phone FROM "User" WHERE email = 'tropicans@gmail.com';

-- Check OTP
SELECT * FROM "UserVerificationOTP" ORDER BY "createdAt" DESC LIMIT 3;
