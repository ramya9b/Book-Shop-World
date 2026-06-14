# SVLB browser E2E (Playwright)

Runnable browser automation for the UI suites in `../QA-VERIFICATION-PROMPT.md`
(S1–S5, S8, S13, S14) plus admin auth + validation (S6, S7). Isolated from the
site build — it lives in this folder with its own `package.json` and targets the
**live site** by default.

## Setup
```
cd e2e
npm install
npm run install:browsers     # downloads Chromium (~once)
```

## Run
```
npm run test:public          # S1–S5, S8, S13, S14 — safe, read-only
npm test                     # everything (admin auth/validation tests skip without a password)
npm run report               # open the HTML report
```
Target a different deploy (e.g. a preview):
```
SITE_URL=https://<preview>.vercel.app npm run test:public
```

## Admin tests (need the owner password)
S6/S7 sign in as the owner. They **skip** unless you provide the password, and they
perform **no database writes** — S7 only checks client-side validation (duplicate id,
non-numeric price, bad id format), which is rejected *before* any save.
```
# PowerShell
$env:OWNER_PASSWORD="..."; npm run test:admin
# bash
OWNER_PASSWORD="..." npm run test:admin
```

## What is intentionally NOT automated
- **Real add/edit/delete against the live DB** — would mutate the live shop. Do these
  manually per the prompt, or point `SITE_URL` at a separate staging Firebase first.
- **Live WhatsApp round-trip (S11)** — needs the Meta Cloud API connection.
- **Lighthouse scores (S12)** — run `npx lighthouse <url>` separately.

## Coverage map
| File | Suites |
|------|--------|
| `tests/public.spec.js` | S1 i18n · S2 WhatsApp · S3 status badge · S4/S5 PWA+SEO · S8 stock · S13 a11y · S14 routes |
| `tests/admin.spec.js`  | S6 auth (positive+negative) · S7 validation |

> `node_modules/` is git-ignored. The API/data/logic layer is covered separately by
> `../qa-verify.js` (47 assertions).
