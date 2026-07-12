import { isAuthed } from "../../_lib/auth.js";
import { error } from "../../_lib/util.js";

// Guards every /api/admin/* route.
export async function onRequest(context) {
  if (!(await isAuthed(context.env, context.request))) {
    return error("Unauthorized", 401);
  }
  return context.next();
}
