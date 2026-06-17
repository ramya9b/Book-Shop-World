'use strict';
/* ──────────────────────────────────────────────────────────────────────────
   SVLB WhatsApp assistant — webhook (Vercel serverless function).

   Receives messages from the WhatsApp Cloud API, reads the LIVE catalog +
   shop status from the same Firebase, matches via assistant/matcher.js, and
   replies on WhatsApp.

   Required environment variables (set in Vercel → Project → Settings → Env):
     WHATSAPP_VERIFY_TOKEN   any secret string you choose (used once, at setup)
     WHATSAPP_TOKEN          permanent access token from Meta / WhatsApp
     WHATSAPP_PHONE_ID       the WhatsApp "Phone number ID"
     FIREBASE_DB_URL         (optional) defaults to the svlb-shop RTDB URL
   ────────────────────────────────────────────────────────────────────────── */
const { handleMessage, matchOne, toArray } = require('../assistant/matcher.js');

const DB = process.env.FIREBASE_DB_URL ||
  'https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app';

/* Public base URL of the site — used to build product-photo links for WhatsApp. */
const PUBLIC_BASE = (process.env.WHATSAPP_PUBLIC_BASE ||
  'https://varalaxmibalajienterprises.vercel.app').replace(/\/+$/, '');

/* Small warm-instance cache so we don't refetch the catalog on every message. */
let _cache = { at: 0, catalog: [], status: null };
async function getData() {
  if (Date.now() - _cache.at < 60000 && _cache.catalog.length) return _cache;
  const [cat, status] = await Promise.all([
    fetch(`${DB}/catalog.json`).then(r => r.json()).catch(() => ({})),
    fetch(`${DB}/shopStatus.json`).then(r => r.json()).catch(() => null)
  ]);
  _cache = { at: Date.now(), catalog: toArray(cat), status };
  return _cache;
}

async function sendWhatsApp(to, text) {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) { console.error('WHATSAPP_PHONE_ID / WHATSAPP_TOKEN not set'); return; }
  const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) console.error('TEXT SEND FAILED', r.status, JSON.stringify(j));
  else console.log('TEXT SENT', JSON.stringify(j));
}

async function sendWhatsAppImage(to, link, caption) {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) { console.error('WHATSAPP_PHONE_ID / WHATSAPP_TOKEN not set'); return; }
  const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'image', image: { link, caption } })
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); console.error('IMAGE SEND FAILED', r.status, JSON.stringify(j)); throw new Error('image send ' + r.status); }
  else console.log('IMAGE SENT');
}

module.exports = async (req, res) => {
  // 1) Webhook verification handshake (Meta calls this once with GET).
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // 2) Incoming messages.
  if (req.method === 'POST') {
    try {
      const value = req.body && req.body.entry && req.body.entry[0] &&
        req.body.entry[0].changes && req.body.entry[0].changes[0] &&
        req.body.entry[0].changes[0].value;
      const msg = value && value.messages && value.messages[0];

      console.log('INBOUND', JSON.stringify({
        hasMessages: !!(value && value.messages),
        hasStatuses: !!(value && value.statuses),
        type: msg && msg.type,
        text: msg && msg.text && msg.text.body
      }));

      // Ignore delivery/read receipts and non-text messages.
      if (!msg || msg.type !== 'text') return res.status(200).json({ ignored: true });

      const from = msg.from;
      const text = msg.text && msg.text.body ? msg.text.body : '';
      const { catalog, status } = await getData();
      const reply = handleMessage(catalog, text, status);
      const one = matchOne(catalog, text);
      if (one && one.image && one.id) {
        // Send the product photo with the reply as the caption; fall back to text if the image send fails.
        try {
          await sendWhatsAppImage(from, `${PUBLIC_BASE}/api/img?id=${encodeURIComponent(one.id)}`, reply);
        } catch (imgErr) {
          await sendWhatsApp(from, reply);
        }
      } else {
        await sendWhatsApp(from, reply);
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('webhook error:', e);
      // Always 200 so WhatsApp doesn't retry-storm us on a transient error.
      return res.status(200).json({ error: String(e && e.message || e) });
    }
  }

  res.status(405).send('Method Not Allowed');
};
