// @ts-check
const { test, expect } = require('@playwright/test');

/* Live admin catalog render: loads the public catalog into the in-memory list
   and asserts one unique row per item (guards against the duplicate-render bug). */
test('admin catalog loads unique items into the list (no dupes)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.fbDatabase && typeof window.svlbkLoadCatalog === 'function', null, { timeout: 25000 });

  const out = await page.evaluate(async () => {
    window.svlbkLoadCatalog();
    await new Promise(r => setTimeout(r, 4000));
    const ids = (window.svlbkCat || []).map(i => i.id);
    return {
      memCount: ids.length,
      uniqueIds: new Set(ids).size,
      rows: document.querySelectorAll('#svlbkList .svlbk-lrow').length,
    };
  });

  console.log('ADMIN RENDER:', JSON.stringify(out));
  expect(out.memCount).toBeGreaterThan(0);
  expect(out.memCount).toBe(out.uniqueIds);  // no duplicate ids in memory
  expect(out.rows).toBe(out.memCount);       // one row per item, no repeats
});
