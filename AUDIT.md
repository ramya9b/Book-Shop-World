# SVLB Site Audit — Phase 1 (read-only)

**Site:** Sri Vara Lakshmi Balaji Enterprises — stationery + services, KR Puram, Bengaluru
**Repo:** single-file HTML PWA (`index.html`, 5.07 MB / 6,413 lines) + `vercel.json`, `manifest.json`, `sw.js`, `sitemap.xml`, `robots.txt`, icons
**Live URL:** https://varalaxmibalajienterprises.vercel.app/ (from `sitemap.xml` / `robots.txt` / canonical)
**Reviewed by:** source read only — no code changed.

## Method & caveats
- **Lighthouse not run.** The CLI is not installed and running a real audit needs a headless-Chrome install — outside the read-only remit. Scores below are *manual estimates*, not measured. I can run Lighthouse in a later phase if you want measured numbers, or you can send me screenshots / a PageSpeed link.
- **No live browsing performed** (no browser tool available in this session). Visual/UX/responsiveness findings are inferred from source (CSS, viewport, breakpoints, tap-target sizes) and should be confirmed on a real device at ~390px and desktop.
- **Two referenced files are absent from the repo:** `svlb-admin.html` and `svlb-catalog.json` (the brief says they're "in this repo" — they are not). This affects Phase 2; see note at the end.

---

## Findings

| Area | Severity | Finding | Recommended change | Rough effort |
|------|----------|---------|--------------------|--------------|
| **Performance** | **High** | The entire site is one 5.07 MB HTML file with **72 base64 JPEG + 3 base64 PNG images inlined**. Base64 inflates bytes ~33% and the whole blob must be parsed before render; images can't be cached, lazy-fetched, or CDN-optimized independently. `vercel.json` serves `index.html` `max-age=0, must-revalidate`, so every visit re-validates the full document. | Extract inlined images to real `.webp`/`.jpg` files (or an `/img` dir), reference by URL, keep `loading="lazy"`, add `width`/`height` to prevent CLS. Target: HTML well under ~300 KB. | M–L |
| **Firebase wiring** | **High** | Realtime Database is wired (compat SDK 9.23.0) but **`FIREBASE_DB_URL` is empty** (`index.html:5929`) — live status is *not connected* and silently falls back to `localStorage` (same-device only). Config carries **only `databaseURL`** — there is **no Firebase Auth** (no apiKey/authDomain/projectId). Write access is gated by a **hardcoded 4-digit PIN** (`SHOP_ADMIN_PIN = '9945'`, `index.html:5930`) visible in page source. Status node is `shopStatus` = `{isOpen, note, updated, updatedBy}`. | Phase-2 blocker — see "Firebase reality check" below. At minimum: stand up a Firebase project, populate the URL, and don't rely on a plaintext PIN for write protection once a catalog is added. | (Phase 2) |
| **Accessibility** | **Med** | No `prefers-reduced-motion` handling anywhere, despite heavy `transform`/`scale`/`perspective` hover & card animations. Only ~12 `alt=` attributes for 70+ images; ~18 `aria-*` and 4 `role=` total. Focus styling is partial (`:focus` appears 7×, no consistent `:focus-visible`). Language buttons (`lbEN/TE/KN`) lack `aria-pressed`/`aria-label`. | Add a `@media (prefers-reduced-motion: reduce)` block; ensure every product/LIC image has a meaningful `alt`; add visible `:focus-visible` rings; add `aria-pressed` to lang/tab toggles. | M |
| **Accessibility — tap targets** | **Med** | Several controls look below the 44px minimum: lang buttons (`padding:.28rem .6rem`), cart qty `−/+` (`.qbtn`), FAQ toggles. Needs device confirmation. | Bump small interactive controls to ≥44×44px hit area (padding or min-height). | S |
| **SEO — social image** | **Med** | `twitter:card` is `summary_large_image` but there is **no `og:image` or `twitter:image`** — WhatsApp/Facebook/Twitter shares render with no preview image. `shop-collage.png` already exists in the repo and is unused for this. | Add `og:image` + `twitter:image` (absolute URL) pointing at `shop-collage.png` or a dedicated 1200×630 card. | S |
| **SEO — sitemap** | **Low** | `sitemap.xml` lists only the homepage; the three `hreflang` alternates (en/te/kn) all point to the **same URL** (`/`), which is redundant/ineffective since language is JS-state, not a distinct URL. `lastmod` is `2026-04-14`. | Either drop the alternates (single-URL site) or keep one self-referencing entry; refresh `lastmod` on deploy. | S |
| **Consistency — theme color** | **Med** | `<meta name="theme-color">` is **`#0A7A4E` (green)** (`index.html:13`) but `manifest.json` `theme_color` is **`#D4691A` (orange)** and the manifest icons are orange. Installed-app chrome and the address bar disagree with the brand. | Pick one brand color and make meta + manifest + icons agree. | S |
| **Docs — URL drift** | **Low** | `README.md` still says the site deploys to `svlb-shop.vercel.app`, but the real domain (canonical/sitemap/robots) is `varalaxmibalajienterprises.vercel.app`. README also documents only a 3-file layout, omitting the PNGs, manifest, sw.js, sitemap, etc. | Update README to the real domain and current file list. | S |
| **PWA — offline scope** | **Low** | SW pre-caches only `['/', './index.html']` and is network-first. First-load offline works for the shell; cross-origin (fonts, Firebase, YouTube) is correctly skipped. SW **registration is blocked on `localhost`/`127.0.0.1`** (`index.html:5137-5146`) — so `vercel dev` locally will **not** register the SW (expected, but note it for Phase 3/4 PWA testing — test install/offline on the deployed URL or a preview domain). | No change needed; flagged so PWA testing isn't done on localhost and mistaken for a regression. | — |
| **Security — secrets** | **Med** | The shop-status PIN is in client source. That's acceptable for a low-stakes status toggle, but **must not** be the gate for catalog *writes* once Phase 2 lands. No other secrets are committed (Firebase web config is public by design). | Move write-protection to Firebase Auth (owner-only) in Phase 2; leave the public web config inline. | (Phase 2) |
| **Visual / branding / trust** | **Low** | Reads as a polished, trustworthy local business: clear name, address, phone, hours, LocalBusiness schema, reviews, FAQ, GPS-aware open/closed badge, trilingual UI. Strong for the segment. Confirm on-device that the green/gold palette renders consistently after the theme-color fix. | Confirm visually; address theme-color row above. | — |
| **Layout / UX / nav** | **Low** | Coherent single-page flow: hero → pricing strip → categories → product grid → services → LIC → wellness → reviews → FAQ → contact, with a cart drawer and floating WhatsApp. Search + category + wellness tabs present. No structural issues spotted in source. | Confirm on-device; no change required. | — |
| **Hosting / vercel.json** | **Low** | Correct and minimal: `sw.js` served `no-cache` with `application/javascript` + `Service-Worker-Allowed:/`; `manifest.json` as `application/manifest+json`; `index.html` `must-revalidate`. **No `rewrites`** — so a future separate `/admin` page would 404 unless a rewrite is added (relevant to Phase 2 if admin is its own page). | No change now; plan the `/admin` rewrite in Phase 2 only if admin is a separate file. | — |
| **WhatsApp ordering** | **Low** | Works entirely client-side. Cart → `orderWA()` builds a `*Order*` message (line items × qty + total) and opens `wa.me/919945411489?text=…` via `encodeURIComponent`. LIC `enquire()`, wellness `bookWellness()`, Xerox calculator, and per-service buttons all use the same pattern. Primary number 9945411489 everywhere; 8073815650 appears only in footer/contact. Messages are localized via `pName()`. Robust. | None. | — |

---

## Data model context (for Phase 2)

- **Catalog today is a hardcoded JS array** `const P = [ … ]` at `index.html:2740` — **~236 product objects**, shape:
  `{ id, name, emoji, cat, price, unit, desc, badge?, insurer?, img?, wcat? }`.
- This differs from the brief's `svlb-catalog.json` schema (`price_inr`, `category`, `in_stock`, `aliases[]`). A migration/mapping will be needed: `price→price_inr`, `cat→category`, plus new `in_stock` and `aliases[]`.
- **Firebase = Realtime Database**, not Firestore. Status lives at node **`shopStatus`** (brief says "`status`" — actual node name is `shopStatus`; I'll reuse the real one).

## Firebase reality check (read this before Phase 2 planning)

The brief assumes an "existing Firebase" with Auth to restrict to the owner. In the source, **none of that is configured yet**:
1. `FIREBASE_DB_URL` is empty — there is no connected project.
2. The config object has **no Auth fields** — Firebase Auth is not initialized at all.
3. Write protection is a **client-side PIN**, not server-enforced rules.

So Phase 2 isn't "reuse existing Auth" — it's "**stand up the Firebase project + add Auth + write security rules for the first time**." I'll surface the exact decisions at the Phase-2 pause; I won't assume a project exists.

---

## Summary — single most impactful fix

**De-bloat the page.** The site is a 5 MB single file because 75 images are base64-inlined; that one fact dominates load time, render-blocking, cache efficiency, and the likely Lighthouse performance score. Extracting those images to real, lazy-loaded, dimensioned files would cut the HTML payload by an order of magnitude and lift every performance metric at once — the highest return for the least risk, and it touches none of the working WhatsApp / Firebase / language logic.
