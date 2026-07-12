/* ============================================================
   MOMENTO — interactions
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- current year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- self-referencing canonical ---------- */
  if (!document.querySelector('link[rel="canonical"]')) {
    var canon = document.createElement("link");
    canon.rel = "canonical";
    canon.href = location.origin + "/";
    document.head.appendChild(canon);
  }

  /* ---------- Organization / Store structured data ---------- */
  (function () {
    var o = location.origin;
    var ld = {
      "@context": "https://schema.org",
      "@type": "Store",
      name: "Momento",
      alternateName: "Momento — Immortal Football Moments",
      description: "Collectible retro FUT-style football card packs and gallery-grade framed momento posters of legendary football moments.",
      url: o + "/",
      logo: o + "/favicon.svg",
      email: "siddharthmahajan@arksoft.xyz",
      telephone: "+91-70182-27240",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Krishan Kunj, Kotla Nala, Rajgarh Road",
        addressLocality: "Solan",
        addressRegion: "Himachal Pradesh",
        postalCode: "173212",
        addressCountry: "IN",
      },
      areaServed: "IN",
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  })();

  /* ---------- sticky nav state ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function closeMenu() {
    links.classList.remove("open");
    nav.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    nav.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeMenu();
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal:not(.in)");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- card 3D tilt (pointer, non-touch) ---------- */
  var stage = document.getElementById("cardStage");
  if (stage && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
    var center = document.querySelector(".fut-2");
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      center.style.transform =
        "translateY(-18px) scale(1.03) rotateY(" + (px * 16) + "deg) rotateX(" + (-py * 16) + "deg)";
    });
    stage.addEventListener("pointerleave", function () {
      center.style.transform = "";
    });
  }

  /* ---------- drop / email form (optional — only if present) ---------- */
  var form = document.getElementById("dropForm");
  var email = document.getElementById("dropEmail");
  var msg = document.getElementById("formMsg");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setMsg(text, type) {
    msg.textContent = text;
    msg.className = "form-msg " + (type || "");
  }

  if (form && email && msg) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = (email.value || "").trim();

    if (!EMAIL_RE.test(value)) {
      setMsg("Please enter a valid email address.", "err");
      email.focus();
      return;
    }

    /* Persist locally as a stand-in for a backend.
       To go live, POST `value` to Formspree / Mailchimp / your API here. */
    try {
      var list = JSON.parse(localStorage.getItem("momento_drop_list") || "[]");
      if (list.indexOf(value) === -1) list.push(value);
      localStorage.setItem("momento_drop_list", JSON.stringify(list));
    } catch (err) { /* storage unavailable — non-fatal */ }

    setMsg("You're on the list. We'll be in touch before the drop. ★", "ok");
    form.reset();
  });
})();
