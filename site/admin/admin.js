(function () {
  var el = Store.el, money = Store.money, api = Store.api;
  var app = document.getElementById("app");
  var modal = document.getElementById("modal");
  var modalCard = document.getElementById("modalCard");

  var META_FIELDS = {
    momento: [
      ["fixture", "Fixture", "e.g. AC Milan vs Liverpool FC"],
      ["venue", "Venue", "e.g. Atatürk Olympic Stadium"],
      ["date_text", "Date", "e.g. May 25, 2005"],
      ["tagline", "Tagline", "e.g. Against all odds."],
      ["story", "Story ID", "slug shared by all frames of a story, e.g. istanbul-2005"],
      ["story_title", "Story title", "e.g. Istanbul 2005"],
      ["frame", "Frame number", "e.g. 1 — leave blank on the Complete-Set product"],
      ["frames", "Complete Set: frame IDs", "comma-separated slugs; fill ONLY on the set product"],
    ],
    pack: [
      ["pack_size", "Cards per pack", "e.g. 5"],
      ["tier", "Tier", "e.g. base / gold / special"],
    ],
  };

  boot();

  async function boot() {
    try {
      var me = await api("/api/auth/me");
      if (me.authed) showDashboard(); else showLogin();
    } catch (e) { showLogin(); }
  }

  /* ---------------- LOGIN ---------------- */
  function showLogin(errMsg) {
    var pass = el("input", { type: "password", class: "", placeholder: "Password", "aria-label": "Password",
      style: "width:100%;background:var(--bg);border:1px solid var(--line-soft);border-radius:4px;color:var(--ink);padding:0.9rem 1rem;font-size:1rem;margin-bottom:1rem" });
    var msg = el("div", {});
    if (errMsg) msg.append(el("div", { class: "notice err" }, errMsg));
    var btn = el("button", { class: "btn btn-gold btn-full", type: "submit" }, "Enter");
    var form = el("form", { onsubmit: async function (e) {
        e.preventDefault();
        btn.disabled = true; btn.textContent = "Checking…";
        try {
          await api("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pass.value }) });
          showDashboard();
        } catch (err) { btn.disabled = false; btn.textContent = "Enter"; showLogin(err.message); }
      } }, pass, msg, btn);

    app.innerHTML = "";
    app.append(el("div", { class: "login-wrap" },
      el("div", { class: "login-card" },
        el("div", { class: "mark" }, "Momentos Footy"),
        el("p", {}, "Admin access"),
        form)));
    setTimeout(function () { pass.focus(); }, 50);
  }

  /* ---------------- DASHBOARD SHELL ---------------- */
  function shell(activeTab) {
    app.innerHTML = "";
    var tabProducts = el("button", { class: activeTab === "products" ? "active" : "", onclick: function () { showDashboard("products"); } }, "Products");
    var tabOrders = el("button", { class: activeTab === "orders" ? "active" : "", onclick: function () { showDashboard("orders"); } }, "Orders");
    var logout = el("button", { class: "mini", onclick: async function () { try { await api("/api/auth/logout", { method: "POST" }); } catch (e) {} showLogin(); } }, "Log out");
    var viewShop = el("a", { class: "mini", href: "/shop.html", target: "_blank" }, "View shop ↗");

    app.append(
      el("div", { class: "admin-bar" },
        el("span", { class: "brand" }, el("span", { class: "mark" }, "Momentos Footy"), el("span", { class: "sub" }, " Admin")),
        el("div", { class: "admin-actions" }, viewShop, logout)),
      el("div", { class: "admin-wrap" },
        el("div", { class: "admin-tabs" }, tabProducts, tabOrders),
        el("div", { id: "view" }, el("div", { class: "loading" }, "Loading…")))
    );
  }

  function showDashboard(tab) {
    tab = tab || "products";
    shell(tab);
    if (tab === "products") loadProducts();
    else loadOrders();
  }

  /* ---------------- PRODUCTS ---------------- */
  async function loadProducts() {
    var view = document.getElementById("view");
    view.innerHTML = "";
    view.append(el("div", { class: "admin-head" },
      el("h2", {}, "Products"),
      el("button", { class: "btn btn-gold", onclick: function () { openEditor(null); } }, "+ Add product")));

    var list = el("div", {});
    view.append(list);
    try {
      var data = await api("/api/admin/products");
      if (!data.products.length) {
        list.append(el("div", { class: "empty-state" }, el("h2", {}, "No products yet"), el("p", {}, "Click “Add product” to create your first pack or momento.")));
        return;
      }
      data.products.forEach(function (p) { list.append(productRow(p)); });
    } catch (e) {
      list.append(el("div", { class: "notice err" }, e.message));
    }
  }

  function productRow(p) {
    var prices = p.variants.map(function (v) { return v.price_paise; });
    var priceText = prices.length ? (prices.length > 1 ? money(Math.min.apply(null, prices)) + "–" + money(Math.max.apply(null, prices)) : money(prices[0])) : "—";
    return el("div", { class: "prow" },
      el("div", { class: "p-thumb" }, p.image ? el("img", { src: p.image, alt: "" }) : null),
      el("div", {},
        el("div", { class: "p-name" }, p.name),
        el("div", { class: "p-meta" },
          el("span", { class: "badge " + p.type }, p.type === "pack" ? "Card Pack" : "Momento"), " ",
          el("span", { class: "badge " + (p.active ? "on" : "off") }, p.active ? "Live" : "Hidden"), " ",
          p.featured ? el("span", { class: "badge feat" }, "★ Featured") : null, p.featured ? " · " : " · ",
          priceText, " · ", p.variants.length + " option" + (p.variants.length === 1 ? "" : "s"))),
      el("div", { class: "p-actions" },
        el("button", { class: "mini", onclick: function () { openEditor(p); } }, "Edit"),
        el("button", { class: "mini danger", onclick: function () { del(p); } }, "Delete"))
    );
  }

  async function del(p) {
    if (!confirm('Delete "' + p.name + '"? This cannot be undone.')) return;
    try { await api("/api/admin/products/" + p.id, { method: "DELETE" }); loadProducts(); }
    catch (e) { alert(e.message); }
  }

  /* ---------------- PRODUCT EDITOR ---------------- */
  function openEditor(p) {
    var isNew = !p;
    var state = {
      id: p ? p.id : null,
      type: p ? p.type : "pack",
      name: p ? p.name : "",
      description: p ? p.description : "",
      active: p ? p.active : true,
      featured: p ? p.featured : false,
      sort: p ? p.sort : 0,
      image_key: p ? p.image_key : null,
      image_url: p ? p.image : null,
      meta: p ? Object.assign({}, p.meta) : {},
      variants: p && p.variants.length
        ? p.variants.map(function (v) { return { label: v.label, price: (v.price_paise / 100).toString(), stock: v.stock == null ? "" : String(v.stock) }; })
        : [{ label: "", price: "", stock: "" }],
    };

    modalCard.innerHTML = "";

    // type toggle
    var typeBtns = {};
    function renderType() {
      ["pack", "momento"].forEach(function (t) { typeBtns[t].classList.toggle("active", state.type === t); });
      metaWrap.innerHTML = "";
      metaWrap.append(metaFields());
    }
    ["pack", "momento"].forEach(function (t) {
      typeBtns[t] = el("button", { type: "button", onclick: function () { state.type = t; renderType(); } }, t === "pack" ? "Card Pack" : "Momento");
    });

    // fields
    var nameIn = input(state.name, "Product name", function (v) { state.name = v; });
    var descIn = textarea(state.description, state.type === "momento" ? "The story of the moment…" : "Describe the pack…", function (v) { state.description = v; });

    var metaWrap = el("div", {});

    function metaFields() {
      var frag = document.createDocumentFragment();
      (META_FIELDS[state.type] || []).forEach(function (f) {
        frag.append(fieldWrap(f[1], input(state.meta[f[0]] || "", f[2], function (v) { state.meta[f[0]] = v; })));
      });
      return frag;
    }

    // image
    var preview = el("div", { class: "preview" }, state.image_url ? el("img", { src: state.image_url, alt: "" }) : "No image");
    var fileIn = el("input", { type: "file", accept: "image/*" });
    var uploadBtn = el("button", { type: "button", class: "mini", onclick: function () { fileIn.click(); } }, "Upload image");
    fileIn.addEventListener("change", async function () {
      var file = fileIn.files[0]; if (!file) return;
      uploadBtn.textContent = "Uploading…"; uploadBtn.disabled = true;
      try {
        var fd = new FormData(); fd.append("file", file);
        var res = await api("/api/admin/upload", { method: "POST", body: fd });
        state.image_key = res.key; state.image_url = res.url;
        preview.innerHTML = ""; preview.append(el("img", { src: res.url, alt: "" }));
      } catch (e) { alert(e.message); }
      uploadBtn.textContent = "Upload image"; uploadBtn.disabled = false;
    });

    // variants
    var vlist = el("div", {});
    function renderVariants() {
      vlist.innerHTML = "";
      vlist.append(el("div", { class: "vhead" }, el("span", {}, "Option label"), el("span", {}, "Price (₹)"), el("span", {}, "Stock"), el("span", {})));
      state.variants.forEach(function (v, i) {
        var row = el("div", { class: "vrow" },
          el("input", { value: v.label, placeholder: state.type === "momento" ? "A4 Framed" : "Pack of 5", oninput: function (e) { v.label = e.target.value; } }),
          el("input", { value: v.price, placeholder: "499", inputmode: "decimal", oninput: function (e) { v.price = e.target.value; } }),
          el("input", { value: v.stock, placeholder: "∞", inputmode: "numeric", oninput: function (e) { v.stock = e.target.value; } }),
          el("button", { type: "button", class: "vdel", title: "Remove", onclick: function () { state.variants.splice(i, 1); if (!state.variants.length) state.variants.push({ label: "", price: "", stock: "" }); renderVariants(); } }, "×"));
        vlist.append(row);
      });
      vlist.append(el("button", { type: "button", class: "mini", onclick: function () { state.variants.push({ label: "", price: "", stock: "" }); renderVariants(); } }, "+ Add option"));
    }
    renderVariants();

    // active + featured + sort
    var activeChk = el("input", { type: "checkbox" }); activeChk.checked = state.active;
    activeChk.addEventListener("change", function () { state.active = activeChk.checked; });
    var featuredChk = el("input", { type: "checkbox" }); featuredChk.checked = state.featured;
    featuredChk.addEventListener("change", function () { state.featured = featuredChk.checked; });
    var sortIn = el("input", { type: "number", value: String(state.sort), style: "width:80px;background:var(--bg);border:1px solid var(--line-soft);border-radius:4px;color:var(--ink);padding:0.5rem" });
    sortIn.addEventListener("input", function () { state.sort = parseInt(sortIn.value, 10) || 0; });

    var errBox = el("div", {});
    var saveBtn = el("button", { class: "btn btn-gold" }, isNew ? "Create product" : "Save changes");
    saveBtn.addEventListener("click", function () { save(state, errBox, saveBtn); });

    modalCard.append(
      el("h3", {}, isNew ? "Add product" : "Edit product"),
      el("div", { class: "type-toggle" }, typeBtns.pack, typeBtns.momento),
      fieldWrap("Name", nameIn),
      metaWrap,
      fieldWrap("Description", descIn),
      el("label", { class: "field-label-plain", style: "display:block;font-family:var(--font-cond);text-transform:uppercase;letter-spacing:.1em;font-size:.72rem;color:var(--muted);margin-bottom:.4rem" }, "Image"),
      el("div", { class: "img-drop" }, preview, uploadBtn),
      el("label", { style: "display:block;font-family:var(--font-cond);text-transform:uppercase;letter-spacing:.1em;font-size:.72rem;color:var(--muted);margin:.4rem 0" }, "Options & pricing"),
      el("div", { class: "variant-editor" }, vlist),
      el("div", { style: "display:flex;gap:2rem;align-items:center;flex-wrap:wrap" },
        el("label", { class: "switch" }, activeChk, "Visible in shop"),
        el("label", { class: "switch" }, featuredChk, "Feature on homepage"),
        el("label", { class: "switch" }, "Sort order", sortIn)),
      errBox,
      el("div", { class: "modal-foot" },
        el("button", { class: "mini", onclick: closeModal }, "Cancel"),
        saveBtn)
    );

    renderType();
    modal.classList.add("open");
  }

  async function save(state, errBox, btn) {
    errBox.innerHTML = "";
    var payload = {
      type: state.type,
      name: state.name.trim(),
      description: state.description,
      active: state.active,
      featured: state.featured,
      sort: state.sort,
      image_key: state.image_key,
      meta: state.meta,
      variants: state.variants
        .filter(function (v) { return v.label.trim() || v.price !== ""; })
        .map(function (v) {
          return { label: v.label.trim(), price: parseFloat(v.price), stock: v.stock === "" ? null : parseInt(v.stock, 10) };
        }),
    };
    if (!payload.name) return err(errBox, "Please enter a product name.");
    if (!payload.variants.length) return err(errBox, "Add at least one option with a price.");

    btn.disabled = true; btn.textContent = "Saving…";
    try {
      if (state.id) await api("/api/admin/products/" + state.id, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      else await api("/api/admin/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      closeModal();
      loadProducts();
    } catch (e) {
      btn.disabled = false; btn.textContent = state.id ? "Save changes" : "Create product";
      err(errBox, e.message);
    }
  }

  /* ---------------- ORDERS ---------------- */
  async function loadOrders() {
    var view = document.getElementById("view");
    view.innerHTML = "";
    view.append(el("div", { class: "admin-head" }, el("h2", {}, "Orders")));
    var list = el("div", {});
    view.append(list);
    try {
      var data = await api("/api/admin/orders");
      if (!data.orders.length) { list.append(el("div", { class: "empty-state" }, el("h2", {}, "No orders yet"), el("p", {}, "Paid orders will appear here."))); return; }
      data.orders.forEach(function (o) { list.append(orderRow(o)); });
    } catch (e) { list.append(el("div", { class: "notice err" }, e.message)); }
  }

  var FULFILL = ["pending", "processing", "shipped", "completed", "cancelled"];

  function orderRow(o) {
    var c = o.customer || {};
    var items = (o.items || []).map(function (i) { return i.qty + "× " + i.name + " (" + i.label + ")"; }).join(", ");
    var when = o.created_at ? new Date(o.created_at * 1000).toLocaleString("en-IN") : "";

    var badge = el("span", { class: "status f-" + (o.fulfillment || "pending") }, o.fulfillment || "pending");

    var sel = el("select", { class: "o-select" },
      FULFILL.map(function (s) {
        var opt = el("option", { value: s }, s.charAt(0).toUpperCase() + s.slice(1));
        if ((o.fulfillment || "pending") === s) opt.selected = true;
        return opt;
      }));
    var courierIn = el("input", { class: "o-input", value: o.courier || "", placeholder: "Courier (e.g. Delhivery)" });
    var awbIn = el("input", { class: "o-input", value: o.tracking_number || "", placeholder: "AWB / tracking no." });
    var msg = el("span", { class: "o-msg" });
    var saveBtn = el("button", { class: "mini" }, "Save");
    saveBtn.addEventListener("click", async function () {
      saveBtn.disabled = true; saveBtn.textContent = "Saving…"; msg.textContent = ""; msg.className = "o-msg";
      try {
        var r = await api("/api/admin/orders/" + o.id, {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ fulfillment: sel.value, courier: courierIn.value, tracking_number: awbIn.value }),
        });
        o.fulfillment = r.fulfillment; o.courier = r.courier; o.tracking_number = r.tracking_number;
        badge.textContent = r.fulfillment; badge.className = "status f-" + r.fulfillment;
        msg.textContent = r.emailed ? "Saved · shipped email sent ✓" : "Saved ✓";
        msg.className = "o-msg ok";
      } catch (e) { msg.textContent = e.message; msg.className = "o-msg err"; }
      saveBtn.disabled = false; saveBtn.textContent = "Save";
    });

    return el("div", { class: "orow" },
      el("div", { class: "orow-top" },
        el("div", {}, el("span", { class: "o-amount" }, money(o.amount_paise)), " ",
          el("span", { class: "status " + o.status }, o.status), " ", badge),
        el("span", { class: "p-meta" }, "#" + String(o.id).slice(0, 8).toUpperCase() + " · " + when)),
      el("div", { class: "o-cust" }, (c.name || "—") + " · " + (c.email || "") + " · " + (c.phone || "")),
      c.address ? el("div", { class: "o-cust" }, "📦 " + c.address) : null,
      el("div", { class: "o-items" }, items),
      o.razorpay_payment_id ? el("div", { class: "o-items" }, "Payment: " + o.razorpay_payment_id) : null,
      el("div", { class: "o-fulfill" }, sel, courierIn, awbIn, saveBtn, msg)
    );
  }

  /* ---------------- helpers ---------------- */
  function input(val, ph, on) {
    var i = el("input", { value: val || "", placeholder: ph || "" });
    i.addEventListener("input", function () { on(i.value); });
    return i;
  }
  function textarea(val, ph, on) {
    var t = el("textarea", { placeholder: ph || "" }); t.value = val || "";
    t.addEventListener("input", function () { on(t.value); });
    return t;
  }
  function fieldWrap(label, node) { return el("div", { class: "field" }, el("label", {}, label), node); }
  function err(box, msg) { box.innerHTML = ""; box.append(el("div", { class: "notice err" }, msg)); }
  function closeModal() { modal.classList.remove("open"); }
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });
})();
