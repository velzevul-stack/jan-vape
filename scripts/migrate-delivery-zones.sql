CREATE TABLE IF NOT EXISTS "delivery_zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "aliases" jsonb NOT NULL DEFAULT '[]',
  "roundTripMinutes" int NOT NULL,
  "deliveryFee" decimal(10, 2) NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" int NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_delivery_zones_code" ON "delivery_zones" ("code");

ALTER TABLE "web_bookings"
  ADD COLUMN IF NOT EXISTS "deliveryZoneId" uuid NULL,
  ADD COLUMN IF NOT EXISTS "deliveryFee" decimal(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roundTripMinutes" int NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_web_bookings_delivery_zone'
  ) THEN
    ALTER TABLE "web_bookings"
      ADD CONSTRAINT "fk_web_bookings_delivery_zone"
      FOREIGN KEY ("deliveryZoneId") REFERENCES "delivery_zones" ("id") ON DELETE SET NULL;
  END IF;
END $$;

INSERT INTO "delivery_zones" ("code", "name", "aliases", "roundTripMinutes", "deliveryFee", "sortOrder")
VALUES
  ('ivatevichi', 'Ивацевичи', '["ивцевичи","город"]', 5, 0, 0),
  ('mihnovichi', 'Михновичи', '["михновичи"]', 10, 0, 10),
  ('panki', 'Панки', '["панки"]', 15, 0, 20),
  ('kholopya', 'Холопья', '["холопья"]', 10, 0, 30),
  ('ozerco', 'Озерцо', '["озерцо"]', 15, 5, 40),
  ('ozero2', '2-е озеро', '["2 е озеро","2-е озеро","второе озеро"]', 20, 10, 50),
  ('maisk', 'Майск', '["майск"]', 25, 5, 60),
  ('yaglevichi', 'Яглевичи', '["яглевичи"]', 20, 5, 70),
  ('podstarin', 'Подстаринь', '["подстаринь"]', 20, 5, 80),
  ('pyatak', 'Пятак', '["пятак"]', 15, 5, 90),
  ('volya', 'Воля', '["воля"]', 15, 5, 100),
  ('barany', 'Бараны', '["бараны"]', 15, 0, 110),
  ('goschevo', 'Гощево', '["гощево"]', 20, 7, 120),
  ('stayki', 'Стайки', '["стайки"]', 20, 0, 130),
  ('alexeyki', 'Алексейки', '["алексейки"]', 20, 5, 140),
  ('lyubishchitsy', 'Любищицы', '["любищицы"]', 20, 5, 150),
  ('zeleny_bor', 'Зелёный Бор', '["зеленый бор","зелёный бор"]', 35, 15, 160),
  ('nekhachevo', 'Нехачево', '["нехачево"]', 25, 15, 170),
  ('kossovo', 'Коссово', '["коссово"]', 30, 15, 180),
  ('busyazh', 'Бусяж', '["бусяж"]', 45, 20, 190),
  ('galenchitsy', 'Галенчицы', '["галенчицы"]', 20, 10, 200),
  ('mileyki', 'Милейки', '["милейки"]', 30, 15, 210),
  ('zapolye', 'Заполье', '["заполье"]', 40, 15, 220)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "aliases" = EXCLUDED."aliases",
  "roundTripMinutes" = EXCLUDED."roundTripMinutes",
  "deliveryFee" = EXCLUDED."deliveryFee",
  "sortOrder" = EXCLUDED."sortOrder";
