-- Migration: add fulfillment status + tracking to existing orders table.
-- Run once on databases created before this change:
--   npx wrangler d1 execute momento-db --local  --file=./migrations/0001_order_fulfillment.sql
--   npx wrangler d1 execute momento-db --remote --file=./migrations/0001_order_fulfillment.sql

ALTER TABLE orders ADD COLUMN fulfillment TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN courier TEXT;
