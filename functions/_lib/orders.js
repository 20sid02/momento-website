import { nowSec } from "./util.js";
import { sendEmail, orderConfirmationEmail, adminOrderAlertEmail } from "./email.js";

// Idempotently mark an order paid, decrement stock, and send confirmation emails.
export async function markOrderPaid(env, order, paymentId) {
  if (!order || order.status === "paid") return;
  const stmts = [
    env.DB.prepare(
      "UPDATE orders SET status='paid', razorpay_payment_id=?, paid_at=? WHERE id=? AND status!='paid'"
    ).bind(paymentId || order.razorpay_payment_id || null, nowSec(), order.id),
  ];
  let items = [];
  try { items = JSON.parse(order.items || "[]"); } catch { /* ignore */ }
  for (const it of items) {
    if (it.variant_id && it.qty) {
      stmts.push(
        env.DB.prepare("UPDATE variants SET stock = stock - ? WHERE id=? AND stock IS NOT NULL")
          .bind(it.qty, it.variant_id)
      );
    }
  }
  await env.DB.batch(stmts);

  // Best-effort emails — must never block or fail the payment flow.
  try {
    const c = JSON.parse(order.customer || "{}");
    const conf = orderConfirmationEmail(order);
    if (c.email) await sendEmail(env, { to: c.email, subject: conf.subject, html: conf.html });
    if (env.ADMIN_EMAIL) {
      const alert = adminOrderAlertEmail(order);
      await sendEmail(env, { to: env.ADMIN_EMAIL, subject: alert.subject, html: alert.html });
    }
  } catch { /* ignore email errors */ }
}
