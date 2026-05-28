BEGIN;

DELETE FROM "app_alerts";

DELETE FROM "web_bookings"
WHERE "status" = 'cancelled';

DELETE FROM "notification_outbox"
WHERE "deliveredAt" IS NOT NULL
   OR "attempts" >= 5;

COMMIT;
