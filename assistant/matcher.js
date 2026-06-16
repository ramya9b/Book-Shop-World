'use strict';
/* ──────────────────────────────────────────────────────────────────────────
   SVLB WhatsApp assistant — catalog matcher (the "brain").
   Pure & dependency-free: runs in Node, a Vercel function, a Worker, or browser.

   It matches a free-text customer message (English / Telugu / Kannada / Hindi /
   Tinglish / misspellings) to catalog items using item.aliases, then composes a
   short WhatsApp reply with price + availability.

   Catalog item shape:
     { id, name, aliases[], price_inr, in_stock, category, unit }
   ────────────────────────────────────────────────────────────────────────── */

/* Lowercase, NFKC-normalize, strip punctuation (keeps Telugu/Kannada letters),
   collapse whitespace. */
function normalize(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[‘’“”]/g, "'")
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')   // keep \p{M} so Telugu/Kannada combining marks survive
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensOf(s) { return normalize(s).split(' ').filter(Boolean); }

/* Capped Levenshtein distance — for catching misspellings ("staplr" -> "stapler"). */
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/* All searchable phrases for an item: name, id (underscores -> spaces), aliases. */
function phrasesFor(item) {
  const list = [
    item.name,
    item.brand || '',
    item.brand ? (item.brand + ' ' + item.name) : '',
    item.id ? String(item.id).replace(/_/g, ' ') : ''
  ].concat(item.aliases || []);
  return list.map(normalize).filter(Boolean);
}

/* Score how well a query matches one item (0 = no match). */
function scoreItem(queryNorm, qTokens, item) {
  let best = 0;
  for (const p of phrasesFor(item)) {
    if (!p) continue;
    if (p === queryNorm) { best = Math.max(best, 100); continue; }                 // exact
    // substring — but only on needles >=3 chars, so "hi" can't match "highlighter"
    if ((p.length >= 3 && queryNorm.includes(p)) || (queryNorm.length >= 3 && p.includes(queryNorm))) {
      best = Math.max(best, 80 + Math.min(15, p.length / 3)); continue;
    }
    const pt = p.split(' ');
    const overlap = pt.filter(t => qTokens.indexOf(t) !== -1).length;              // token overlap
    if (overlap) best = Math.max(best, 40 + overlap * 15);
    for (const qt of qTokens) {                                                    // fuzzy (misspellings)
      if (qt.length >= 3 && p.length >= 3) {
        const d = lev(qt, p);
        const tol = Math.max(1, Math.floor(Math.max(qt.length, p.length) * 0.25));
        if (d <= tol) best = Math.max(best, 55 - d * 5);
      }
    }
  }
  return best;
}

