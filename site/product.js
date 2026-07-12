(function () {
  var el = Store.el;
  document.getElementById("year").textContent = new Date().getFullYear();
  var slug = new URLSearchParams(location.search).get("slug");
  var root = document.getElementById("pdp");

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

  function render(p) {
    document.title = p.name + " — Momento";
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

    function pick(v, node) {
      selected = v;
      variantList.querySelectorAll(".variant").forEach(function (n) { n.classList.remove("selected"); });
      node.classList.add("selected");
      priceEl.textContent = Store.money(v.price_paise);
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
      el("p", { class: "eyebrow" }, p.type === "pack" ? "Card Pack" : "Momento"),
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

    infoChildren.push(priceEl, variantList,
      el("div", { class: "qty-row" }, el("span", { style: "color:var(--muted);font-family:var(--font-cond);text-transform:uppercase;letter-spacing:.1em;font-size:.8rem" }, "Quantity"), qtyBox),
      addBtn, msg);

    root.innerHTML = "";
    root.append(el("div", { class: "pdp" },
      el("div", { class: "pdp-media " + (p.type === "momento" ? "momento" : ""), style: "position:relative" },
        p.image ? el("img", { src: p.image, alt: p.name }) : null),
      el("div", { class: "pdp-info" }, infoChildren)
    ));
  }
})();
