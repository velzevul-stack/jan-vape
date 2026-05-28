BEGIN;

DELETE FROM "app_alerts";

DELETE FROM "verification_tokens"
WHERE "usedAt" IS NOT NULL
   OR "expiresAt" < now();

DELETE FROM "web_bookings"
WHERE "status" = 'cancelled';

DELETE FROM "notification_outbox"
WHERE "status" IN ('sent', 'failed');

COMMIT;
