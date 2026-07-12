import { json, error, shapeProduct } from "../../_lib/util.js";

// GET /api/products/:slug  -> single active product with variants
export async function onRequestGet({ params, env }) {
  const p = await env.DB
    .prepare("SELECT * FROM products WHERE slug = ? AND active = 1")
    .bind(params.slug)
    .first();
  if (!p) return error("Product not found", 404);
  const { results: variants } = await env.DB
    .prepare("SELECT * FROM variants WHERE product_id = ? ORDER BY sort ASC, price_paise ASC")
    .bind(p.id)
    .all();
  return json({ product: shapeProduct(p, variants) });
}
