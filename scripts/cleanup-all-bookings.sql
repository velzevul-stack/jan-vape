BEGIN;

DELETE FROM "web_bookings";
DELETE FROM "app_alerts";
DELETE FROM "notification_outbox";

COMMIT;
