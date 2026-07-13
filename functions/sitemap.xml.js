// GET /sitemap.xml — static pages + every active product, pulled live from D1.
function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;

  // Clean, .html-less paths — these are the canonical URLs Pages serves.
  const staticPaths = [
    "/", "/shop", "/shop?type=pack", "/shop?type=momento",
    "/contact", "/shipping", "/refunds", "/terms", "/privacy",
  ];
  const urls = staticPaths.map((p) => ({ loc: origin + p }));

  try {
    const { results } = await env.DB
      .prepare("SELECT slug, created_at FROM products WHERE active = 1 ORDER BY sort ASC")
      .all();
    for (const r of results || []) {
      urls.push({
        loc: origin + "/product?slug=" + encodeURIComponent(r.slug),
        lastmod: r.created_at ? new Date(r.created_at * 1000).toISOString().slice(0, 10) : null,
      });
    }
  } catch { /* DB unavailable — still return static pages */ }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
      .join("\n") +
    "\n</urlset>\n";

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
