import { verifyWebhookSignature } from "../../_lib/razorpay.js";
import { markOrderPaid } from "../../_lib/orders.js";

// POST /api/webhooks/razorpay -> authoritative payment confirmation
export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const sig = request.headers.get("x-razorpay-signature");
  if (!(await verifyWebhookSignature(env, raw, sig))) {
    return new Response("invalid signature", { status: 400 });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  const rpOrderId =
    event?.payload?.payment?.entity?.order_id ||
    event?.payload?.order?.entity?.id;
  const paymentId = event?.payload?.payment?.entity?.id || null;

  if ((event.event === "payment.captured" || event.event === "order.paid") && rpOrderId) {
    const order = await env.DB.prepare("SELECT * FROM orders WHERE razorpay_order_id = ?")
      .bind(rpOrderId).first();
    if (order) await markOrderPaid(env, order, paymentId);
  }
  return new Response("ok", { status: 200 });
}
