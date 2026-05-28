BEGIN;

DELETE FROM "app_alerts";

DO $$
BEGIN
  IF to_regclass('public.verification_tokens') IS NOT NULL THEN
    DELETE FROM "verification_tokens"
    WHERE "usedAt" IS NOT NULL
       OR "expiresAt" < now();
  END IF;
END $$;

DELETE FROM "web_bookings"
WHERE "status" = 'cancelled';

DELETE FROM "notification_outbox"
WHERE "status" IN ('sent', 'failed');

COMMIT;
