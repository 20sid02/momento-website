-- Migration: add a "featured" flag to products (controls the homepage grid).
-- Run once on databases created before this change:
--   npx wrangler d1 execute momento-db --local  --file=./migrations/0002_product_featured.sql
--   npx wrangler d1 execute momento-db --remote --file=./migrations/0002_product_featured.sql

ALTER TABLE products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
