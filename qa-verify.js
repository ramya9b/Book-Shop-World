'use strict';
/* SVLB automated verification suite. Run: node qa-verify.js
 * Covers: matcher (deterministic, local catalog), Firebase data + rules,
 * production HTTP (routes/SEO/PWA/webhook), and source integrity. */
const fs = require('fs');
const { handleMessage, toArray } = require('./assistant/matcher.js');

const DB = 'https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app';
const SITE = 'https://varalaxmibalajienterprises.vercel.app';

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; fails.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
function section(t) { console.log('\n### ' + t); }

(async () => {
  // ───────────────────────── A. MATCHER (deterministic, local catalog) ──────
  section('A. Assistant matcher (local svlb-catalog.json)');
  const catalog = JSON.parse(fs.readFileSync('svlb-catalog.json', 'utf8'));
  const open = { isOpen: true };
  const ans = (q) => handleMessage(catalog, q, open);
  ok('A1 English exact: "blue pen" -> Blue Pen ₹10', /Blue Pen/.test(ans('blue pen')) && /₹10/.test(ans('blue pen')));
  ok('A2 Tinglish: "neeli pen" -> Blue Pen', /Blue Pen/.test(ans('neeli pen')));
  ok('A3 Telugu: "నీలం పెన్" -> Blue Pen', /Blue Pen/.test(ans('నీలం పెన్')));
  ok('A4 Kannada: "ನೀಲಿ ಪెన్" -> Blue Pen', /Blue Pen/.test(ans('ನೀಲಿ ಪెన్')));
  ok('A5 Misspelling: "staplr" -> Stapler', /Stapler/.test(ans('staplr')));
  ok('A6 Alias: "pin machine" -> Stapler', /Stapler/.test(ans('pin machine')));
  ok('A7 Price intent: "A4 paper price" -> ₹320', /A4 Paper Ream/.test(ans('A4 paper price')) && /₹320/.test(ans('A4 paper price')));
  ok('A8 Availability (out of stock): glue stick', /out of stock/i.test(ans('is glue stick available?')));
  ok('A9 Order intent: "i want 5 black pen" -> ₹50', /₹50/.test(ans('i want 5 black pen')));
  ok('A10 Synonym: "rubber" -> Eraser', /Eraser/.test(ans('rubber')));
  ok('A11 Mixed lang: "chart paper entha" -> Chart Paper', /Chart Paper/.test(ans('chart paper entha')));
  ok('A12 Greeting: "hi" -> welcome (no item)', /Welcome/i.test(ans('hi')) && !/₹/.test(ans('hi')));
  ok('A13 No match: "spaceship" -> fallback', /couldn.t find/i.test(ans('spaceship')));
  ok('A14 Disambiguation: "pen" -> multiple options', /few that match/i.test(ans('pen')));
  ok('A15 Closed-shop note appended', /closed/i.test(handleMessage(catalog, 'blue pen', { isOpen: false })));
  ok('A16 Indic marks preserved in normalize', require('./assistant/matcher.js').normalize('నీలం').length >= 3);

  // ───────────────────────── B. FIREBASE DATA + RULES (live) ────────────────
  section('B. Firebase data + security rules (live)');
  const cat = await fetch(`${DB}/catalog.json`).then(r => r.json());
  const arr = toArray(cat);
  ok('B1 Public READ catalog (200, has items)', arr.length >= 15, arr.length + ' items');
  const reqKeys = ['name', 'aliases', 'price_inr', 'in_stock', 'category', 'unit'];
  const schemaOK = arr.every(it => reqKeys.every(k => k in it) && Array.isArray(it.aliases) && typeof it.price_inr === 'number' && typeof it.in_stock === 'boolean');
  ok('B2 Every catalog item matches schema', schemaOK);
  ok('B3 Required item a4_paper present & priced 320', arr.find(i => i.id === 'a4_paper' && i.price_inr === 320));
  ok('B4 glue_stick is out of stock (in_stock=false)', arr.find(i => i.id === 'glue_stick' && i.in_stock === false));
  const statusRes = await fetch(`${DB}/shopStatus.json`);
  ok('B5 Public READ shopStatus (200)', statusRes.status === 200);
  const anonWrite = await fetch(`${DB}/catalog/_qa.json`, { method: 'PUT', body: '{"x":1}' });
  ok('B6 Anonymous WRITE catalog DENIED (401)', anonWrite.status === 401, 'HTTP ' + anonWrite.status);
  const anonStatus = await fetch(`${DB}/shopStatus.json`, { method: 'PUT', body: '{"isOpen":true}' });
  ok('B7 Anonymous WRITE shopStatus DENIED (401)', anonStatus.status === 401, 'HTTP ' + anonStatus.status);

  // ───────────────────────── C. PRODUCTION HTTP (live) ──────────────────────
  section('C. Production site, SEO, PWA, webhook (live)');
  const homeRes = await fetch(`${SITE}/`);
  const home = await homeRes.text();
  ok('C1 Homepage 200', homeRes.status === 200);
  ok('C2 Homepage de-bloated (<700KB)', Buffer.byteLength(home) < 700000, Math.round(Buffer.byteLength(home) / 1024) + 'KB');
  ok('C3 og:image present', /og:image/.test(home));
  ok('C4 JSON-LD LocalBusiness present', /"@type":\s*"LocalBusiness"/.test(home));
  ok('C5 Admin markup served (svlbkAdmin)', /svlbkAdmin/.test(home));
  ok('C6 In-Stock-Now section present', /liveStockSection/.test(home));
  ok('C7 a11y: prefers-reduced-motion present', /prefers-reduced-motion/.test(home));
  ok('C8 a11y: lang buttons have aria-pressed', /aria-pressed/.test(home));
  for (const [path, type] of [['/manifest.json', 'manifest'], ['/sw.js', 'sw'], ['/sitemap.xml', 'sitemap'], ['/robots.txt', 'robots']]) {
    const r = await fetch(`${SITE}${path}`); ok(`C9 asset ${path} -> 200`, r.status === 200, 'HTTP ' + r.status);
  }
  const mani = await fetch(`${SITE}/manifest.json`).then(r => r.json());
  ok('C10 manifest theme_color unified green', mani.theme_color === '#0A7A4E', mani.theme_color);
  const ogimg = await fetch(`${SITE}/shop-collage.jpg`);
  ok('C11 share image 200 + image/jpeg', ogimg.status === 200 && /image\/jpeg/.test(ogimg.headers.get('content-type')));
  const sampleImg = (home.match(/img\/p[0-9a-f]{10}\.jpg/) || [])[0];
  if (sampleImg) { const ir = await fetch(`${SITE}/${sampleImg}`); ok('C12 extracted image serves (200)', ir.status === 200); }
  const wh = await fetch(`${SITE}/api/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`);
  ok('C13 webhook rejects bad verify token (403)', wh.status === 403, 'HTTP ' + wh.status);

  // ───────────────────────── D. SOURCE INTEGRITY ────────────────────────────
  section('D. Source integrity (index.html)');
  const html = fs.readFileSync('index.html', 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  let jsOK = 0, jsTot = 0;
  scripts.forEach(s => { try { JSON.parse(s); return; } catch (e) { } jsTot++; try { new Function(s); jsOK++; } catch (e) { } });
  ok('D1 All inline JS scripts compile', jsOK === jsTot, jsOK + '/' + jsTot);
  const refs = [...new Set([...html.matchAll(/img\/p[0-9a-f]{10}\.jpg/g)].map(m => m[0]))];
  ok('D2 All img/ refs resolve to files', refs.every(r => fs.existsSync(r)), refs.length + ' refs');
  ok('D3 No leftover base64 JPEGs in HTML', !/data:image\/jpeg;base64,/.test(html));
  for (const feat of ['function setLang', 'function orderWA', 'function applyLiveStatus', 'FIREBASE_CONFIG', 'function svlbkLogin']) {
    ok('D4 feature intact: ' + feat, html.includes(feat));
  }

  // ───────────────────────── SUMMARY ───────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (fails.length) { console.log('Failures:'); fails.forEach(f => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SUITE ERROR:', e); process.exit(2); });
