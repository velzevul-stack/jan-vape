CREATE TABLE IF NOT EXISTS "app_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" varchar(64) NOT NULL,
  "payload" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_app_alerts_created_at" ON "app_alerts" ("createdAt");