/* Rank catalog items for a query. Returns [{ item, score }] sorted desc. */
function search(catalog, query, limit) {
  limit = limit || 4;
  const qn = normalize(query);
  const qt = qn.split(' ').filter(Boolean);
  return (catalog || [])
    .map(it => ({ item: it, score: scoreItem(qn, qt, it) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* What does the customer want? */
function detectIntent(query) {
  const q = normalize(query);
  const qty = q.match(/\b(\d{1,4})\b/);
  if (/\b(available|stock|unda|unnaya|unda|sigutta|sigutha|hai|haina|in stock)\b/.test(q) ||
      /ఉంద|లభ్|ಸಿಗು|ಲಭ್|ಇದೆ/.test(query)) return 'availability';
  if (/\b(price|rate|cost|how much|charge|entha|yenta|eshtu|kitna|kitne)\b/.test(q) ||
      /ఎంత|ధర|ಎಷ್ಟು|ಬೆಲೆ/.test(query)) return 'price';
  if (qty) return { kind: 'order', qty: parseInt(qty[1], 10) };
  return 'info';
}

function rupees(n) { return '₹' + (typeof n === 'number' ? n : (n || 0)); }
function perUnit(item) { return item.unit ? (' per ' + item.unit) : ''; }

/* Compose the reply for a single confidently-matched item. */
function replyForItem(item, intent) {
  const name = (item.name || item.id) + (item.brand ? ` (${item.brand})` : '');
  const inStock = item.in_stock !== false;
  const hasQty = typeof item.qty === 'number';
  const stockNote = hasQty ? `${item.qty} in stock` : (inStock ? 'in stock' : 'out of stock');

  if (typeof intent === 'object' && intent.kind === 'order') {
    if (!inStock) return `Sorry, *${name}* is out of stock right now. We'll restock soon — anything else?`;
    if (hasQty && intent.qty > item.qty) {
      const t2 = (typeof item.price_inr === 'number') ? item.price_inr * item.qty : null;
      return `We only have *${item.qty}* ${name} right now` +
        (t2 != null ? ` (${rupees(item.price_inr)}${perUnit(item)} each = *${rupees(t2)}*)` : '') +
        `. Shall I keep those for you? Reply *yes*. 🙏`;
    }
    const total = (typeof item.price_inr === 'number') ? item.price_inr * intent.qty : null;
    const line = `${intent.qty} × *${name}* (${rupees(item.price_inr)}${perUnit(item)})`;
    return total != null
      ? `${line} = *${rupees(total)}*.\nReply *yes* to confirm and we'll keep it ready for pickup. 🙏`
      : `${line}. Reply *yes* to confirm. 🙏`;
  }
  if (intent === 'availability') {
    return inStock
      ? `✅ Yes, *${name}* is available — ${rupees(item.price_inr)}${perUnit(item)} · ${stockNote}.`
      : `❌ Sorry, *${name}* is out of stock right now. We'll restock soon.`;
  }
  if (intent === 'price') {
    return `*${name}* — ${rupees(item.price_inr)}${perUnit(item)}.` +
      (hasQty ? ` (${item.qty} in stock)` : (inStock ? '' : ' (currently out of stock)'));
  }
  // info
  return `*${name}* — ${rupees(item.price_inr)}${perUnit(item)} · ${hasQty ? (item.qty + ' in stock ✅') : (inStock ? 'in stock ✅' : 'out of stock ❌')}.`;
}

/* Top-level: take the catalog + the customer's text (+ optional shopStatus),
   return the reply string to send back on WhatsApp. */
function handleMessage(catalog, text, status) {
  // Whole message is just a greeting (anchored end) -> greet, don't search.
  const greetingOnly = /^(hi+|hey+|hello|namaste|namaskara|namaskaram|namaskar|వందనం|నమస్తే|నమస్కారం|ನಮಸ್ಕಾರ)[\s!.,]*$/i.test((text || '').trim());
  const matches = search(catalog, text, 4);
  const intent = detectIntent(text);

  let body;
  if (greetingOnly) {
    body = 'Namaste 🙏 Welcome to *Sri Vara Lakshmi Balaji Enterprises*. Tell me an item — e.g. "blue pen", "A4 paper price", or "is glue stick available?" — and I\'ll check stock and price for you.';
  } else if (!matches.length) {
    body = `I couldn't find that in our list. You can ask for things like pens, A4 paper, notebooks, stapler, files or glue. Or WhatsApp us directly and we'll help. 🙏`;
  } else {
    const top = matches[0];
    const clearWinner = matches.length === 1 || (top.score - matches[1].score) >= 20;
    if (clearWinner && top.score >= 45) {
      body = replyForItem(top.item, intent);
    } else {
      const opts = matches
        .filter(m => m.score >= Math.max(40, top.score - 25))
        .slice(0, 4)
        .map(m => `• *${m.item.name}* — ${rupees(m.item.price_inr)}${perUnit(m.item)}${m.item.in_stock === false ? ' (out of stock)' : ''}`)
        .join('\n');
      body = `We have a few that match:\n${opts}\nWhich one would you like?`;
    }
  }

  if (status && status.isOpen === false) {
    body += `\n\nℹ️ The shop is *closed* right now${status.note ? ' — ' + status.note : ''}. You can still order and pick up when we reopen.`;
  }
  return body;
}

/* Convert a Firebase RTDB `catalog` object (keyed by id) into an array. */
function toArray(catalogObj) {
  if (Array.isArray(catalogObj)) return catalogObj.filter(Boolean);
  if (!catalogObj || typeof catalogObj !== 'object') return [];
  return Object.keys(catalogObj).map(id => {
    const it = catalogObj[id] || {};
    return Object.assign({ id: id }, it);
  });
}

module.exports = { normalize, search, detectIntent, replyForItem, handleMessage, toArray };
