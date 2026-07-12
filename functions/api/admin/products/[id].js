import { json, error, readJson, uid, shapeProduct } from "../../../_lib/util.js";
import { normalizeProductInput } from "../../../_lib/products.js";

async function loadVariants(env, productId) {
  const { results } = await env.DB
    .prepare("SELECT * FROM variants WHERE product_id = ? ORDER BY sort ASC, price_paise ASC")
    .bind(productId).all();
  return results || [];
}

// GET /api/admin/products/:id
export async function onRequestGet({ params, env }) {
  const p = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(params.id).first();
  if (!p) return error("Not found", 404);
  return json({ product: shapeProduct(p, await loadVariants(env, p.id)) });
}

// PUT /api/admin/products/:id -> update fields, replace variants
export async function onRequestPut({ request, params, env }) {
  const existing = await env.DB.prepare("SELECT id FROM products WHERE id = ?").bind(params.id).first();
  if (!existing) return error("Not found", 404);

  const norm = normalizeProductInput(await readJson(request));
  if (norm.error) return error(norm.error, 422);
  const v = norm.value;

  const stmts = [
    env.DB.prepare(
      "UPDATE products SET type=?, name=?, description=?, image_key=?, meta=?, active=?, featured=?, sort=? WHERE id=?"
    ).bind(v.type, v.name, v.description, v.image_key, JSON.stringify(v.meta), v.active ? 1 : 0, v.featured ? 1 : 0, v.sort, params.id),
    env.DB.prepare("DELETE FROM variants WHERE product_id=?").bind(params.id),
  ];
  for (const vr of v.variants) {
    stmts.push(
      env.DB.prepare("INSERT INTO variants (id,product_id,label,price_paise,stock,sort) VALUES (?,?,?,?,?,?)")
        .bind(uid(), params.id, vr.label, vr.price_paise, vr.stock, vr.sort)
    );
  }
  await env.DB.batch(stmts);
  return json({ ok: true });
}

// DELETE /api/admin/products/:id
export async function onRequestDelete({ params, env }) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM variants WHERE product_id=?").bind(params.id),
    env.DB.prepare("DELETE FROM products WHERE id=?").bind(params.id),
  ]);
  return json({ ok: true });
}
