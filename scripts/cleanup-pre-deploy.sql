BEGIN;

DELETE FROM "app_alerts";

DELETE FROM "web_bookings"
WHERE "status" = 'cancelled';

DELETE FROM "notification_outbox"
WHERE "status" IN ('sent', 'failed');

COMMIT;
