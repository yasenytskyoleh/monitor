ALTER TABLE "product_domain"."pattern_notification"
  ADD COLUMN "delivery_lease_id" TEXT,
  ADD COLUMN "delivery_lease_expires_at_utc" TIMESTAMPTZ(3);

ALTER TABLE "product_domain"."pattern_notification"
  ADD CONSTRAINT "pattern_notification_delivery_lease_consistent" CHECK (
    ("delivery_lease_id" IS NULL AND "delivery_lease_expires_at_utc" IS NULL) OR
    ("delivery_status" = 'delivery_attempted' AND
      length(trim("delivery_lease_id")) > 0 AND
      "delivery_lease_expires_at_utc" > "delivery_attempted_at_utc")
  );

CREATE INDEX "idx_pattern_notification_delivery_lease_expiry"
  ON "product_domain"."pattern_notification" ("delivery_status", "delivery_lease_expires_at_utc");
