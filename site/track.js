(function () {
  var el = Store.el;
  document.getElementById("year").textContent = new Date().getFullYear();

  var form = document.getElementById("trackForm");
  var btn = document.getElementById("trackBtn");
  var result = document.getElementById("trackResult");

  // Steps shown on the timeline (cancelled is handled separately)
  var STEPS = [
    { key: "confirmed", label: "Confirmed" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "completed", label: "Delivered" },
  ];
  // map an order's fulfillment status to how far along the timeline it is
  var STAGE = { pending: 0, processing: 1, shipped: 2, completed: 3 };

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = document.getElementById("temail").value.trim();
    var phone = document.getElementById("tphone").value.trim();
    if (!email || !phone) { show(notice("Please enter both your email and phone.", "err")); return; }

    btn.disabled = true; btn.textContent = "Searching…";
    try {
      var data = await Store.api("/api/track", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, phone: phone }),
      });
      render(data.orders);
    } catch (err) {
      show(notice(err.message, "err"));
    }
    btn.disabled = false; btn.innerHTML = 'Find my order <span class="arrow">→</span>';
  });

  function show(node) { result.innerHTML = ""; result.append(node); }
  function notice(msg, kind) { return el("div", { class: "notice " + (kind || "") }, msg); }

  function render(orders) {
    result.innerHTML = "";
    if (!orders.length) {
      show(el("div", { class: "empty-state", style: "padding:3rem 1rem" },
        el("h2", {}, "No orders found"),
        el("p", {}, "We couldn't find a paid order with those details. Double-check the email and phone you used at checkout, or "),
        el("a", { href: "contact.html", class: "cc-link", style: "justify-content:center" }, "contact us →")));
      return;
    }
    orders.forEach(function (o) { result.append(orderCard(o)); });
  }

  function orderCard(o) {
    var cancelled = o.fulfillment === "cancelled";
    var stage = STAGE[o.fulfillment] != null ? STAGE[o.fulfillment] : 0;
    var when = o.created_at ? new Date(o.created_at * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
    var itemsText = o.items.map(function (i) { return i.qty + "× " + i.name + " (" + i.label + ")"; }).join(" · ");

    var children = [
      el("div", { class: "torder-head" },
        el("div", {},
          el("div", { class: "torder-ref" }, "Order #" + o.ref),
          el("div", { class: "t-date" }, "Placed " + when)),
        el("div", { class: "t-total" }, Store.money(o.amount_paise))),
      el("div", { class: "t-items" }, itemsText),
    ];

    if (cancelled) {
      children.push(el("div", { class: "t-cancelled" }, "✕ This order was cancelled"));
    } else {
      children.push(el("div", { class: "timeline" },
        STEPS.map(function (s, i) {
          return el("div", { class: "tstep" + (i <= stage ? " done" : "") + (i === stage ? " current" : "") },
            el("div", { class: "dot" }),
            el("div", { class: "lbl" }, s.label));
        })));

      if (o.tracking_number) {
        children.push(el("div", { class: "t-track" },
          el("div", { class: "k" }, "Tracking number"),
          el("div", { class: "awb" }, o.tracking_number),
          o.courier ? el("div", { class: "courier" }, "via " + o.courier) : null));
      } else if (o.fulfillment === "shipped") {
        children.push(el("div", { class: "t-items" }, "Shipped — tracking details will appear here shortly."));
      }
    }

    return el("div", { class: "torder" + (cancelled ? " cancelled" : "") }, children);
  }
})();
