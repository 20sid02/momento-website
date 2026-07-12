import { json, error, readJson } from "../_lib/util.js";

function safeParse(str, fallback) { try { return JSON.parse(str); } catch { return fallback; } }

// POST /api/track  body: { email, phone }
// Returns the customer's PAID orders with status + tracking (no shipping address).
export async function onRequestPost({ request, env }) {
  const b = (await readJson(request)) || {};
  const email = String(b.email || "").trim().toLowerCase();
  const phone = String(b.phone || "").trim();
  if (!email || !phone) return error("Enter the email and phone you used at checkout", 422);

  const { results } = await env.DB.prepare(
    `SELECT * FROM orders
      WHERE lower(json_extract(customer,'$.email')) = ?
        AND replace(json_extract(customer,'$.phone'),' ','') = ?
        AND status = 'paid'
      ORDER BY created_at DESC LIMIT 50`
  ).bind(email, phone.replace(/\s/g, "")).all();

  const orders = (results || []).map((o) => {
    const items = safeParse(o.items, []);
    return {
      ref: String(o.id).slice(0, 8).toUpperCase(),
      created_at: o.created_at,
      amount_paise: o.amount_paise,
      fulfillment: o.fulfillment || "pending",
      courier: o.courier || null,
      tracking_number: o.tracking_number || null,
      items: items.map((i) => ({ name: i.name, label: i.label, qty: i.qty })),
    };
  });

  return json({ orders });
}
