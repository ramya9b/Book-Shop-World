'use strict';
/* ──────────────────────────────────────────────────────────────────────────
   Live Google rating + review count for the site badge.

   Fetches the real numbers from the Google Places API (Place Details) on the
   server so the API key never reaches the browser, and caches for 6 hours.

   Required environment variable (Vercel → Project → Settings → Env):
     GOOGLE_PLACES_API_KEY   a Places API key (Google Cloud, billing enabled)

   Optional:
     GOOGLE_PLACE_ID     the exact Place ID (skips the name lookup)
     GOOGLE_PLACE_QUERY  business name to look up if no Place ID is given
                         (defaults to the shop's name + area)

   If the key is missing, or the API errors, this returns 204 (no content) and
   the badge on the site simply stays hidden — it NEVER shows a fake number.
   ────────────────────────────────────────────────────────────────────────── */

const DEFAULT_QUERY = 'SRI Varalakshmi Balaji Enterprises KR Puram Bengaluru';

let _cache = { at: 0, data: null };   // rating/total cache
let _pid = null;                       // resolved Place ID cache
const TTL = 6 * 60 * 60 * 1000;        // 6 hours

async function resolvePlaceId(key) {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  if (_pid) return _pid;
  const q = process.env.GOOGLE_PLACE_QUERY || DEFAULT_QUERY;
  const url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json' +
    '?input=' + encodeURIComponent(q) +
    '&inputtype=textquery&fields=place_id' +
    '&key=' + encodeURIComponent(key);
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status === 'OK' && j.candidates && j.candidates[0]) {
    _pid = j.candidates[0].place_id;
    return _pid;
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=21600, s-maxage=21600');
  try {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return res.status(204).end();

    if (Date.now() - _cache.at < TTL && _cache.data) {
      return res.status(200).json(_cache.data);
    }

    const placeId = await resolvePlaceId(key);
    if (!placeId) return res.status(204).end();

    const url = 'https://maps.googleapis.com/maps/api/place/details/json' +
      '?place_id=' + encodeURIComponent(placeId) +
      '&fields=rating,user_ratings_total' +
      '&key=' + encodeURIComponent(key);

    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (j.status !== 'OK' || !j.result || j.result.rating == null) {
      return res.status(204).end();
    }

    const data = {
      rating: j.result.rating,
      total: j.result.user_ratings_total || 0
    };
    _cache = { at: Date.now(), data };
    return res.status(200).json(data);
  } catch (e) {
    return res.status(204).end();
  }
};
