// GET /robots.txt — generated so the Sitemap URL always matches the live domain.
export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const body =
    "User-agent: *\n" +
    "Allow: /\n" +
    "Disallow: /admin/\n" +
    "Disallow: /api/\n" +
    "\n" +
    `Sitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
