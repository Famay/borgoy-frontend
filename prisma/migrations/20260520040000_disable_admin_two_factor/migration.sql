UPDATE "User"
SET
  "twoFactorEnabled" = false,
  "twoFactorCodeHash" = NULL,
  "twoFactorCodeExpiresAt" = NULL,
  "twoFactorCodeAttempts" = 0,
  "twoFactorCodeSentAt" = NULL
WHERE "role" = 'ADMIN';
