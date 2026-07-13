(function () {
  var el = Store.el;
  document.getElementById("year").textContent = new Date().getFullYear();
  var slug = new URLSearchParams(location.search).get("slug");
  var root = document.getElementById("pdp");

  // ── story helpers ──────────────────────────────────────────────
  function frameSlugs(p) {
    var f = p.meta && p.meta.frames;
    if (!f) return [];
    if (Array.isArray(f)) return f.filter(Boolean);
    return String(f).split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function isSet(p) { return frameSlugs(p).length > 0; }
  function frameLink(fr, current) {
    return el("a", {
      class: "frame-thumb" + (fr.slug === current ? " is-current" : ""),
      href: "product.html?slug=" + encodeURIComponent(fr.slug),
    },
      el("div", { class: "frame-thumb-media" },
        fr.image ? el("img", { src: fr.image, alt: fr.name, loading: "lazy" }) : null,
        (fr.meta && fr.meta.frame) ? el("span", { class: "frame-no" }, "Frame " + fr.meta.frame) : null),
      el("div", { class: "frame-thumb-body" },
        el("span", { class: "frame-thumb-name" }, fr.name),
        el("span", { class: "frame-thumb-price" }, (fr.slug === current ? "You're viewing" : "from " + Store.money(fr.price_from)))));
  }

  if (!slug) { showError("No product specified."); return; }

  var selected = null;
  var qty = 1;

  Store.api("/api/products/" + encodeURIComponent(slug))
    .then(function (data) { render(data.product); })
    .catch(function (e) { showError(e.message); });

  function showError(msg) {
    root.innerHTML = "";
    root.append(el("div", { class: "empty-state" },
      el("h2", {}, "Not found"),
      el("p", {}, msg),
      el("a", { class: "btn btn-ghost", href: "shop.html", style: "margin-top:1rem" }, "Back to shop")));
  }

  // Upsert a <meta> tag (by name or property) in <head>.
  function setMeta(attr, key, content) {
    if (!content) return;
    var sel = "meta[" + attr + '="' + key + '"]';
    var tag = document.head.querySelector(sel);
    if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, key); document.head.appendChild(tag); }
    tag.setAttribute("content", content);
  }

  // Fill per-product SEO: title, description, Open Graph/Twitter, Product JSON-LD.
  function setSeo(p) {
    var m = p.meta || {};
    document.title = p.name + " — Momentos Footy";
    var abs = function (u) { return u ? new URL(u, location.origin).href : ""; };
    // Match the self-referencing canonical (Pages serves the clean, .html-less path).
    var url = location.origin + location.pathname + "?slug=" + encodeURIComponent(p.slug);
    var img = abs(p.image);
    var desc = (p.description || m.tagline || "").trim() ||
      ("A collectible " + (p.type === "pack" ? "football card pack" : "framed momento poster") + " from Momentos Footy.");
    desc = desc.replace(/\s+/g, " ").slice(0, 300);

    setMeta("name", "description", desc);
    setMeta("property", "og:title", p.name + " — Momentos Footy");
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    if (img) setMeta("property", "og:image", img);
    setMeta("name", "twitter:title", p.name + " — Momentos Footy");
    setMeta("name", "twitter:description", desc);
    if (img) setMeta("name", "twitter:image", img);

    var prices = (p.variants || []).map(function (v) { return v.price_paise; });
    var from = prices.length ? Math.min.apply(null, prices) : (p.price_from || 0);
    var inStock = (p.variants || []).some(function (v) { return v.stock == null || v.stock > 0; });
    if (from) {
      setMeta("property", "product:price:amount", (from / 100).toFixed(2));
      setMeta("property", "product:price:currency", "INR");
    }

    var ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: desc,
      url: url,
      brand: { "@type": "Brand", name: "Momentos Footy" },
      category: p.type === "pack" ? "Trading Card Packs" : "Framed Posters",
    };
    if (img) ld.image = img;
    if (from) {
      ld.offers = {
        "@type": "Offer",
        price: (from / 100).toFixed(2),
        priceCurrency: "INR",
        availability: "https://schema.org/" + (inStock ? "InStock" : "OutOfStock"),
        url: url,
      };
    }
    var old = document.getElementById("product-jsonld");
    if (old) old.remove();
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "product-jsonld";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  function render(p) {
    setSeo(p);
    var m = p.meta || {};
    var inStock = p.variants.filter(function (v) { return v.stock == null || v.stock > 0; });
    selected = inStock[0] || p.variants[0] || null;

    var priceEl = el("div", { class: "price", id: "pdpPrice", style: "font-size:1.6rem" }, selected ? Store.money(selected.price_paise) : "—");

    var variantList = el("div", { class: "variant-list" },
      p.variants.map(function (v) {
        var out = v.stock != null && v.stock <= 0;
        var node = el("div", { class: "variant" + (v === selected ? " selected" : "") + (out ? " out" : ""), "data-vid": v.id },
          el("span", { class: "v-label" }, v.label),
          el("span", { class: "v-right" },
            (v.stock != null && v.stock > 0 && v.stock <= 5) ? el("span", { class: "v-stock" }, "Only " + v.stock + " left") : null,
            out ? el("span", { class: "v-stock" }, "Sold out") : null,
            el("span", { class: "v-price" }, Store.money(v.price_paise))
          )
        );
        if (!out) node.addEventListener("click", function () { pick(v, node); });
        return node;
      })
    );

    // Free holographic card with every A3 framed (single frame or set).
    var hasA3 = p.variants.some(function (v) { return /a3/i.test(v.label); });
    var holoNote = el("div", { class: "holo-note", style: hasA3 ? "" : "display:none" });
    function updateHolo() {
      if (!hasA3) return;
      var on = selected && /a3/i.test(selected.label);
      holoNote.className = "holo-note" + (on ? " on" : "");
      holoNote.innerHTML = "";
      holoNote.append(
        el("span", { class: "holo-star" }, "★"),
        el("span", {}, on
          ? "Your A3 framed includes a FREE holographic card."
          : "Free holographic card with every A3 framed."));
    }

    function pick(v, node) {
      selected = v;
      variantList.querySelectorAll(".variant").forEach(function (n) { n.classList.remove("selected"); });
      node.classList.add("selected");
      priceEl.textContent = Store.money(v.price_paise);
      updateHolo();
    }

    var qtyInput = el("input", { type: "text", value: "1", inputmode: "numeric", "aria-label": "Quantity" });
    function setQ(n) { qty = Math.max(1, Math.min(20, n || 1)); qtyInput.value = qty; }
    var qtyBox = el("div", { class: "qty" },
      el("button", { type: "button", onclick: function () { setQ(qty - 1); } }, "−"),
      qtyInput,
      el("button", { type: "button", onclick: function () { setQ(qty + 1); } }, "+"));
    qtyInput.addEventListener("input", function () { setQ(parseInt(qtyInput.value.replace(/\D/g, ""), 10)); });

    var msg = el("div", {});
    var addBtn = el("button", { class: "btn btn-gold btn-full", type: "button" }, "Add to cart");
    addBtn.addEventListener("click", function () {
      if (!selected) return;
      Store.addItem({
        product_id: p.id, variant_id: selected.id, name: p.name, label: selected.label,
        price_paise: selected.price_paise, image: p.image, type: p.type, qty: qty,
      });
      msg.innerHTML = "";
      msg.append(el("div", { class: "notice ok" },
        "Added to cart. ",
        el("a", { href: "cart.html", style: "text-decoration:underline;color:inherit" }, "Go to cart →")));
    });

    var infoChildren = [
      el("p", { class: "eyebrow" }, p.type === "pack" ? "Card Pack" : (isSet(p) ? "Complete Set" : "Momento")),
      el("h1", {}, p.name),
    ];
    if (m.tagline) infoChildren.push(el("p", { class: "pdp-tagline" }, m.tagline));
    if (p.description) infoChildren.push(el("p", { class: "pdp-desc" }, p.description));

    if (p.type === "momento") {
      var rows = [];
      if (m.fixture) rows.push(["Fixture", m.fixture]);
      if (m.venue) rows.push(["Venue", m.venue]);
      if (m.date_text) rows.push(["Date", m.date_text]);
      if (rows.length) {
        infoChildren.push(el("div", { class: "momento-meta" },
          rows.map(function (r) {
            return el("div", { class: "row" }, el("span", { class: "k" }, r[0]), el("span", { class: "v" }, r[1]));
          })));
      }
    }
    if (m.pack_size) {
      infoChildren.push(el("p", { class: "pdp-desc", style: "margin-top:0" }, "Each pack contains " + m.pack_size + " collectible cards."));
    }

    infoChildren.push(priceEl, variantList, holoNote,
      el("div", { class: "qty-row" }, el("span", { style: "color:var(--muted);font-family:var(--font-cond);text-transform:uppercase;letter-spacing:.1em;font-size:.8rem" }, "Quantity"), qtyBox),
      addBtn, msg);

    updateHolo();

    root.innerHTML = "";
    root.append(el("div", { class: "pdp" },
      el("div", { class: "pdp-media " + (p.type === "momento" ? "momento" : ""), style: "position:relative" },
        p.image ? el("img", { src: p.image, alt: p.name }) : null),
      el("div", { class: "pdp-info" }, infoChildren)
    ));

    renderStoryBlock(p);
  }

  // Below the buy box: for a Set, what's inside + savings; for a frame, its story siblings + a set CTA.
  function renderStoryBlock(p) {
    var setFrames = frameSlugs(p);
    var storyId = p.meta && p.meta.story;
    if (!setFrames.length && !storyId) return;
    Store.api("/api/products?type=momento").then(function (data) {
      var all = data.products || [];
      var bySlug = {};
      all.forEach(function (x) { bySlug[x.slug] = x; });
      var section = setFrames.length ? setContents(p, setFrames, bySlug) : frameStory(p, storyId, all);
      if (section) root.append(section);
    }).catch(function () { /* story block is enhancement-only */ });
  }

  function setContents(p, slugs, bySlug) {
    var frames = slugs.map(function (s) { return bySlug[s]; }).filter(Boolean);
    if (!frames.length) return null;
    var sum = frames.reduce(function (a, f) { return a + f.price_from; }, 0);
    var save = sum - p.price_from;
    return el("section", { class: "story-section" },
      el("div", { class: "story-head" },
        el("p", { class: "eyebrow" }, "The complete set"),
        el("h2", {}, "Both frames of the story")),
      el("div", { class: "frame-strip" }, frames.map(function (f) { return frameLink(f, null); })),
      save > 0 ? el("p", { class: "story-save" },
        "Buy the set and save " + Store.money(save) + " versus the frames on their own.") : null);
  }

  function frameStory(p, storyId, all) {
    var siblings = all.filter(function (x) {
      return x.meta && x.meta.story === storyId && !isSet(x);
    }).sort(function (a, b) { return (a.meta.frame || 0) - (b.meta.frame || 0); });
    var set = all.filter(isSet).find(function (x) { return x.meta && x.meta.story === storyId; });
    if (siblings.length <= 1 && !set) return null;

    var children = [
      el("div", { class: "story-head" },
        el("p", { class: "eyebrow" }, "Part of a story"),
        el("h2", {}, (p.meta && p.meta.story_title) || "The full story")),
      el("p", { class: "story-lede" }, "A moment worth more than one frame — collect the whole sequence."),
      el("div", { class: "frame-strip" }, siblings.map(function (f) { return frameLink(f, p.slug); })),
    ];
    if (set) {
      var sum = siblings.reduce(function (a, f) { return a + f.price_from; }, 0);
      var save = sum - set.price_from;
      children.push(el("a", { class: "btn btn-gold set-cta", href: "product.html?slug=" + encodeURIComponent(set.slug) },
        save > 0 ? "Get the complete set — save " + Store.money(save) + " →" : "Get the complete set →"));
    }
    return el("section", { class: "story-section" }, children);
  }
})();
