(function () {
  var el = Store.el;
  var params = new URLSearchParams(location.search);
  var type = params.get("type") || "";
  document.getElementById("year").textContent = new Date().getFullYear();

  // active tab + title
  document.querySelectorAll("#tabs .tab").forEach(function (t) {
    if (t.getAttribute("data-type") === type) t.classList.add("active");
  });
  var titles = { pack: "Card Packs", momento: "Momentos", story: "Stories of the Beautiful Game", "": "Shop" };
  var subs = {
    pack: "Five cards. One rip. Every pack a surprise.",
    momento: "Single frames from the moments that stopped the world — framed to keep.",
    story: "The whole moment, frame by frame. Buy the linked frames as a complete set and save.",
    "": "Collectible card packs and gallery-grade momentos. Every piece, a moment worth keeping.",
  };
  document.getElementById("shopTitle").textContent = titles[type] || "Shop";
  document.getElementById("shopSub").textContent = subs[type] || subs[""];

  // ── story helpers ──────────────────────────────────────────────
  function frameSlugs(p) {
    var f = p.meta && p.meta.frames;
    if (!f) return [];
    if (Array.isArray(f)) return f.filter(Boolean);
    return String(f).split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function isSet(p) { return frameSlugs(p).length > 0; }
  // Savings for a set = Σ its frames' "from" price − the set's "from" price.
  function setSavings(p, bySlug) {
    var sum = frameSlugs(p).reduce(function (acc, slug) {
      var fr = bySlug[slug];
      return acc + (fr ? fr.price_from : 0);
    }, 0);
    var save = sum - p.price_from;
    return save > 0 ? save : 0;
  }

  function soldOut(p) {
    return p.variants.length && p.variants.every(function (v) { return v.stock != null && v.stock <= 0; });
  }

  // Regular card for packs and individual frames.
  function card(p) {
    var badge = null;
    if (p.type === "momento" && p.meta && p.meta.story_title && p.meta.frame) {
      badge = el("span", { class: "frame-badge" }, p.meta.story_title + " · Frame " + p.meta.frame);
    }
    return el("a", { class: "pcard", href: "product.html?slug=" + encodeURIComponent(p.slug) },
      el("div", { class: "pcard-media " + (p.type === "momento" ? "momento" : "") },
        el("span", { class: "pcard-type" }, p.type === "pack" ? "Card Pack" : "Momento"),
        p.image ? el("img", { src: p.image, alt: p.name, loading: "lazy" }) : null
      ),
      el("div", { class: "pcard-body" },
        badge,
        el("h3", {}, p.name),
        el("p", { class: "p-desc" }, p.description || ""),
        el("div", { class: "pcard-foot" },
          el("span", { class: "price" },
            el("span", { class: "from" }, "from"), Store.money(p.price_from)),
          soldOut(p) ? el("span", { class: "sold-out" }, "Sold out")
                     : el("span", { class: "cc-link", style: "font-size:.78rem" }, "View →")
        )
      )
    );
  }

  // Special card for a complete set (the discounted linked-frame bundle).
  function setCard(p, bySlug) {
    var save = setSavings(p, bySlug);
    var n = frameSlugs(p).length;
    return el("a", { class: "pcard pcard-set", href: "product.html?slug=" + encodeURIComponent(p.slug) },
      el("div", { class: "pcard-media momento" },
        el("span", { class: "pcard-type" }, "Complete Set"),
        save ? el("span", { class: "save-ribbon" }, "Save " + Store.money(save)) : null,
        p.image ? el("img", { src: p.image, alt: p.name, loading: "lazy" }) : null
      ),
      el("div", { class: "pcard-body" },
        el("span", { class: "frame-badge set" }, (p.meta && p.meta.story_title ? p.meta.story_title + " · " : "") + "Set of " + n + " frames"),
        el("h3", {}, p.name),
        el("p", { class: "p-desc" }, p.description || ""),
        el("div", { class: "pcard-foot" },
          el("span", { class: "price" },
            el("span", { class: "from" }, "from"), Store.money(p.price_from)),
          soldOut(p) ? el("span", { class: "sold-out" }, "Sold out")
                     : el("span", { class: "cc-link", style: "font-size:.78rem" }, "See the set →")
        )
      )
    );
  }

  var grid = document.getElementById("grid");
  // Story/Momento views both need the full momento list (sets live among momentos in the DB).
  var apiType = (type === "story") ? "momento" : type;
  Store.api("/api/products" + (apiType ? "?type=" + apiType : ""))
    .then(function (data) {
      var all = data.products || [];
      var bySlug = {};
      all.forEach(function (p) { bySlug[p.slug] = p; });

      var list;
      if (type === "story") {
        list = all.filter(isSet);
      } else if (type === "momento") {
        list = all.filter(function (p) { return !isSet(p); });
      } else {
        list = all; // packs + frames + sets
      }

      grid.innerHTML = "";
      if (!list.length) {
        grid.append(el("div", { class: "empty-state" },
          el("h2", {}, type === "story" ? "No sets yet" : "Coming soon"),
          el("p", {}, type === "story"
            ? "Complete sets are on their way — check back shortly."
            : "No products here yet — check back shortly.")));
        return;
      }
      list.forEach(function (p) {
        grid.append(isSet(p) ? setCard(p, bySlug) : card(p));
      });
    })
    .catch(function (e) {
      grid.innerHTML = "";
      grid.append(el("div", { class: "empty-state" },
        el("h2", {}, "Couldn't load the shop"),
        el("p", {}, e.message)));
    });
})();
