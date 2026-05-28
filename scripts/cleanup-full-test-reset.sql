BEGIN;

DELETE FROM "web_bookings";
DELETE FROM "web_sales";
DELETE FROM "app_alerts";
DELETE FROM "verification_tokens";
DELETE FROM "telegram_customers";
DELETE FROM "product_snapshots";
DELETE FROM "custom_addresses";
DELETE FROM "blocked_slots";
DELETE FROM "sync_cursors";
DELETE FROM "idempotency_keys";
DELETE FROM "notification_outbox";

COMMIT;
