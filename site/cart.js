(function () {
  var el = Store.el;
  document.getElementById("year").textContent = new Date().getFullYear();
  var root = document.getElementById("cartRoot");

  // Success return state
  if (new URLSearchParams(location.search).get("status") === "success") {
    return renderSuccess(sessionStorage.getItem("momento_last_order") || "");
  }
  render();

  function render() {
    var cart = Store.cart();
    root.innerHTML = "";
    if (!cart.length) {
      root.append(el("div", { class: "empty-state" },
        el("h2", {}, "Your cart is empty"),
        el("p", {}, "Packs to rip and momentos to frame are waiting."),
        el("a", { class: "btn btn-gold", href: "shop.html", style: "margin-top:1.4rem" }, "Browse the shop →")));
      return;
    }

    // line items
    var itemsWrap = el("div", { class: "cart-items" });
    cart.forEach(function (it) {
      var qtyInput = el("input", { type: "text", value: String(it.qty), inputmode: "numeric", "aria-label": "Quantity", style: "width:44px" });
      function setQ(n) { Store.setQty(it.variant_id, n); render(); }
      qtyInput.addEventListener("change", function () { setQ(parseInt(qtyInput.value.replace(/\D/g, ""), 10) || 1); });
      itemsWrap.append(el("div", { class: "cart-line" },
        el("div", { class: "thumb" }, it.image ? el("img", { src: it.image, alt: it.name }) : null),
        el("div", {},
          el("h4", {}, it.name),
          el("div", { class: "c-label" }, it.label),
          el("div", { class: "c-controls" },
            el("div", { class: "qty" },
              el("button", { type: "button", onclick: function () { setQ(it.qty - 1); } }, "−"),
              qtyInput,
              el("button", { type: "button", onclick: function () { setQ(it.qty + 1); } }, "+")),
            el("button", { class: "link-remove", type: "button", onclick: function () { Store.remove(it.variant_id); render(); } }, "Remove"))),
        el("div", { class: "c-price" }, Store.money(it.price_paise * it.qty))
      ));
    });

    // checkout form + summary
    var f = {};
    function field(id, label, attrs) {
      var input = el(attrs && attrs.textarea ? "textarea" : "input",
        Object.assign({ id: id, name: id }, attrs || {}));
      f[id] = input;
      return el("div", { class: "field" }, el("label", { for: id }, label), input);
    }

    var errBox = el("div", {});
    var payBtn = el("button", { class: "btn btn-gold btn-full", type: "button", style: "margin-top:0.6rem" }, "Pay " + Store.money(Store.subtotal()));
    payBtn.addEventListener("click", function () { checkout(f, errBox, payBtn); });

    var summary = el("div", { class: "summary" },
      el("h3", {}, "Checkout"),
      el("div", { class: "line" }, el("span", {}, "Subtotal"), el("span", {}, Store.money(Store.subtotal()))),
      el("div", { class: "line" }, el("span", {}, "Shipping"), el("span", {}, "Calculated after order")),
      el("div", { class: "line total" }, el("span", {}, "Total"), el("b", {}, Store.money(Store.subtotal()))),
      el("div", { style: "margin-top:1.2rem" },
        field("name", "Full name", { placeholder: "Jane Doe", autocomplete: "name" }),
        el("div", { class: "field-row" },
          field("email", "Email", { type: "email", placeholder: "you@email.com", autocomplete: "email" }),
          field("phone", "Phone", { placeholder: "9876543210", autocomplete: "tel" })),
        field("address", "Shipping address", { textarea: true, placeholder: "Street, city, state, PIN code", autocomplete: "street-address" })),
      errBox,
      payBtn,
      el("p", { class: "drop-fine", style: "text-align:center;margin-top:0.9rem" }, "🔒 Secure payment via Razorpay"));

    root.append(el("div", { class: "cart-layout" }, itemsWrap, summary));
  }

  async function checkout(f, errBox, payBtn) {
    errBox.innerHTML = "";
    var customer = {
      name: f.name.value.trim(), email: f.email.value.trim(),
      phone: f.phone.value.trim(), address: f.address.value.trim(),
    };
    if (!customer.name || !customer.email || !customer.phone || !customer.address) {
      return showErr(errBox, "Please fill in your name, email, phone and address.");
    }
    var items = Store.cart().map(function (i) { return { variant_id: i.variant_id, qty: i.qty }; });

    payBtn.disabled = true; payBtn.textContent = "Starting secure checkout…";
    var data;
    try {
      data = await Store.api("/api/checkout/create-order", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: items, customer: customer }),
      });
    } catch (e) {
      payBtn.disabled = false; payBtn.textContent = "Pay " + Store.money(Store.subtotal());
      return showErr(errBox, e.message);
    }

    if (!data.key_id || typeof Razorpay === "undefined") {
      payBtn.disabled = false; payBtn.textContent = "Pay " + Store.money(Store.subtotal());
      return showErr(errBox, "Payments aren't configured yet. (Add your Razorpay keys to go live.)");
    }

    var rzp = new Razorpay({
      key: data.key_id,
      order_id: data.rp_order_id,
      amount: data.amount,
      currency: data.currency,
      name: data.store_name || "Momento",
      description: "Order " + data.order_id.slice(0, 8),
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      theme: { color: "#e7c46a" },
      handler: async function (resp) {
        try {
          await Store.api("/api/checkout/verify", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify(resp),
          });
        } catch (e) { /* webhook is the source of truth; continue to success */ }
        sessionStorage.setItem("momento_last_order", data.order_id);
        Store.saveCart([]);
        renderSuccess(data.order_id);
      },
      modal: {
        ondismiss: function () {
          payBtn.disabled = false; payBtn.textContent = "Pay " + Store.money(Store.subtotal());
        },
      },
    });
    rzp.on("payment.failed", function (r) {
      payBtn.disabled = false; payBtn.textContent = "Pay " + Store.money(Store.subtotal());
      showErr(errBox, "Payment failed: " + (r.error && r.error.description ? r.error.description : "please try again."));
    });
    rzp.open();
  }

  function showErr(box, msg) {
    box.innerHTML = "";
    box.append(el("div", { class: "notice err" }, msg));
  }

  function renderSuccess(orderId) {
    root.innerHTML = "";
    document.querySelector(".page-head h1").textContent = "Order confirmed";
    root.append(el("div", { class: "success-box" },
      el("div", { class: "tick" }, "✓"),
      el("h1", {}, "You're in the game"),
      el("p", {}, "Thanks for your order — a confirmation is on its way to your email. We'll pack it up and get it moving."),
      orderId ? el("p", { class: "oid" }, "Order ref: #" + orderId.slice(0, 8).toUpperCase()) : null,
      el("div", { style: "display:flex;gap:0.8rem;justify-content:center;flex-wrap:wrap;margin-top:1.4rem" },
        el("a", { class: "btn btn-gold", href: "shop.html" }, "Continue shopping →"),
        el("a", { class: "btn btn-ghost", href: "track.html" }, "Track your order"))));
    Store.updateBadge();
  }
})();
