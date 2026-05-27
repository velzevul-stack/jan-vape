CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "endpoint" text NOT NULL,
  "payload" jsonb NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "lastError" text,
  "nextRetryAt" timestamptz NOT NULL,
  "deliveredAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notification_outbox_next_retry" ON "notification_outbox" ("nextRetryAt");
CREATE INDEX IF NOT EXISTS "idx_notification_outbox_delivered_at" ON "notification_outbox" ("deliveredAt");
