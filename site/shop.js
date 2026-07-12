(function () {
  var el = Store.el;
  var params = new URLSearchParams(location.search);
  var type = params.get("type") || "";
  document.getElementById("year").textContent = new Date().getFullYear();

  // active tab + title
  document.querySelectorAll("#tabs .tab").forEach(function (t) {
    if (t.getAttribute("data-type") === type) t.classList.add("active");
  });
  var titles = { pack: "Card Packs", momento: "Momentos", "": "Shop" };
  var subs = {
    pack: "Five cards. One rip. Every pack a surprise.",
    momento: "The moments that stopped the world — framed to keep.",
    "": "Collectible card packs and gallery-grade momentos. Every piece, a moment worth keeping.",
  };
  document.getElementById("shopTitle").textContent = titles[type] || "Shop";
  document.getElementById("shopSub").textContent = subs[type] || subs[""];

  function card(p) {
    var soldOut = p.variants.length && p.variants.every(function (v) { return v.stock != null && v.stock <= 0; });
    return el("a", { class: "pcard", href: "product.html?slug=" + encodeURIComponent(p.slug) },
      el("div", { class: "pcard-media " + (p.type === "momento" ? "momento" : "") },
        el("span", { class: "pcard-type" }, p.type === "pack" ? "Card Pack" : "Momento"),
        p.image ? el("img", { src: p.image, alt: p.name, loading: "lazy" }) : null
      ),
      el("div", { class: "pcard-body" },
        el("h3", {}, p.name),
        el("p", { class: "p-desc" }, p.description || ""),
        el("div", { class: "pcard-foot" },
          el("span", { class: "price" },
            el("span", { class: "from" }, "from"), Store.money(p.price_from)),
          soldOut ? el("span", { class: "sold-out" }, "Sold out")
                  : el("span", { class: "cc-link", style: "font-size:.78rem" }, "View →")
        )
      )
    );
  }

  var grid = document.getElementById("grid");
  Store.api("/api/products" + (type ? "?type=" + type : ""))
    .then(function (data) {
      grid.innerHTML = "";
      if (!data.products.length) {
        grid.append(el("div", { class: "empty-state" },
          el("h2", {}, "Coming soon"),
          el("p", {}, "No products here yet — check back shortly.")));
        return;
      }
      data.products.forEach(function (p) { grid.append(card(p)); });
    })
    .catch(function (e) {
      grid.innerHTML = "";
      grid.append(el("div", { class: "empty-state" },
        el("h2", {}, "Couldn't load the shop"),
        el("p", {}, e.message)));
    });
})();
