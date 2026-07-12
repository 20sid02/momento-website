import { json } from "../../../_lib/util.js";

function safeParse(str, fallback) { try { return JSON.parse(str); } catch { return fallback; } }

// GET /api/admin/orders?status=paid -> recent orders (with fulfillment + tracking)
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  let q = "SELECT * FROM orders";
  const binds = [];
  if (status) { q += " WHERE status = ?"; binds.push(status); }
  q += " ORDER BY created_at DESC LIMIT 200";
  const { results } = await env.DB.prepare(q).bind(...binds).all();
  const orders = (results || []).map((o) => ({
    ...o,
    customer: safeParse(o.customer, {}),
    items: safeParse(o.items, []),
    fulfillment: o.fulfillment || "pending",
  }));
  return json({ orders });
}
