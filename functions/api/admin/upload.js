import { json, error, uid } from "../../_lib/util.js";

const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
const MAX_BYTES = 6 * 1024 * 1024;

// POST /api/admin/upload (multipart form-data, field "file") -> stores in R2
export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) return error("Expected multipart/form-data", 415);

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return error("No file provided", 400);

  const ext = ALLOWED[file.type];
  if (!ext) return error("Unsupported image type (use JPG, PNG, WebP, AVIF or GIF)", 415);
  if (file.size > MAX_BYTES) return error("Image too large (max 6MB)", 413);

  const key = `products/${uid()}.${ext}`;
  const buf = await file.arrayBuffer();
  await env.BUCKET.put(key, buf, { httpMetadata: { contentType: file.type } });
  return json({ ok: true, key, url: `/api/images/${key}` }, 201);
}
