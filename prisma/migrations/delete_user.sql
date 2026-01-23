-- Delete OTP tokens first (to avoid foreign key constraint)
DELETE FROM "UserVerificationOTP" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'tropicans@gmail.com');

-- Delete accounts linked to this user
DELETE FROM "Account" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'tropicans@gmail.com');

-- Delete sessions
DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'tropicans@gmail.com');

-- Delete user
DELETE FROM "User" WHERE email = 'tropicans@gmail.com';
