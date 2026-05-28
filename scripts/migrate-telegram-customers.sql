CREATE TABLE IF NOT EXISTS "telegram_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "telegramUsername" varchar(255) NOT NULL,
  "telegramId" bigint,
  "verifiedAt" timestamptz,
  "trustedAt" timestamptz,
  "blockedAt" timestamptz,
  "blockedReason" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_telegram_customers_username"
  ON "telegram_customers" ("telegramUsername");

ALTER TABLE "web_bookings"
  ADD COLUMN IF NOT EXISTS "cancelledFromStatus" varchar(20);

INSERT INTO "telegram_customers" ("telegramUsername")
SELECT DISTINCT LOWER(
  CASE
    WHEN "customerTelegram" LIKE '@%' THEN "customerTelegram"
    ELSE '@' || "customerTelegram"
  END
)
FROM "web_bookings"
WHERE TRIM("customerTelegram") <> ''
ON CONFLICT ("telegramUsername") DO NOTHING;

UPDATE "web_bookings"
SET "cancelledFromStatus" = 'pending'
WHERE "status" = 'cancelled'
  AND "cancelledFromStatus" IS NULL;
