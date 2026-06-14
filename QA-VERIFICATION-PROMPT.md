# SVLB — Top-Tier QA Verification Prompt

> Paste this whole document to a QA/automation agent (or use as a manual test plan).
> It is self-contained: context, environments, data, scenarios, expected results,
> and acceptance criteria.

---

## ROLE
You are a **senior SDET / automation tester**. Verify the SVLB site, stock system,
and WhatsApp assistant end-to-end. Be adversarial: try to break each feature, run
negative and edge cases, and report every defect with exact reproduction steps,
expected vs actual, severity (Blocker/High/Med/Low), and evidence (screenshot/log).
Do not assume a feature works because the code looks right — observe real behavior.

## SYSTEM UNDER TEST
- **Live site:** https://varalaxmibalajienterprises.vercel.app/  (single-file HTML PWA on Vercel)
- **Owner admin:** `…/?admin=stock`  (Firebase Auth email/password; owner `srrgkenterprises@gmail.com`)
- **Data:** Firebase Realtime Database `svlb-shop` — nodes `catalog` (keyed by id) and `shopStatus`.
  REST read (public): `https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app/catalog.json`
- **Assistant webhook:** `…/api/whatsapp`  (WhatsApp Cloud API; live only after Meta env vars set)
- **Catalog schema:** `{ id, name, aliases[], price_inr:number, in_stock:boolean, category, unit, updated_at }`

## ENVIRONMENTS & TOOLS
- Browsers: latest Chrome + Safari (iOS) + Firefox. Viewports: **390px mobile** and **1280px desktop**.
- Suggested automation: **Playwright** (UI), REST calls for API/rules, Lighthouse for perf/a11y/SEO.
- API/data/logic layer already has a runner: `node qa-verify.js` (47 assertions) — run it first; all must pass.

## TEST DATA
- Catalog seed: 18 items. Mandatory anchors: `a4_paper`=₹320/ream, `stapler`=₹110, `blue_pen`/`black_pen`=₹10,
  `gel_pen`=₹25, **`glue_stick`=₹35 OUT OF STOCK**.
- Use a throwaway item id `qa_test_pen` for create/delete cases; delete it after.

---

## SCENARIO SUITES (execute all; each row = one test case)

### S1 — Internationalization (existing)
| # | Steps | Expected |
|---|-------|----------|
|1.1|Click TE then KN then EN|UI text, product names, search placeholder switch language each time|
|1.2|Switch to TE, reload page|Language persists (localStorage), `<html lang="te">`|
|1.3|Inspect lang buttons via screen reader / a11y tree|`role=group`, `aria-label`, active button `aria-pressed="true"`, others `false`|
|1.4|Switch language with product grid + cart open|Dynamic content re-renders in the chosen language, no errors|

### S2 — WhatsApp ordering (existing — must not regress)
| # | Steps | Expected |
|---|-------|----------|
|2.1|Add 2–3 products to cart, change qty, open cart, tap "Order via WhatsApp"|Opens `wa.me/919945411489` with an itemized, URL-encoded message incl. correct total|
|2.2|Tap a service WhatsApp button (Xerox/lamination/binding/rental)|Opens wa.me with the right prefilled text|
|2.3|LIC "Enquire" + Wellness "Book" + Xerox calculator "send"|Each opens wa.me with correct, encoded message|
|2.4|Order in TE/KN|Item names in the message reflect the selected language|

### S3 — Shop status badge (existing + new)
| # | Steps | Expected |
|---|-------|----------|
|3.1|Load site at various IST times|Badge reflects schedule (open/closed/soon)|
|3.2|Owner sets status Closed + note in admin (S6), reload public site|Badge shows 🔴 Closed + note within ~seconds (live Firebase)|
|3.3|Confirm no 4-digit PIN panel can write status|Old PIN path retired; status only writable via owner login|

### S4 — PWA
| # | Steps | Expected |
|---|-------|----------|
|4.1|Lighthouse PWA audit on the live URL|Installable; manifest valid; SW registered|
|4.2|Install to home screen (Android/desktop)|App installs; icon + name correct; **theme green #0A7A4E** consistent|
|4.3|Load once online, go offline, reload|Shell loads from cache (no dead page)|
|4.4|iOS "Add to Home Screen"|Home icon is the green icon (not orange)|

### S5 — SEO & meta
| # | Steps | Expected |
|---|-------|----------|
|5.1|View source: title, description, canonical, OG, Twitter, geo, JSON-LD|All present; JSON-LD `LocalBusiness` valid (Google Rich Results test)|
|5.2|Share the URL on WhatsApp/Facebook|Preview shows the shop-collage image (og:image), title, description|
|5.3|Fetch /sitemap.xml, /robots.txt|Valid; sitemap has the canonical URL, fresh lastmod|

### S6 — Stock admin: authentication (positive + negative)
| # | Steps | Expected |
|---|-------|----------|
|6.1|Open `/?admin=stock`|Login form appears (not linked from public nav)|
|6.2|Sign in with **correct** owner credentials|Panel loads; "Signed in as …"; catalog + status load|
|6.3|Sign in with **wrong password**|"Wrong email or password." — no access|
|6.4|Sign in with a **non-owner** email (if one exists)|Rejected with a clear message; signed out|
|6.5|Empty email/password → Sign in|"Enter your email and password."|
|6.6|Sign out, reopen admin|Returns to login (SESSION persistence; closing the tab logs out)|
|6.7|While logged OUT, attempt write via DevTools/REST|Denied (rules) — see S9|

