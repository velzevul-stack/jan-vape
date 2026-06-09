-- Full schema for jan-vape-suite (mirrors Neon/TypeORM entity definitions)
-- Run once on a fresh database. TypeORM synchronize=false in production, so
-- this file creates all tables. After migrating data from Neon you only need
-- to run the incremental migrate-*.sql scripts that you haven't applied yet.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────────
-- pickup_locations
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "pickup_locations" (
  "id"                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"              varchar(50)  NOT NULL,
  "name"              varchar(255) NOT NULL,
  "address"           varchar(500) NOT NULL DEFAULT '',
  "isActive"          boolean      NOT NULL DEFAULT true,
  "isFeatured"        boolean      NOT NULL DEFAULT true,
  "sortOrder"         integer      NOT NULL DEFAULT 0,
  "workDayStart"      varchar(5)   NOT NULL DEFAULT '12:00',
  "workDayEnd"        varchar(5)   NOT NULL DEFAULT '23:00',
  "maxBookingsPerSlot" integer     NOT NULL DEFAULT 1,
  "slotStepMinutes"   integer      NOT NULL DEFAULT 5,
  CONSTRAINT "uq_pickup_locations_code" UNIQUE ("code")
);

-- ──────────────────────────────────────────────────────────────────────────────
-- custom_addresses
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "custom_addresses" (
  "id"            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "normalizedKey" varchar(500) NOT NULL,
  "label"         varchar(500) NOT NULL,
  "salesCount"    integer      NOT NULL DEFAULT 0,
  "isPromoted"    boolean      NOT NULL DEFAULT false,
  "promotedAt"    timestamptz,
  "createdAt"     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "uq_custom_addresses_normalized_key" UNIQUE ("normalizedKey")
);

-- ──────────────────────────────────────────────────────────────────────────────
-- delivery_zones
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "delivery_zones" (
  "id"               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"             varchar(50)   NOT NULL,
  "name"             varchar(255)  NOT NULL,
  "aliases"          jsonb         NOT NULL DEFAULT '[]',
  "roundTripMinutes" integer       NOT NULL,
  "deliveryFee"      numeric(10,2) NOT NULL DEFAULT 0,
  "isActive"         boolean       NOT NULL DEFAULT true,
  "sortOrder"        integer       NOT NULL DEFAULT 0,
  CONSTRAINT "uq_delivery_zones_code" UNIQUE ("code")
);

-- ──────────────────────────────────────────────────────────────────────────────
-- product_snapshots
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "product_snapshots" (
  "id"           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "externalId"   integer       NOT NULL,
  "brand"        varchar(255)  NOT NULL,
  "flavor"       varchar(255)  NOT NULL,
  "category"     varchar(50)   NOT NULL,
  "strength"     varchar(50)   NOT NULL DEFAULT '',
  "tasteProfile" varchar(255)  NOT NULL DEFAULT '',
  "retailPrice"  numeric(10,2) NOT NULL,
  "postStock"    integer       NOT NULL DEFAULT 0,
  "sortOrder"    integer       NOT NULL DEFAULT 0,
  "isHidden"     boolean       NOT NULL DEFAULT false,
  "updatedAt"    timestamptz   NOT NULL DEFAULT now(),
  "deletedAt"    timestamptz,
  CONSTRAINT "uq_product_snapshots_external_id" UNIQUE ("externalId")
);

