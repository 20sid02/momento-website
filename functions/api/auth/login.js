import { readJson, json, error } from "../../_lib/util.js";
import { checkPassword, createSessionCookie } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!env.ADMIN_PASSWORD) return error("Admin password not configured on server", 500);
  if (!body || !checkPassword(env, body.password)) return error("Incorrect password", 401);
  const cookie = await createSessionCookie(env, request);
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}
