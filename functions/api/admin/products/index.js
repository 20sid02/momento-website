import { json, error, readJson, uid, nowSec, slugify, uniqueSlug, shapeProduct, variantsMap } from "../../../_lib/util.js";
import { normalizeProductInput } from "../../../_lib/products.js";

// GET /api/admin/products -> all products (including inactive) for the admin list
export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT * FROM products ORDER BY sort ASC, created_at DESC")
    .all();
  const vmap = await variantsMap(env);
  return json({ products: (results || []).map((p) => shapeProduct(p, vmap[p.id] || [])) });
}

// POST /api/admin/products -> create a product + variants
export async function onRequestPost({ request, env }) {
  const norm = normalizeProductInput(await readJson(request));
  if (norm.error) return error(norm.error, 422);
  const v = norm.value;
  const id = uid();
  const slug = await uniqueSlug(env, slugify(v.name));

  const stmts = [
    env.DB.prepare(
      "INSERT INTO products (id,type,name,slug,description,image_key,meta,active,featured,sort,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(id, v.type, v.name, slug, v.description, v.image_key, JSON.stringify(v.meta), v.active ? 1 : 0, v.featured ? 1 : 0, v.sort, nowSec()),
  ];
  for (const vr of v.variants) {
    stmts.push(
      env.DB.prepare("INSERT INTO variants (id,product_id,label,price_paise,stock,sort) VALUES (?,?,?,?,?,?)")
        .bind(uid(), id, vr.label, vr.price_paise, vr.stock, vr.sort)
    );
  }
  await env.DB.batch(stmts);
  return json({ ok: true, id, slug }, 201);
}
