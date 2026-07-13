/* Landing page: load a few live products into the "Shop the collection" grid.
   Self-contained (no dependency on store-common.js, to avoid nav-handler clashes). */
(function () {
  var grid = document.getElementById("featuredGrid");
  if (!grid) return;

  function money(paise) {
    var r = (Number(paise) || 0) / 100;
    var frac = paise % 100 ? 2 : 0;
    return "₹" + r.toLocaleString("en-IN", { minimumFractionDigits: frac, maximumFractionDigits: 2 });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

  function card(p) {
    var soldOut = p.variants.length && p.variants.every(function (v) { return v.stock != null && v.stock <= 0; });
    var a = document.createElement("a");
    a.className = "pcard";
    a.href = "product.html?slug=" + encodeURIComponent(p.slug);
    a.innerHTML =
      '<div class="pcard-media ' + (p.type === "momento" ? "momento" : "") + '">' +
        '<span class="pcard-type">' + (p.type === "pack" ? "Card Pack" : "Momento") + "</span>" +
        (p.image ? '<img src="' + escAttr(p.image) + '" alt="' + escAttr(p.name) + '" loading="lazy">' : "") +
      "</div>" +
      '<div class="pcard-body">' +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="p-desc">' + esc(p.description || "") + "</p>" +
        '<div class="pcard-foot">' +
          '<span class="price"><span class="from">from</span>' + money(p.price_from) + "</span>" +
          (soldOut ? '<span class="sold-out">Sold out</span>' : '<span class="cc-link" style="font-size:.78rem">View →</span>') +
        "</div>" +
      "</div>";
    return a;
  }

  // Static fallback (e.g. opened without a backend) — links to the two categories.
  function fallback() {
    grid.innerHTML =
      '<a class="pcard" href="shop.html?type=pack"><div class="pcard-media"><span class="pcard-type">Card Packs</span><img src="assets/cards-grid.jpg" alt="Card packs"></div><div class="pcard-body"><h3>Card Packs</h3><p class="p-desc">Five collectible cards, sealed and shuffled — every rip a surprise.</p><div class="pcard-foot"><span class="cc-link" style="font-size:.78rem">Shop packs →</span></div></div></a>' +
      '<a class="pcard" href="shop.html?type=momento"><div class="pcard-media momento"><span class="pcard-type">Momentos</span><img src="assets/momento-istanbul.jpg" alt="Momentos"></div><div class="pcard-body"><h3>Momentos</h3><p class="p-desc">Framed A4 &amp; A3 story posters of legendary moments.</p><div class="pcard-foot"><span class="cc-link" style="font-size:.78rem">Shop momentos →</span></div></div></a>';
  }

  function get(url) { return fetch(url).then(function (r) { return r.ok ? r.json() : Promise.reject(); }); }

  function paint(items) {
    grid.innerHTML = "";
    items.slice(0, 4).forEach(function (p) { grid.appendChild(card(p)); });
  }

  // Prefer admin-chosen featured products; fall back to the first few, then to static cards.
  get("/api/products?featured=1")
    .then(function (d) {
      var items = d.products || [];
      if (items.length) return paint(items);
      return get("/api/products").then(function (all) {
        var a = all.products || [];
        if (a.length) paint(a); else fallback();
      });
    })
    .catch(fallback);
})();
