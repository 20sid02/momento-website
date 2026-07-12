// Validate + normalize a product payload from the admin panel.
export function normalizeProductInput(body) {
  if (!body || typeof body !== "object") return { error: "Invalid request body" };

  const type = body.type;
  if (type !== "pack" && type !== "momento") return { error: "type must be 'pack' or 'momento'" };

  const name = String(body.name || "").trim();
  if (!name) return { error: "Name is required" };

  const variantsIn = Array.isArray(body.variants) ? body.variants : [];
  if (!variantsIn.length) return { error: "Add at least one option with a price" };

  const variants = [];
  variantsIn.forEach((v, i) => {
    const label = String(v.label || "").trim() || "Standard";
    const paise = v.price_paise != null
      ? Math.round(Number(v.price_paise))
      : Math.round(Number(v.price) * 100);
    if (!Number.isFinite(paise) || paise < 100) {
      variants.push({ __error: `"${label}" needs a price of at least ₹1` });
      return;
    }
    let stock = v.stock;
    if (stock === "" || stock == null) stock = null;
    else {
      stock = Math.round(Number(stock));
      if (!Number.isFinite(stock) || stock < 0) { variants.push({ __error: `Invalid stock for "${label}"` }); return; }
    }
    variants.push({ label, price_paise: paise, stock, sort: Number(v.sort) || i });
  });

  const bad = variants.find((v) => v.__error);
  if (bad) return { error: bad.__error };

  return {
    value: {
      type,
      name,
      description: String(body.description || ""),
      meta: (body.meta && typeof body.meta === "object") ? body.meta : {},
      active: body.active === undefined ? true : !!body.active,
      featured: !!body.featured,
      sort: Number(body.sort) || 0,
      image_key: body.image_key ? String(body.image_key) : null,
      variants,
    },
  };
}