### S7 — Stock admin: catalog CRUD + validation
| # | Steps | Expected |
|---|-------|----------|
|7.1|Edit a price, Save catalog|"Catalog saved — N items"; value persists on reload; `updated_at` refreshed|
|7.2|Toggle an item out of stock, Save|Item drops from public "In Stock Now" (S8)|
|7.3|Add item `qa_test_pen`, fill name/price/aliases, Save|Appears in catalog + (if in stock) on public site|
|7.4|Edit aliases (add Telugu/Kannada/Tinglish), Save|Persisted; assistant later matches them (S10)|
|7.5|Delete `qa_test_pen`, Save|Removed from catalog + public site|
|7.6|**Validation:** two items same id|"Two items share the id … — ids must be unique." No save|
|7.7|**Validation:** blank name / blank price / non-numeric price|Specific error each; no save|
|7.8|**Validation:** id with spaces/caps/symbols|"…lowercase letters, numbers and underscores." No save|

### S8 — Public "In Stock Now" + live sync
| # | Steps | Expected |
|---|-------|----------|
|8.1|Home page, scroll past "Popular Items"|"📦 In Stock Now" lists in-stock items + prices; **glue_stick hidden** (out of stock)|
|8.2|Owner toggles an item's stock in admin, refresh public|Section updates within ~1 min|
|8.3|"Ask" button on an item|Opens wa.me with "is <item> available?"|
|8.4|All items out of stock (temporarily)|Section hides cleanly (no empty box)|

### S9 — Firebase security rules
| # | Steps | Expected |
|---|-------|----------|
|9.1|REST GET /catalog.json and /shopStatus.json (no auth)|200 + data (public read)|
|9.2|REST PUT /catalog/x.json and /shopStatus.json (no auth)|**401 Permission denied**|
|9.3|Owner-authenticated write (use verify-owner-write.js)|PASS (owner may write)|
|9.4|Authenticated NON-owner write (if testable)|Denied|

### S10 — Assistant matcher (run `node qa-verify.js` + spot-check live `node assistant/cli.js "…"`)
| # | Query | Expected |
|---|-------|----------|
|10.1|`blue pen` / `neeli pen` / `నీలం పెన్` / `ನೀಲಿ ಪెన్`|All → Blue Pen ₹10, in stock|
|10.2|`staplr` (misspelling) / `pin machine` (alias)|→ Stapler ₹110|
|10.3|`A4 paper price` / `how much is gel pen`|Price intent → correct ₹|
|10.4|`is glue stick available?`|→ out of stock message|
|10.5|`i want 5 black pen`|Order → "5 × Black Pen … = ₹50"|
|10.6|`pen`|Disambiguation: lists multiple pens|
|10.7|`hi` / greeting only|Welcome message, no item|
|10.8|`spaceship` / gibberish|Graceful "couldn't find" fallback|
|10.9|Any query while shop Closed|Reply appends the "shop is closed" note|

### S11 — Assistant webhook & live WhatsApp (after Meta setup)
| # | Steps | Expected |
|---|-------|----------|
|11.1|GET `/api/whatsapp` with correct `hub.verify_token`|Echoes `hub.challenge` (200)|
|11.2|GET with wrong/no token|403 Forbidden|
|11.3|Send a real WhatsApp message "blue pen" to the number|Bot replies with price + stock from live Firebase|
|11.4|Edit a price in admin, message the bot again (~1 min)|Reply reflects the new price (sync)|
|11.5|Send non-text (image/sticker)|Ignored gracefully, no error to user|

### S12 — Performance
| # | Steps | Expected |
|---|-------|----------|
|12.1|Lighthouse (mobile) on live URL|Capture Perf/A11y/Best-Practices/SEO/PWA scores; Perf should be strong (page ~464KB)|
|12.2|Network throttling "Fast 3G", first load|Usable quickly; images lazy-load; no 5MB blob|
|12.3|Check images have width/height (no layout shift)|CLS low on gallery images|

### S13 — Accessibility (WCAG 2.1 AA spot-check)
| # | Steps | Expected |
|---|-------|----------|
|13.1|Keyboard-only: Tab through header, cart, admin|Visible focus ring on every control; logical order|
|13.2|OS "reduce motion" on, browse|Animations/transitions suppressed|
|13.3|Tap targets on mobile (lang, cart +/−)|≥ ~44px|
|13.4|axe/Lighthouse a11y scan|No critical violations; images have alt|

### S14 — Negative / edge / security
| # | Steps | Expected |
|---|-------|----------|
|14.1|Existing routes still work: `/?admin=1` (video), `/?shopStatus=1`, `/?cat=lic`, `/?tool=calc`|No regressions|
|14.2|XSS attempt: set an item name/alias to `<img src=x onerror=alert(1)>` via admin|Rendered as text, never executes (admin + public + assistant)|
|14.3|Inspect page source/network for secrets|Only the public Firebase web config; no tokens/passwords|
|14.4|Rapid double-click "Save"/"Sign in"|Buttons disable during request; no duplicate writes|

---

## ACCEPTANCE CRITERIA
- `node qa-verify.js` → **47/47 pass**.
- All **Blocker/High** cases pass; existing features (S1–S5, S14.1) show **zero regressions**.
- Security (S9, S14.2–.3): anonymous cannot write; no secrets exposed; no XSS execution.
- Assistant (S10): correct item + intent for every language/misspelling case.
- Any failure logged as a defect with repro + severity; retest after fix.

## REPORTING FORMAT
For each case: `ID | Title | Pass/Fail | Actual | Severity | Evidence`. End with a summary
(total pass/fail, defects by severity, and a go/no-go recommendation).
