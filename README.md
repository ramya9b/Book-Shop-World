# Sri Vara Lakshmi Balaji Enterprises

Single-file HTML PWA for a stationery + services shop in KR Puram, Bengaluru,
plus a few Vercel serverless functions and a WhatsApp ordering assistant.
Stationery, Xerox, lamination, project work, rental agreements, LIC insurance,
wellness coaching, WhatsApp ordering, a live shop-status badge, and an
owner-managed stock catalog.

**Live:** https://varalaxmibalajienterprises.vercel.app/

## 📁 File structure (keep at repo ROOT)
```
Book-Shop-World/
├── index.html          ← the entire public website (HTML + CSS + JS in one file)
├── manifest.json       ← PWA manifest
├── sw.js               ← service worker (offline caching)
├── vercel.json         ← Vercel headers (sw.js no-cache, manifest content-type)
├── sitemap.xml         ← SEO sitemap (homepage + /templates/ sample pages)
├── robots.txt          ← SEO
├── apple-touch.png / favicon-32.png / shop-collage.png / shop-collage.jpg
├── img/                ← shop photos & card images (extracted from the HTML)
├── firebase-rules.json ← Realtime Database security rules (paste into console)
├── svlb-catalog.json   ← reference catalog (schema + multilingual aliases)
├── svlb-admin.html     ← standalone admin reference (Cloudflare Worker API)
├── svlb-rtdb-seed.json ← import-ready seed for the Firebase Realtime Database
│
├── api/                ← Vercel serverless functions
│   ├── whatsapp.js       WhatsApp Cloud API webhook (the ordering assistant)
│   ├── google-reviews.js live Google rating for the badge (key stays server-side)
│   └── img.js            serves a catalog item's photo by URL: /api/img?id=<itemId>
├── assistant/          ← WhatsApp assistant brain + local tester (own README)
├── templates/          ← public design-sample gallery, /templates/ (own index.html)
├── e2e/                ← Playwright browser tests (own README, git-ignored deps)
├── qa-verify.js        ← automated suite, 47 assertions: node qa-verify.js
├── QA-VERIFICATION-PROMPT.md ← manual QA script (suites S1–S14)
├── AUDIT.md            ← ⚠️ superseded Phase-1 audit (historical, not a to-do)
├── HANDOFF.md          ← stock system status & next steps
└── .gitignore
```

## 🚀 Deploy
The GitHub repo is connected to Vercel — **pushing to `main` auto-deploys to production.**
No build step (Framework Preset: Other, empty build/output).

## 🗂️ Stock catalog & shop status (Firebase Realtime Database)
- Project: `svlb-shop` (region `asia-southeast1`). Catalog node: `catalog` (keyed by id).
  Shop status node: `shopStatus`.
- **Owner admin:** open `/?admin=stock` and sign in with the owner account
  (`srrgkenterprises@gmail.com`, Firebase Auth email/password). Add/edit/delete
  items, toggle in-stock, set the shop sign.
- **Security rules:** `firebase-rules.json` — catalog + status are public-read,
  owner-write only. Paste into Firebase Console → Realtime Database → Rules → Publish.
- In-stock items render live on the home page under "📦 In Stock Now".

## 💬 WhatsApp ordering assistant
Auto-replies to customer messages with live price + stock, in English / Telugu /
Kannada / Hindi / Tinglish, reading the **same Firebase** the admin writes to —
no second product list to maintain.

- `assistant/matcher.js` — matching + reply composition (pure, no deps)
- `assistant/cli.js` — local tester against the live catalog:
  `node assistant/cli.js "neeli pen"`
- `api/whatsapp.js` — the Vercel webhook

**Code is complete but NOT live.** Going live needs a one-time Meta WhatsApp
Cloud API setup (business number, tokens, webhook subscription) that only the
owner can do. Full steps: **[`assistant/README.md`](assistant/README.md)**.

## 🎨 Design-sample gallery (`/templates/`)
67 public sample pages used to sell the shop's design services — business site
templates (bakery, salon, gym, clinic, boutique, travel, …), Google Business
Profile and Maps mock-ups, WhatsApp automation/marketing samples, posters, logo
and invitation samples, resume/CV formats, and coaching decks. Indexed at
`/templates/` and listed in `sitemap.xml`.

**`resume-samples.html`** is the one page with **view-only** samples: six resumes
rendered as live HTML (no file is ever served), behind a watermark, a transparent
shield layer, blocked context-menu/drag/selection, blocked `Ctrl+S`/`P`/`U` and
devtools shortcuts, and a print stylesheet that yields only a notice.
These are **deterrents, not security** — a screenshot still works. The real
protection is that there is no resume file to download.

## ✅ Testing
| Layer | Command | Notes |
|---|---|---|
| API / data / logic | `node qa-verify.js` | 47 assertions — matcher, Firebase data + rules, production HTTP, source integrity |
| Browser E2E | `cd e2e && npm install && npm run test:public` | Playwright, targets the **live site**; read-only |
| Manual QA | see `QA-VERIFICATION-PROMPT.md` | suites S1–S14 |

Admin E2E tests skip unless `OWNER_PASSWORD` is set, and perform no DB writes.
Details in [`e2e/README.md`](e2e/README.md).

## 🔑 Environment variables (Vercel → Settings → Environment Variables)
| Name | Used by | Required? |
|---|---|---|
| `WHATSAPP_VERIFY_TOKEN` | `api/whatsapp.js` | for the assistant |
| `WHATSAPP_TOKEN` | `api/whatsapp.js` | for the assistant |
| `WHATSAPP_PHONE_ID` | `api/whatsapp.js` | for the assistant |
| `GOOGLE_PLACES_API_KEY` | `api/google-reviews.js` | optional — badge hides without it |
| `GOOGLE_PLACE_ID` / `GOOGLE_PLACE_QUERY` | `api/google-reviews.js` | optional |
| `FIREBASE_DB_URL` | `api/*` | optional — defaults to the svlb-shop RTDB |

## 🎬 Add promo videos
Visit `https://varalaxmibalajienterprises.vercel.app/?admin=1` → paste YouTube links → Save.
