# Handoff — SVLB stock system & next step

## What's live now
- **Catalog + shop status** live in Firebase **Realtime Database** (project `svlb-shop`,
  region `asia-southeast1`).
  - `catalog` — keyed by item id, each value: `{ name, aliases[], price_inr, in_stock,
    category, unit, updated_at }`.
  - `shopStatus` — `{ isOpen, note, updated, updatedBy }`.
- **Owner admin** at `/?admin=stock` (Firebase Auth, owner `srrgkenterprises@gmail.com`):
  add/edit/delete items, in-stock toggle, price/category/unit/aliases, and the shop sign.
- **Security rules** (`firebase-rules.json`): both nodes are **public-read, owner-write**.
- The public site shows in-stock items live under "📦 In Stock Now".

## Follow-up (NOT built here) — WhatsApp assistant backend
The WhatsApp ordering assistant should read **`catalog`** and **`shopStatus`** from this
**same Firebase Realtime Database**, so the website and the assistant always agree on
prices, stock, and open/closed status.

Implementation notes for whoever builds it:
- **Read is public** — no auth/key needed to read catalog or status (REST:
  `GET https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app/catalog.json`).
- **Match on `aliases[]`** — these hold Telugu/Kannada/Hindi/Tinglish names and common
  misspellings, and are the keys for matching free-text customer messages to items.
- **Don't fork the data** — never give the assistant its own product list; one source of
  truth keeps the shop owner editing in one place (the admin) only.
- Respect `in_stock` (don't offer out-of-stock items) and surface `shopStatus.isOpen`.

Flagged as the next piece of work — scope it separately.
