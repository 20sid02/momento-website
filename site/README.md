# Momento — Immortal Football Moments

A static showcase / pre-launch website for **Momento**: collectible football card packs and gallery-grade "momento" story posters.

## What's here

```
site/
├── index.html      # the whole one-page site
├── styles.css      # design system + all styles
├── script.js       # nav, scroll reveals, card tilt, email form
├── favicon.svg     # gold "M" mark
├── assets/
│   ├── cards-spread.jpg      # hero / packs photo (from your card photo)
│   ├── momento-istanbul.jpg  # Liverpool 2005 poster
│   └── momento-zidane.jpg    # Real Madrid 2002 poster
└── README.md
```

No build step, no dependencies — it's plain HTML/CSS/JS.

## Preview locally

Just open `site/index.html` in a browser, or run a tiny server for clean paths:

```bash
cd site
python3 -m http.server 8080   # then visit http://localhost:8080
```

## Deploy (free options)

- **Netlify / Vercel** — drag-and-drop the `site/` folder, or connect a git repo. Live in ~1 minute.
- **GitHub Pages** — push `site/` to a repo and enable Pages.
- **Cloudflare Pages** — connect repo, set output dir to `site`.

## Going live — the two things to wire up

This is a **showcase** build. When you're ready:

### 1. The email / "drop list" form
Currently the form validates and saves emails to the browser's `localStorage` (a stand-in). To actually collect signups, sign up for a free form backend and point the form at it. Easiest is **Formspree**:

1. Create a form at https://formspree.io and copy your endpoint (`https://formspree.io/f/xxxx`).
2. In `index.html`, give the form an action + method:
   ```html
   <form class="drop-form" id="dropForm" action="https://formspree.io/f/xxxx" method="POST" novalidate>
   ```
3. In `script.js`, inside the submit handler where the comment says *"POST `value` to Formspree…"*, replace the `localStorage` block with a real `fetch(form.action, …)`.

Mailchimp, Beehiiv, ConvertKit and Kit all work the same way.

### 2. Real checkout (later)
When you want to actually sell, the two simplest paths:
- **Shopify Lite / Buy Buttons** — embed "Buy" buttons into this same static site; Shopify handles payments, inventory and shipping.
- **Stripe Payment Links / Checkout** — create products in Stripe, drop the payment links onto the packs/momentos. Good if you don't need full inventory management yet.

## Editing content

- **Text & copy** — all in `index.html`, plainly labelled by section (`HERO`, `THE PACKS`, `THE MOMENTOS`, etc.).
- **Colours & fonts** — the `:root` variables at the top of `styles.css`.
- **Add a new momento** — drop the poster image in `assets/` and copy one `<figure class="momento">` block in the momentos gallery.
- **The sample cards** — the gold FUT-style cards in the packs section are pure HTML/CSS (`.fut-card`); edit ratings, names and stats inline.

## ⚠️ Legal note (please read)

The sample cards imitate the **EA Sports FUT** layout, and real player likenesses/photos and club/league marks are trademarked and copyrighted. Selling replica FUT cards commercially carries real legal risk that grows with scale. Before scaling up, strongly consider moving to an **original card design** that keeps the collectible stat-card feel without copying EA's template or using unlicensed player images. The footer already carries a "not affiliated with EA/FIFA" disclaimer, but a disclaimer alone is not a legal shield.
