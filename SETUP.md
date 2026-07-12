# Momento — Store Setup & Deployment Guide

A full storefront + admin + payments, running entirely on **Cloudflare Pages**.

- **Frontend** (`site/`) — landing page, shop, product pages, cart/checkout, admin panel. Plain HTML/CSS/JS, no build step.
- **API** (`functions/`) — Cloudflare Pages Functions (products, orders, checkout, auth).
- **Database** — Cloudflare **D1** (SQLite).
- **Images** — Cloudflare **R2** (object storage).
- **Payments** — **Razorpay** (Orders API + Checkout + webhook).

---

## 1. Prerequisites

- A **Cloudflare account** (free tier is fine to start).
- A **Razorpay account** → https://razorpay.com (use **Test Mode** keys while building).
- Node.js 18+ installed locally.

Install dependencies:

```bash
npm install
```

---

## 2. Run it locally first

```bash
# 1. copy the example secrets and edit them
cp .dev.vars.example .dev.vars      # set ADMIN_PASSWORD, SESSION_SECRET, and Razorpay TEST keys

# 2. create the local database + demo products
npm run db:init      # applies schema.sql to the local D1
npm run db:seed      # loads the 4 demo products (optional)

# 3. start the dev server (frontend + API + local D1 + local R2)
npm run dev
```

Then open:
- Storefront → http://127.0.0.1:8788/
- Shop → http://127.0.0.1:8788/shop.html
- Admin → http://127.0.0.1:8788/admin/  (log in with your `ADMIN_PASSWORD`)

> Real card payments need **valid Razorpay test keys** in `.dev.vars`. With placeholder keys, checkout will reach Razorpay and return an auth error — everything up to that point works.

---

## 3. Create the Cloudflare resources (one time)

```bash
npx wrangler login

# Database
npx wrangler d1 create momento-db
#   -> copy the printed "database_id" into wrangler.toml (replace REPLACE_WITH_YOUR_D1_DATABASE_ID)

# Image bucket
npx wrangler r2 bucket create momento-media
```

Apply the schema to the **remote** database:

```bash
npm run db:init:remote
# (optional demo data) npm run db:seed:remote
```

---

## 4. Set production secrets

Never commit these. Set each with `wrangler pages secret put`:

```bash
npx wrangler pages secret put RAZORPAY_KEY_ID
npx wrangler pages secret put RAZORPAY_KEY_SECRET
npx wrangler pages secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler pages secret put ADMIN_PASSWORD
npx wrangler pages secret put SESSION_SECRET   # any long random string
npx wrangler pages secret put RESEND_API_KEY   # optional — enables order emails (see §8)
```

(If you connect a Git repo in the Cloudflare dashboard instead, add these under
**Settings → Environment variables → Secrets**, and bind D1/R2 under
**Settings → Functions → D1/R2 bindings** using the same names: `DB`, `BUCKET`.)

---

## 5. Deploy

```bash
npm run deploy      # wrangler pages deploy
```

…or connect this repo to Cloudflare Pages for automatic deploys on every push
(**Build output directory:** `site`; the `functions/` folder is detected automatically).

Your site goes live at `https://<project>.pages.dev` (add a custom domain in the dashboard).

---

## 6. Configure the Razorpay webhook (important)

The webhook is the **authoritative** confirmation that a payment succeeded.

1. Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**.
2. **URL:** `https://<your-domain>/api/webhooks/razorpay`
3. **Secret:** the same value you set for `RAZORPAY_WEBHOOK_SECRET`.
4. **Active events:** `payment.captured` (and optionally `order.paid`).

---

## 7. Day-to-day: adding products (no code)

1. Go to `https://<your-domain>/admin/` and log in.
2. **+ Add product** → choose **Card Pack** or **Momento**.
3. Fill in name, description, the type-specific fields, and upload an image.
4. Add one or more **options** (e.g. a momento's *A4 Framed* / *A3 Framed*, or a pack's
   *Single Pack* / *Box of 10*) — each with its own price and optional stock (blank = unlimited).
5. Toggle **Visible in shop** (and **Feature on homepage** to show it in the landing page's
   "Shop the collection" grid), then save. It appears in the shop instantly.

Paid orders (with customer + shipping details) show up under the **Orders** tab.

---

## 8. Order management, tracking & emails

**Order statuses.** In the admin **Orders** tab, each paid order has a status dropdown
(`Pending → Processing → Shipped → Completed`, plus `Cancelled`) and fields for the
**courier** and **AWB / tracking number**. Set the status and tracking, then click **Save**.

**Customer order tracking.** Customers can visit `/track.html` (linked in the nav/footer as
"Track Order") and enter the **email + phone** they used at checkout to see their order's
status timeline and tracking number — the shipping address is never shown there.

**Automated emails (Resend).** The store sends:
- an **order confirmation** to the customer and a **new-order alert** to you (`ADMIN_EMAIL`) when payment succeeds;
- a **"your order has shipped"** email (with the tracking number) when you set an order to *Shipped*.

To enable emails:
1. Create an account at https://resend.com and **verify your sending domain** (e.g. `arksoft.xyz`).
2. Create an API key and set it: `npx wrangler pages secret put RESEND_API_KEY`.
3. Check `EMAIL_FROM` and `ADMIN_EMAIL` in `wrangler.toml` `[vars]` — `EMAIL_FROM` must use your verified domain (currently `orders@arksoft.xyz`).

Emails are **best-effort**: if `RESEND_API_KEY` is unset or Resend fails, orders still complete normally — you just won't get the email.

## 9. Migrating an existing database

If your live D1 was created **before** these features, run the migrations once (safe to run each once):

```bash
npx wrangler d1 execute momento-db --remote --file=./migrations/0001_order_fulfillment.sql
npx wrangler d1 execute momento-db --remote --file=./migrations/0002_product_featured.sql
```

(New databases created from `schema.sql` already include these columns.)

## Money & currency

- Prices are entered in **rupees** in the admin and stored internally in **paise**.
- Currency is set in `wrangler.toml` (`CURRENCY = "INR"`). Razorpay settles Indian payments in INR.

## Files at a glance

```
wrangler.toml          Cloudflare config (D1 + R2 bindings, output dir = site)
schema.sql             database tables
seed.sql               demo products
functions/             the API (Pages Functions)
  _lib/                shared helpers (auth, razorpay, util, orders)
  api/                 route handlers
site/                  the static frontend + admin panel
```

## Security notes

- Admin is protected by a password + a signed, HTTP-only session cookie (12h).
- Checkout **recomputes every price server-side** — client-sent prices are ignored.
- Payment authenticity is verified by HMAC signature (callback **and** webhook).
- Use a long, random `SESSION_SECRET`, and keep Razorpay keys in secrets (never in `wrangler.toml`).

## Legal reminder

The card designs imitate the EA/FUT layout and may use player likenesses — trademarked/copyrighted
material. This is fine for a small personal run but is a real risk at scale. Consider an original card
template before growing. The site footer already states it's an unaffiliated fan project.
