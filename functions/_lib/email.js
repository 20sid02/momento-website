// Transactional email via Resend (https://resend.com). Best-effort: never throws.

function inr(paise) {
  const n = (Number(paise) || 0) / 100;
  const frac = paise % 100 ? 2 : 0;
  try { return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: frac, maximumFractionDigits: 2 }); }
  catch { return "₹" + n.toFixed(frac); }
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function parse(str, fallback) { try { return JSON.parse(str); } catch { return fallback; } }

// Send an email. Returns { ok } / { ok:false, skipped|error }.
export async function sendEmail(env, { to, subject, html }) {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!key || !from || !to) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    if (!res.ok) return { ok: false, error: await res.text().catch(() => "send failed") };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* ---------- shared shell ---------- */
function shell(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2ec;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#0b0b0d;border-radius:10px 10px 0 0;padding:22px 28px">
      <div style="font-family:Georgia,serif;font-weight:bold;font-size:22px;letter-spacing:1px;color:#f6dd94">MOMENTOS FOOTY</div>
      <div style="font-size:10px;letter-spacing:3px;color:#a49f95;text-transform:uppercase;margin-top:2px">Immortal Football Moments</div>
    </div>
    <div style="background:#ffffff;border:1px solid #e6e1d6;border-top:0;border-radius:0 0 10px 10px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>
      ${inner}
    </div>
    <p style="color:#8a857c;font-size:12px;text-align:center;margin:18px 0 0">
      Momentos Footy · Solan, Himachal Pradesh, India · <a href="mailto:siddharthmahajan@arksoft.xyz" style="color:#8a857c">siddharthmahajan@arksoft.xyz</a><br>
      Independent fan project, not affiliated with EA Sports or FIFA.
    </p>
  </div></body></html>`;
}

function itemsTable(items) {
  const rows = (items || []).map((i) =>
    `<tr>
       <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)} <span style="color:#888">— ${esc(i.label)}</span></td>
       <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;color:#555">×${esc(i.qty)}</td>
       <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${inr(i.price_paise * i.qty)}</td>
     </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`;
}

/* ---------- templates ---------- */
export function orderConfirmationEmail(order) {
  const c = parse(order.customer, {});
  const items = parse(order.items, []);
  const ref = String(order.id).slice(0, 8).toUpperCase();
  const inner = `
    <p style="font-size:14px;line-height:1.6;color:#333">Hi ${esc(c.name || "there")}, thanks for your order — we've received it and will start getting it ready.</p>
    <p style="font-size:13px;color:#666;margin:0 0 16px">Order reference <strong>#${ref}</strong></p>
    ${itemsTable(items)}
    <p style="text-align:right;font-size:16px;margin:14px 0 20px"><strong>Total paid: ${inr(order.amount_paise)}</strong></p>
    <p style="font-size:14px;line-height:1.6;color:#333">We'll email you again with tracking as soon as it ships. You can also track your order any time using the email and phone you checked out with.</p>`;
  return { subject: `Order confirmed — Momentos Footy #${ref}`, html: shell("Your order is confirmed 🎉", inner) };
}

export function adminOrderAlertEmail(order) {
  const c = parse(order.customer, {});
  const items = parse(order.items, []);
  const ref = String(order.id).slice(0, 8).toUpperCase();
  const inner = `
    <p style="font-size:14px;color:#333">New paid order <strong>#${ref}</strong> — ${inr(order.amount_paise)}.</p>
    <table style="font-size:14px;color:#333;margin:0 0 14px">
      <tr><td style="padding:2px 10px 2px 0;color:#888">Name</td><td>${esc(c.name)}</td></tr>
      <tr><td style="padding:2px 10px 2px 0;color:#888">Email</td><td>${esc(c.email)}</td></tr>
      <tr><td style="padding:2px 10px 2px 0;color:#888">Phone</td><td>${esc(c.phone)}</td></tr>
      <tr><td style="padding:2px 10px 2px 0;color:#888;vertical-align:top">Address</td><td>${esc(c.address)}</td></tr>
    </table>
    ${itemsTable(items)}
    <p style="text-align:right;font-size:15px;margin:12px 0"><strong>${inr(order.amount_paise)}</strong></p>
    <p style="font-size:13px;color:#666">Manage it in your admin panel → Orders.</p>`;
  return { subject: `New order #${ref} · ${inr(order.amount_paise)} · ${c.name || ""}`.trim(), html: shell("New order received", inner) };
}

export function orderShippedEmail(order) {
  const c = parse(order.customer, {});
  const items = parse(order.items, []);
  const ref = String(order.id).slice(0, 8).toUpperCase();
  const track = order.tracking_number
    ? `<div style="background:#f4f2ec;border:1px solid #e6e1d6;border-radius:8px;padding:14px 16px;margin:16px 0">
         <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a6d1f">Tracking</div>
         <div style="font-size:16px;font-weight:bold;margin-top:4px">${esc(order.tracking_number)}</div>
         ${order.courier ? `<div style="font-size:13px;color:#666;margin-top:2px">via ${esc(order.courier)}</div>` : ""}
       </div>`
    : "";
  const inner = `
    <p style="font-size:14px;line-height:1.6;color:#333">Good news, ${esc(c.name || "there")} — your Momentos Footy order <strong>#${ref}</strong> is on its way.</p>
    ${track}
    ${itemsTable(items)}
    <p style="font-size:13px;color:#666;margin-top:16px">Questions? Just reply to this email or reach us at siddharthmahajan@arksoft.xyz.</p>`;
  return { subject: `Your Momentos Footy order has shipped 📦 #${ref}`, html: shell("Your order has shipped", inner) };
}

export function orderDeliveredEmail(order) {
  const c = parse(order.customer, {});
  const items = parse(order.items, []);
  const ref = String(order.id).slice(0, 8).toUpperCase();
  const inner = `
    <p style="font-size:14px;line-height:1.6;color:#333">Hi ${esc(c.name || "there")}, your Momentos Footy order <strong>#${ref}</strong> has been marked as <strong>delivered</strong>. We hope you love it. 🏆</p>
    ${itemsTable(items)}
    <p style="font-size:14px;line-height:1.6;color:#333;margin-top:16px">Rip your packs, frame your momentos, and relive the moment. If anything isn't right with your order, reply within 48 hours and we'll help — see our refund policy for details.</p>
    <p style="font-size:13px;color:#666">Thank you for collecting an immortal moment with us.</p>`;
  return { subject: `Delivered ✓ Your Momentos Footy order #${ref}`, html: shell("Your order has been delivered", inner) };
}
