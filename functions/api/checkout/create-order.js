import { json, error, readJson, uid, nowSec } from "../../_lib/util.js";
import { createRazorpayOrder } from "../../_lib/razorpay.js";

// POST /api/checkout/create-order
// body: { items: [{ variant_id, qty }], customer: { name, email, phone, address } }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return error("Invalid request");

  const itemsIn = Array.isArray(body.items) ? body.items : [];
  if (!itemsIn.length) return error("Your cart is empty");

  const c = body.customer || {};
  const name = String(c.name || "").trim();
  const email = String(c.email || "").trim();
  const phone = String(c.phone || "").trim();
  const address = String(c.address || "").trim();
  if (!name || !email || !phone || !address) {
    return error("Please provide name, email, phone and shipping address", 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Please enter a valid email", 422);

  // Never trust client prices — recompute from the database.
  let amount = 0;
  const snapshot = [];
  for (const it of itemsIn) {
    const qty = Math.max(1, Math.min(20, Math.round(Number(it.qty) || 1)));
    const variant = await env.DB.prepare(
      `SELECT v.*, p.name AS pname, p.type AS ptype
         FROM variants v JOIN products p ON p.id = v.product_id
        WHERE v.id = ? AND p.active = 1`
    ).bind(it.variant_id).first();
    if (!variant) return error("An item in your cart is no longer available", 409);
    if (variant.stock != null && variant.stock < qty) {
      return error(`Only ${variant.stock} left of "${variant.pname}"`, 409);
    }
    amount += variant.price_paise * qty;
    snapshot.push({
      variant_id: variant.id, product_id: variant.product_id,
      name: variant.pname, label: variant.label, type: variant.ptype,
      price_paise: variant.price_paise, qty,
    });
  }
  if (amount < 100) return error("Order total too low", 422);

  const currency = env.CURRENCY || "INR";
  const orderId = uid();
  const receipt = `rcpt_${orderId.slice(0, 30)}`;

  await env.DB.prepare(
    "INSERT INTO orders (id,receipt,status,amount_paise,currency,customer,items,created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(orderId, receipt, "created", amount, currency, JSON.stringify({ name, email, phone, address }), JSON.stringify(snapshot), nowSec()).run();

  const rp = await createRazorpayOrder(env, { amount, currency, receipt, notes: { order_id: orderId } });
  if (!rp.ok) return error(rp.error || "Could not start payment", 502);

  await env.DB.prepare("UPDATE orders SET razorpay_order_id=? WHERE id=?").bind(rp.order.id, orderId).run();

  return json({
    ok: true,
    order_id: orderId,
    rp_order_id: rp.order.id,
    amount,
    currency,
    key_id: env.RAZORPAY_KEY_ID,
    store_name: env.STORE_NAME || "Momento",
    customer: { name, email, phone },
  });
}
