'use strict';
/* Local demo/test for the SVLB assistant matcher.
 * Fetches the LIVE catalog + status from Firebase (public read) and answers queries.
 *
 *   node assistant/cli.js                 # runs the built-in demo queries
 *   node assistant/cli.js "neeli pen"     # answer one query
 */
const { handleMessage, toArray } = require('./matcher.js');

const DB = process.env.FIREBASE_DB_URL ||
  'https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app';

const DEMO = [
  'hi',
  'blue pen',
  'neeli pen',
  'నీలం పెన్',
  'ನೀಲಿ ಪೆನ್',
  'staplr',                 // misspelling
  'A4 paper price',
  'how much is gel pen',
  'is glue stick available?',
  'i want 5 black pen',
  'pin machine',            // Tinglish alias for stapler
  'chart paper entha',      // Telugu "how much"
  'rubber',
  'spaceship'               // no match -> graceful fallback
];

(async () => {
  const [cat, status] = await Promise.all([
    fetch(`${DB}/catalog.json`).then(r => r.json()),
    fetch(`${DB}/shopStatus.json`).then(r => r.json())
  ]);
  const catalog = toArray(cat);
  console.log(`Loaded ${catalog.length} catalog items. Shop status: ${status && status.isOpen ? 'OPEN' : 'closed'}\n`);

  const queries = process.argv.slice(2).length ? [process.argv.slice(2).join(' ')] : DEMO;
  for (const q of queries) {
    console.log('🧑  ' + q);
    console.log('🤖  ' + handleMessage(catalog, q, status).replace(/\n/g, '\n    '));
    console.log('');
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
