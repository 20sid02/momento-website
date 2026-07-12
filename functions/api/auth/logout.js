import { json } from "../../_lib/util.js";
import { clearSessionCookie } from "../../_lib/auth.js";

export function onRequestPost() {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
