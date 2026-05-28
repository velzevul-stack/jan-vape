CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" varchar(64) NOT NULL,
  "telegramUsername" varchar(255) NOT NULL,
  "telegramUserId" bigint,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_verification_tokens_token"
  ON "verification_tokens" ("token");

CREATE INDEX IF NOT EXISTS "IDX_verification_tokens_username"
  ON "verification_tokens" ("telegramUsername");
