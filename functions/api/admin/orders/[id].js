import { json, error, readJson } from "../../../_lib/util.js";
import { sendEmail, orderShippedEmail, orderDeliveredEmail } from "../../../_lib/email.js";

const STATUSES = ["pending", "processing", "shipped", "completed", "cancelled"];

// PATCH /api/admin/orders/:id  -> update fulfillment status + courier + tracking
// body: { fulfillment?, courier?, tracking_number? }
export async function onRequestPatch({ request, params, env }) {
  const existing = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(params.id).first();
  if (!existing) return error("Order not found", 404);

  const body = (await readJson(request)) || {};

  const fulfillment = body.fulfillment != null ? String(body.fulfillment) : existing.fulfillment || "pending";
  if (!STATUSES.includes(fulfillment)) return error("Invalid status", 422);

  const courier = body.courier != null ? String(body.courier).trim() || null : existing.courier;
  const tracking = body.tracking_number != null ? String(body.tracking_number).trim() || null : existing.tracking_number;

  await env.DB.prepare("UPDATE orders SET fulfillment=?, courier=?, tracking_number=? WHERE id=?")
    .bind(fulfillment, courier, tracking, params.id).run();

  // Send a status email when the order first transitions into shipped / completed.
  let emailed = false;
  const changed = existing.fulfillment !== fulfillment;
  const builder = fulfillment === "shipped" ? orderShippedEmail
    : fulfillment === "completed" ? orderDeliveredEmail
    : null;
  if (changed && builder) {
    try {
      const c = JSON.parse(existing.customer || "{}");
      if (c.email) {
        const mail = builder({ ...existing, courier, tracking_number: tracking });
        const r = await sendEmail(env, { to: c.email, subject: mail.subject, html: mail.html });
        emailed = !!r.ok;
      }
    } catch { /* ignore */ }
  }

  return json({ ok: true, fulfillment, courier, tracking_number: tracking, emailed });
}
