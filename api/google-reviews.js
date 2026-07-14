'use strict';
/* ──────────────────────────────────────────────────────────────────────────
   Live Google rating + review count for the site badge.

   Fetches the real numbers from the Google Places API (Place Details) on the
   server so the API key never reaches the browser, and caches for 6 hours.

   Required environment variables (Vercel → Project → Settings → Env):
     GOOGLE_PLACES_API_KEY   a Places API key (Google Cloud, billing enabled)
     GOOGLE_PLACE_ID         the Place ID of the business listing

   If either is missing, or the API errors, this returns 204 (no content) and
   the badge on the site simply stays hidden — it NEVER shows a fake number.
   ────────────────────────────────────────────────────────────────────────── */

let _cache = { at: 0, data: null };
const TTL = 6 * 60 * 60 * 1000; // 6 hours

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=21600, s-maxage=21600');
  try {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;
    if (!key || !placeId) return res.status(204).end();

    if (Date.now() - _cache.at < TTL && _cache.data) {
      return res.status(200).json(_cache.data);
    }

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
