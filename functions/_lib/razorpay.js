// Razorpay helpers — Orders API + signature verification (Web Crypto).

const enc = new TextEncoder();

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Create an order via Razorpay Orders API.
// amount is in paise. Returns { ok, order, error }.
export async function createRazorpayOrder(env, { amount, currency, receipt, notes }) {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { ok: false, error: "Razorpay keys not configured" };
  }
  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount,
      currency: currency || "INR",
      receipt,
      notes: notes || {},
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error?.description || "Razorpay order failed", raw: data };
  }
  return { ok: true, order: data };
}

// Verify the checkout callback signature:
// HMAC_SHA256(order_id + "|" + payment_id, key_secret) === signature
export async function verifyPaymentSignature(env, { order_id, payment_id, signature }) {
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  const expected = await hmacHex(keySecret, `${order_id}|${payment_id}`);
  return safeEqual(expected, signature || "");
}

// Verify a webhook: HMAC_SHA256(rawBody, webhook_secret) === X-Razorpay-Signature
export async function verifyWebhookSignature(env, rawBody, signature) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = await hmacHex(secret, rawBody);
  return safeEqual(expected, signature || "");
}
