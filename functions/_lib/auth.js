// Admin session auth: password login -> signed, HTTP-only cookie.
// Cookie value = base64url(payload).hexHmacSHA256(payload, SESSION_SECRET)

const COOKIE_NAME = "momento_admin";
const SESSION_TTL = 60 * 60 * 12; // 12 hours

const enc = new TextEncoder();

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time-ish string compare
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

export async function createSessionCookie(env, request) {
  const secret = env.SESSION_SECRET || "dev-insecure-secret";
  const payload = JSON.stringify({ sub: "admin", exp: Math.floor(Date.now() / 1000) + SESSION_TTL });
  const p = b64urlEncode(payload);
  const sig = await hmacHex(secret, p);
  const value = `${p}.${sig}`;
  const isHttps = new URL(request.url).protocol === "https:";
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL}`,
  ];
  if (isHttps) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function isAuthed(env, request) {
  const secret = env.SESSION_SECRET || "dev-insecure-secret";
  const raw = readCookie(request, COOKIE_NAME);
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return false;
  const p = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = await hmacHex(secret, p);
  if (!safeEqual(sig, expected)) return false;
  try {
    const payload = JSON.parse(b64urlDecode(p));
    if (payload.sub !== "admin") return false;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function checkPassword(env, password) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(String(password || ""), String(expected));
}
