ALTER TABLE "web_sales"
  ADD COLUMN IF NOT EXISTS "customerTelegram" varchar(255);

CREATE INDEX IF NOT EXISTS "IDX_web_sales_customerTelegram"
  ON "web_sales" (LOWER("customerTelegram"))
  WHERE "customerTelegram" IS NOT NULL;
