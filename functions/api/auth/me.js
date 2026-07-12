import { json } from "../../_lib/util.js";
import { isAuthed } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  return json({ authed: await isAuthed(env, request) });
}
