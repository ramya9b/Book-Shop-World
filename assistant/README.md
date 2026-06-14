# SVLB WhatsApp assistant

Answers customer messages on WhatsApp with live **price + stock** from the same
Firebase the website and admin use. Understands English, Telugu, Kannada, Hindi,
Tinglish, and common misspellings (via each item's `aliases`).

```
assistant/matcher.js   ← the "brain": match text → item, compose reply (pure, no deps)
assistant/cli.js       ← local tester against the LIVE catalog
api/whatsapp.js        ← Vercel serverless webhook for the WhatsApp Cloud API
```

## Try it locally (no setup needed — uses public catalog read)
```
node assistant/cli.js                 # built-in demo queries
node assistant/cli.js "neeli pen"     # ask one thing
node assistant/cli.js "is glue stick available?"
```

## What's done vs what you must provide
**Done & tested:** the matcher and the webhook code. The matcher answers price,
availability, and quantity ("i want 5 black pen = ₹50") in all the languages above.

**You must provide (one-time, only you can):** a **WhatsApp Cloud API** setup from
Meta — this is the official way to auto-reply on WhatsApp, and it needs a Meta
account + a WhatsApp Business number. Steps:

1. **Meta for Developers** → create an app → add the **WhatsApp** product
   (developers.facebook.com). You get a test number immediately; add your real
   business number when ready.
2. Note your **Phone number ID** and generate an **access token**
   (use a permanent/system-user token for production).
3. In **Vercel → this project → Settings → Environment Variables**, add:
   | name | value |
   |------|-------|
   | `WHATSAPP_VERIFY_TOKEN` | any secret string you make up (used in step 4) |
   | `WHATSAPP_TOKEN` | the access token from Meta |
   | `WHATSAPP_PHONE_ID` | the Phone number ID |
   | `FIREBASE_DB_URL` | *(optional)* defaults to the svlb-shop RTDB |
   Then redeploy.
4. In Meta → WhatsApp → **Configuration → Webhook**, set:
   - **Callback URL:** `https://varalaxmibalajienterprises.vercel.app/api/whatsapp`
   - **Verify token:** the same `WHATSAPP_VERIFY_TOKEN` you set above
   - **Subscribe** to the **messages** field.
5. Message the WhatsApp number "blue pen" — you should get the price + stock back.

## How it stays in sync
The assistant **reads the same Firebase** the owner admin writes to. Edit a price or
toggle stock in `/?admin=stock`, and the assistant reflects it within ~1 minute
(short cache). No second product list to maintain.

## Notes
- Reply quality lives in `aliases` — keep them rich (Telugu/Kannada/Tinglish +
  misspellings). Add more as you see what customers type.
- The webhook always returns HTTP 200 so WhatsApp won't retry-storm on a transient error.
- This is **not deployed/live yet** — it goes live only after you complete the Meta
  setup above and deploy.
