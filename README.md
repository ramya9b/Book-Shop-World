# Sri Vara Lakshmi Balaji Enterprises

Single-file HTML PWA for a stationery + services shop in KR Puram, Bengaluru.
Stationery, Xerox, lamination, project work, rental agreements, LIC insurance,
wellness coaching, WhatsApp ordering, a live shop-status badge, and an
owner-managed stock catalog.

**Live:** https://varalaxmibalajienterprises.vercel.app/

## 📁 File structure (keep at repo ROOT)
```
Book-Shop-World/
├── index.html          ← the entire website (HTML + CSS + JS in one file)
├── manifest.json       ← PWA manifest
├── sw.js               ← service worker (offline caching)
├── vercel.json         ← Vercel headers (sw.js no-cache, manifest content-type)
├── sitemap.xml         ← SEO sitemap
├── robots.txt          ← SEO
├── apple-touch.png / favicon-32.png / shop-collage.png / shop-collage.jpg
├── img/                ← shop photos & card images (extracted from the HTML)
├── firebase-rules.json ← Realtime Database security rules (paste into console)
├── svlb-catalog.json   ← reference catalog (schema + multilingual aliases)
├── svlb-admin.html     ← standalone admin reference (Cloudflare Worker API)
├── svlb-rtdb-seed.json ← import-ready seed for the Firebase Realtime Database
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

## 🎬 Add promo videos
Visit `https://varalaxmibalajienterprises.vercel.app/?admin=1` → paste YouTube links → Save.