-- ──────────────────────────────────────────────────────────────────────────────
-- web_bookings
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "web_bookings" (
  "id"                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "publicNumber"             varchar(50)   NOT NULL,
  "source"                   varchar(10)   NOT NULL DEFAULT 'web',
  "customerName"             varchar(255)  NOT NULL,
  "customerTelegram"         varchar(255)  NOT NULL,
  "customerTelegramUserId"   bigint,
  "comment"                  text,
  "scheduledAt"              timestamptz   NOT NULL,
  "locationId"               uuid,
  "customAddressId"          uuid,
  "deliveryZoneId"           uuid,
  "deliveryFee"              numeric(10,2) NOT NULL DEFAULT 0,
  "roundTripMinutes"         integer,
  "items"                    jsonb         NOT NULL DEFAULT '[]',
  "totalAmount"              numeric(10,2) NOT NULL DEFAULT 0,
  "status"                   varchar(20)   NOT NULL DEFAULT 'pending',
  "cancelledFromStatus"      varchar(20),
  "appReservationId"         integer,
  "syncedToAppAt"            timestamptz,
  "createdAt"                timestamptz   NOT NULL DEFAULT now(),
  "updatedAt"                timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT "uq_web_bookings_public_number" UNIQUE ("publicNumber"),
  CONSTRAINT "fk_web_bookings_location"      FOREIGN KEY ("locationId")      REFERENCES "pickup_locations"("id")  ON DELETE SET NULL,
  CONSTRAINT "fk_web_bookings_address"       FOREIGN KEY ("customAddressId") REFERENCES "custom_addresses"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_web_bookings_zone"          FOREIGN KEY ("deliveryZoneId")  REFERENCES "delivery_zones"("id")   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_web_bookings_scheduled_at"  ON "web_bookings" ("scheduledAt");
CREATE INDEX IF NOT EXISTS "idx_web_bookings_status"        ON "web_bookings" ("status");
CREATE INDEX IF NOT EXISTS "idx_web_bookings_customer_tg"   ON "web_bookings" ("customerTelegram");

-- ──────────────────────────────────────────────────────────────────────────────
-- web_sales
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "web_sales" (
  "id"                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "externalSaleId"    integer       NOT NULL,
  "externalProductId" integer       NOT NULL,
  "quantity"          integer       NOT NULL DEFAULT 1,
  "revenue"           numeric(10,2) NOT NULL DEFAULT 0,
  "locationId"        uuid,
  "customAddressId"   uuid,
  "saleDate"          timestamptz   NOT NULL,
  "customerTelegram"  varchar(255),
  "syncedAt"          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT "uq_web_sales_external_sale_id" UNIQUE ("externalSaleId"),
  CONSTRAINT "fk_web_sales_location" FOREIGN KEY ("locationId")      REFERENCES "pickup_locations"("id")  ON DELETE SET NULL,
  CONSTRAINT "fk_web_sales_address"  FOREIGN KEY ("customAddressId") REFERENCES "custom_addresses"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_web_sales_customer_telegram" ON "web_sales" ("customerTelegram");

-- ──────────────────────────────────────────────────────────────────────────────
-- blocked_slots
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "blocked_slots" (
  "id"              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "locationId"      uuid,
  "customAddressId" uuid,
  "startsAt"        timestamptz  NOT NULL,
  "endsAt"          timestamptz  NOT NULL,
  "reason"          varchar(500),
  CONSTRAINT "fk_blocked_slots_location" FOREIGN KEY ("locationId")      REFERENCES "pickup_locations"("id")  ON DELETE SET NULL,
  CONSTRAINT "fk_blocked_slots_address"  FOREIGN KEY ("customAddressId") REFERENCES "custom_addresses"("id") ON DELETE SET NULL
);

-- ──────────────────────────────────────────────────────────────────────────────
-- sync_cursors
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sync_cursors" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId"         varchar(255) NOT NULL,
  "lastPulledAt"     timestamptz,
  "appVersion"       varchar(50),
  "lastHeartbeatAt"  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "uq_sync_cursors_client_id" UNIQUE ("clientId")
);

-- ──────────────────────────────────────────────────────────────────────────────
-- idempotency_keys
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "key"            varchar(255) PRIMARY KEY,
  "responseStatus" integer      NOT NULL,
  "responseBody"   jsonb        NOT NULL,
  "createdAt"      timestamptz  NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- notification_outbox
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "endpoint"     text        NOT NULL,
  "payload"      jsonb       NOT NULL,
  "attempts"     integer     NOT NULL DEFAULT 0,
  "lastError"    text,
  "nextRetryAt"  timestamptz NOT NULL,
  "deliveredAt"  timestamptz,
  "createdAt"    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notification_outbox_next_retry"   ON "notification_outbox" ("nextRetryAt");
CREATE INDEX IF NOT EXISTS "idx_notification_outbox_delivered_at" ON "notification_outbox" ("deliveredAt");

-- ──────────────────────────────────────────────────────────────────────────────
-- app_alerts
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "app_alerts" (
  "id"        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"      varchar(64) NOT NULL,
  "payload"   jsonb       NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_app_alerts_created_at" ON "app_alerts" ("createdAt");

-- ──────────────────────────────────────────────────────────────────────────────
-- telegram_customers
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "telegram_customers" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "telegramUsername" varchar(255) NOT NULL,
  "telegramId"       bigint,
  "verifiedAt"       timestamptz,
  "trustedAt"        timestamptz,
  "blockedAt"        timestamptz,
  "blockedReason"    text,
  "createdAt"        timestamptz NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_telegram_customers_username" UNIQUE ("telegramUsername")
);

-- ──────────────────────────────────────────────────────────────────────────────
-- verification_tokens
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "token"            varchar(64) NOT NULL,
  "telegramUsername" varchar(255) NOT NULL,
  "telegramUserId"   bigint,
  "expiresAt"        timestamptz NOT NULL,
  "usedAt"           timestamptz,
  "createdAt"        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_verification_tokens_token" UNIQUE ("token")
);
