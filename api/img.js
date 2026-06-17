'use strict';
/* Serves a catalog item's photo as a real image, so WhatsApp (and anything else)
   can fetch it by URL:  /api/img?id=<itemId>
   The photo is stored in Firebase as a base64 data-URL; this decodes and returns it. */

const DB = process.env.FIREBASE_DB_URL ||
  'https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app';

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '').replace(/[^a-z0-9_]/gi, '');
  if (!id) { res.status(400).send('missing id'); return; }
  try {
    const r = await fetch(`${DB}/catalog/${id}/image.json`);
    const data = await r.json();                       // "data:image/jpeg;base64,…"
    if (!data || typeof data !== 'string') { res.status(404).send('no image'); return; }
    const m = data.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!m) { res.status(404).send('not an image'); return; }
    const buf = Buffer.from(m[2], 'base64');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=300');   // 5-min cache
    res.status(200).send(buf);
  } catch (e) {
    console.error('img error:', e);
    res.status(500).send('error');
  }
};
