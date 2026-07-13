// Shared helpers for Momentos Footy API (Cloudflare Pages Functions)

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function error(message, status = 400, extra = {}) {
  return json({ error: message, ...extra }, status);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export function uid() {
  return crypto.randomUUID();
}

export function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Money helpers — everything internal is in paise (integer).
export function toPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

// Load all variants grouped by product_id (small catalog -> one query is fine).
export async function variantsMap(env) {
  const { results } = await env.DB
    .prepare("SELECT * FROM variants ORDER BY sort ASC, price_paise ASC")
    .all();
  const map = {};
  for (const v of results || []) (map[v.product_id] ||= []).push(v);
  return map;
}

// Ensure a slug is unique in the products table (append a short suffix on clash).
export async function uniqueSlug(env, base) {
  let slug = base || "item";
  for (let i = 0; i < 6; i++) {
    const hit = await env.DB.prepare("SELECT id FROM products WHERE slug = ?").bind(slug).first();
    if (!hit) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// Resolve an image_key to a URL. R2 keys -> /api/images/<key>;
// values already starting with "/" or "http" are used as-is (demo/static assets).
export function imageUrl(key) {
  if (!key) return null;
  if (key.startsWith("/") || key.startsWith("http")) return key;
  return `/api/images/${key}`;
}

// Assemble a product row + its variants into an API object.
export function shapeProduct(row, variants) {
  let meta = {};
  try { meta = JSON.parse(row.meta || "{}"); } catch { /* ignore */ }
  const vs = (variants || []).map((v) => ({
    id: v.id,
    label: v.label,
    price_paise: v.price_paise,
    stock: v.stock,
    sort: v.sort,
  }));
  const prices = vs.map((v) => v.price_paise);
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: imageUrl(row.image_key),
    image_key: row.image_key || null,
    meta,
    active: !!row.active,
    featured: !!row.featured,
    sort: row.sort,
    created_at: row.created_at,
    variants: vs,
    price_from: prices.length ? Math.min(...prices) : 0,
  };
}
