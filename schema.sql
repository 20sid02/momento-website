-- Momento store schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('pack', 'momento')),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_key   TEXT,                       -- R2 object key for the main image
  meta        TEXT NOT NULL DEFAULT '{}', -- JSON: type-specific fields (fixture, story, tagline, pack tier, ...)
  active      INTEGER NOT NULL DEFAULT 1,  -- 1 = visible in shop
  featured    INTEGER NOT NULL DEFAULT 0,  -- 1 = show on the homepage
  sort        INTEGER NOT NULL DEFAULT 0,  -- lower = earlier
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS variants (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,               -- e.g. "Pack of 5", "A4 Framed", "A3 Framed"
  price_paise INTEGER NOT NULL,            -- price in smallest currency unit (paise)
  stock       INTEGER,                     -- NULL = unlimited
  sort        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  receipt             TEXT NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  status              TEXT NOT NULL DEFAULT 'created', -- created | paid | failed
  amount_paise        INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  customer            TEXT NOT NULL DEFAULT '{}',      -- JSON {name,email,phone,address}
  items               TEXT NOT NULL DEFAULT '[]',      -- JSON snapshot of line items
  created_at          INTEGER NOT NULL,
  paid_at             INTEGER,
  fulfillment         TEXT NOT NULL DEFAULT 'pending', -- pending | processing | shipped | completed | cancelled
  tracking_number     TEXT,                            -- AWB / courier tracking number
  courier             TEXT                             -- e.g. BlueDart, Delhivery
);
CREATE INDEX IF NOT EXISTS idx_orders_rp ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
