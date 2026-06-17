// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/');

/* Bulk photo add + ID auto-fill — drives the real admin functions directly
   (no Firebase auth needed; the functions are global and #svlbkItems exists). */
test.describe('bulk stock entry', () => {
  test('many photos -> one card each, with image filled', async ({ page }) => {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.svlbkAddCard === 'function', null, { timeout: 20000 });

    const result = await page.evaluate(() => {
      const items = document.getElementById('svlbkItems');
      items.innerHTML = '';
      const px = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='; // dummy data-URL
      for (let i = 0; i < 5; i++) window.svlbkAddCard({ image: px });
      const cards = items.querySelectorAll('.svlbk-card, .svlbk-item, [class*="svlbk"]');
      const imgs = Array.from(items.querySelectorAll('img')).filter(im => (im.getAttribute('src') || '').startsWith('data:image'));
      const visible = imgs.filter(im => im.style.display !== 'none');
      return { cardCount: items.children.length, withImage: visible.length };
    });

    expect(result.cardCount).toBe(5);
    expect(result.withImage).toBe(5);
  });

  test('typing the name auto-fills the ID for a new card', async ({ page }) => {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.svlbkAddCard === 'function', null, { timeout: 20000 });

    const id = await page.evaluate(() => {
      const items = document.getElementById('svlbkItems');
      items.innerHTML = '';
      window.svlbkAddCard({});
      const card = items.lastElementChild;
      const inputs = card.querySelectorAll('input[type="text"], input:not([type])');
      // first text input is Name; find the ID input by placeholder
      const name = Array.from(card.querySelectorAll('input')).find(i => i.placeholder === 'Blue Pen');
      const idIn = Array.from(card.querySelectorAll('input')).find(i => i.placeholder === 'a4_paper');
      name.value = 'A4 Copy Paper!';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      return idIn.value;
    });

    expect(id).toBe('a4_copy_paper');
  });

  test('paste-a-list creates one card per line with parsed fields', async ({ page }) => {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.svlbkAddCard === 'function', null, { timeout: 20000 });

    const out = await page.evaluate(() => {
      const items = document.getElementById('svlbkItems');
      items.innerHTML = '';
      const text = 'Blue Pen, 10, 50, Pentonic\nA4 Paper, 320, 12, JK\nStapler, 85, 8\n\n   \nGel Pen';
      const rows = window.svlbkParseList(text);
      rows.forEach(r => window.svlbkAddCard(r));
      const first = items.firstElementChild;
      const val = ph => { const i = Array.from(first.querySelectorAll('input')).find(x => x.placeholder === ph); return i ? i.value : null; };
      return {
        rowCount: rows.length,
        cardCount: items.children.length,
        firstName: val('Blue Pen'),
        firstPrice: val('0'),
        firstId: val('a4_paper'),
        firstBrand: val('e.g. Pentonic, Navneet'),
      };
    });

    expect(out.rowCount).toBe(4);          // 3 full lines + "Gel Pen"; blanks skipped
    expect(out.cardCount).toBe(4);
    expect(out.firstName).toBe('Blue Pen');
    expect(out.firstPrice).toBe('10');
    expect(out.firstBrand).toBe('Pentonic');
    expect(out.firstId).toBe('blue_pen');  // auto-filled from name
  });
});
