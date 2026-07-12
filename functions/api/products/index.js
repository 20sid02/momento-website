import { json, shapeProduct, variantsMap } from "../../_lib/util.js";

// GET /api/products?type=pack|momento  -> active products for the storefront
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  let q = "SELECT * FROM products WHERE active = 1";
  const binds = [];
  if (type === "pack" || type === "momento") { q += " AND type = ?"; binds.push(type); }
  if (url.searchParams.get("featured") === "1") q += " AND featured = 1";
  q += " ORDER BY sort ASC, created_at DESC";
  const { results } = await env.DB.prepare(q).bind(...binds).all();
  const vmap = await variantsMap(env);
  return json({ products: (results || []).map((p) => shapeProduct(p, vmap[p.id] || [])) });
}
