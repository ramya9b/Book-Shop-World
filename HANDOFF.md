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

## Follow-up — WhatsApp assistant backend → **BUILT, awaiting Meta setup**

> **Status update.** This section originally read "NOT built here". It has since been
> built: `assistant/matcher.js` (matching + replies), `assistant/cli.js` (local tester),
> and `api/whatsapp.js` (Vercel webhook). The matcher is covered by `node qa-verify.js`.
>
> **The only thing left is the one-time Meta WhatsApp Cloud API setup** — business
> number, `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` / `WHATSAPP_VERIFY_TOKEN` in Vercel,
> and the webhook subscription. Only the owner can do this. Step-by-step:
> **`assistant/README.md`**. Until then the assistant is code-complete but not live.
>
> The notes below are the original design constraints — the implementation follows
> all of them; keep them in force for any future change.

The WhatsApp ordering assistant should read **`catalog`** and **`shopStatus`** from this
**same Firebase Realtime Database**, so the website and the assistant always agree on
prices, stock, and open/closed status.

Implementation notes:
- **Read is public** — no auth/key needed to read catalog or status (REST:
  `GET https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app/catalog.json`).
- **Match on `aliases[]`** — these hold Telugu/Kannada/Hindi/Tinglish names and common
  misspellings, and are the keys for matching free-text customer messages to items.
- **Don't fork the data** — never give the assistant its own product list; one source of
  truth keeps the shop owner editing in one place (the admin) only.
- Respect `in_stock` (don't offer out-of-stock items) and surface `shopStatus.isOpen`.

## What's actually next
1. **Meta WhatsApp Cloud API setup** (owner-only) — flips the finished assistant live.
2. **Image `alt` coverage** — the one accessibility gap still open from `AUDIT.md`.
3. **Delete the retired `SHOP_ADMIN_PIN`** dead code in `index.html` (writes are already
   enforced server-side by the RTDB rules, so this is tidy-up, not a fix).
