import { json, error, readJson } from "../../_lib/util.js";
import { verifyPaymentSignature } from "../../_lib/razorpay.js";
import { markOrderPaid } from "../../_lib/orders.js";

// POST /api/checkout/verify -> confirm the Razorpay checkout callback signature
export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!b) return error("Invalid request");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return error("Missing payment fields", 422);
  }
  const ok = await verifyPaymentSignature(env, {
    order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature: razorpay_signature,
  });
  if (!ok) return error("Payment verification failed", 400);

  const order = await env.DB.prepare("SELECT * FROM orders WHERE razorpay_order_id = ?")
    .bind(razorpay_order_id).first();
  if (!order) return error("Order not found", 404);

  await markOrderPaid(env, order, razorpay_payment_id);
  return json({ ok: true, order_id: order.id });
}
