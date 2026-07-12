/* Shared storefront helpers: cart (localStorage), money, API, tiny DOM builder. */
window.Store = (function () {
  var CART_KEY = "momento_cart";
  var SYMBOL = "₹";

  function read() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
  }
  function write(c) {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
    updateBadge();
  }

  var S = {
    SYMBOL: SYMBOL,
    money: function (paise) {
      var rupees = (Number(paise) || 0) / 100;
      var frac = paise % 100 ? 2 : 0;
      return SYMBOL + rupees.toLocaleString("en-IN", { minimumFractionDigits: frac, maximumFractionDigits: 2 });
    },
    cart: read,
    saveCart: write,
    addItem: function (item) {
      var c = read();
      var ex = c.find(function (i) { return i.variant_id === item.variant_id; });
      if (ex) ex.qty += item.qty; else c.push(item);
      write(c);
    },
    setQty: function (variant_id, qty) {
      var c = read();
      var i = c.find(function (x) { return x.variant_id === variant_id; });
      if (i) i.qty = Math.max(1, Math.min(20, qty));
      write(c.filter(function (x) { return x.qty > 0; }));
    },
    remove: function (variant_id) {
      write(read().filter(function (x) { return x.variant_id !== variant_id; }));
    },
    count: function () { return read().reduce(function (n, i) { return n + i.qty; }, 0); },
    subtotal: function () { return read().reduce(function (n, i) { return n + i.price_paise * i.qty; }, 0); },

    api: async function (path, opts) {
      var r = await fetch(path, opts);
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(d.error || ("Request failed (" + r.status + ")"));
      return d;
    },

    // Tiny hyperscript helper
    el: function (tag, attrs) {
      var e = document.createElement(tag);
      attrs = attrs || {};
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null) continue;
        if (k === "class") e.className = v;
        else if (k === "html") e.innerHTML = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
      }
      for (var i = 2; i < arguments.length; i++) {
        var kid = arguments[i];
        if (kid == null || kid === false) continue;
        if (Array.isArray(kid)) kid.forEach(function (kk) { if (kk != null) e.append(kk.nodeType ? kk : document.createTextNode(kk)); });
        else e.append(kid.nodeType ? kid : document.createTextNode(kid));
      }
      return e;
    },
  };

  function updateBadge() {
    var n = S.count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.style.display = n ? "grid" : "none";
    });
  }
  S.updateBadge = updateBadge;

  document.addEventListener("DOMContentLoaded", function () {
    updateBadge();

    // self-referencing canonical (keeps only meaningful params, drops utm/etc.)
    if (!document.querySelector('link[rel="canonical"]')) {
      var u = new URL(location.href);
      var keep = new URLSearchParams();
      ["type", "slug"].forEach(function (k) { var v = u.searchParams.get(k); if (v) keep.set(k, v); });
      var qs = keep.toString();
      var canon = document.createElement("link");
      canon.rel = "canonical";
      canon.href = u.origin + u.pathname + (qs ? "?" + qs : "");
      document.head.appendChild(canon);
    }

    // ensure a "Track Order" link exists in the legal footer of every store page
    document.querySelectorAll(".footer-legal").forEach(function (nav) {
      if (!nav.querySelector('a[href="track.html"]')) {
        var a = document.createElement("a");
        a.href = "track.html"; a.textContent = "Track Order";
        nav.insertBefore(a, nav.children[1] || null);
      }
    });
    // mobile menu toggle (shared across store pages)
    var nav = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (toggle && links && nav) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        nav.classList.toggle("menu-open", open);
      });
      links.addEventListener("click", function (e) {
        if (e.target.tagName === "A") { links.classList.remove("open"); nav.classList.remove("menu-open"); }
      });
    }
  });
  return S;
})();
