BEGIN;

DELETE FROM "web_bookings";
DELETE FROM "app_alerts";
DELETE FROM "verification_tokens";
DELETE FROM "notification_outbox";

COMMIT;
