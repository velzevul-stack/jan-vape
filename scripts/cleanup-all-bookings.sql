BEGIN;

DELETE FROM "web_bookings";
DELETE FROM "app_alerts";

DO $$
BEGIN
  IF to_regclass('public.verification_tokens') IS NOT NULL THEN
    DELETE FROM "verification_tokens";
  END IF;
END $$;

DELETE FROM "notification_outbox";

COMMIT;
