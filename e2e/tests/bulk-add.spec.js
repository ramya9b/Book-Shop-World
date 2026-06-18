// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/');

/* Catalog admin: single form + item list. Tests the pure/DOM pieces that need
   no Firebase auth (functions are global; #svlbkList / form exist in the markup). */
test.describe('catalog admin — form + bulk drafts', () => {
  test('paste list parses one row per line', async ({ page }) => {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.svlbkParseList === 'function', null, { timeout: 20000 });
    const rows = await page.evaluate(() =>
      window.svlbkParseList('Blue Pen, 10, 50, Pentonic\nA4 Paper, 320, 12, JK\n\n   \nGel Pen'));
    expect(rows.length).toBe(3);                 // blanks skipped
    expect(rows[0]).toMatchObject({ name: 'Blue Pen', price_inr: 10, qty: 50, brand: 'Pentonic' });
    expect(rows[2]).toMatchObject({ name: 'Gel Pen', price_inr: '', qty: null });
  });

  test('bulk drafts appear as unsaved rows in the list', async ({ page }) => {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.svlbkAddDraft === 'function', null, { timeout: 20000 });
    const out = await page.evaluate(() => {
      window.svlbkCat = [];
      window.svlbkAddDraft({ name: 'Item A', price_inr: 5, qty: 3 });
      window.svlbkAddDraft({ image: 'data:image/jpeg;base64,xx', name: '' });
      window.svlbkSortCat(); window.svlbkRenderList();
      return {
        total: document.querySelectorAll('#svlbkList .svlbk-lrow').length,
        unsaved: document.querySelectorAll('#svlbkList .svlbk-lrow.unsaved').length,
        saveAllVisible: document.getElementById('svlbkSaveAllBtn').style.display !== 'none',
      };
    });
    expect(out.total).toBe(2);
    expect(out.unsaved).toBe(2);
    expect(out.saveAllVisible).toBe(true);
  });

  test('typing the name auto-fills the ID in the form', async ({ page }) => {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.svlbkWireForm === 'function', null, { timeout: 20000 });
    const id = await page.evaluate(() => {
      window.svlbkWireForm();
      window.svlbkClearForm();
      const name = document.getElementById('svlbkfName');
      name.value = 'A4 Copy Paper!';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      return document.getElementById('svlbkfId').value;
    });
    expect(id).toBe('a4_copy_paper');
  });

  test('editing an item then clearing resets the form', async ({ page }) => {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.svlbkFillForm === 'function', null, { timeout: 20000 });
    const out = await page.evaluate(() => {
      window.svlbkWireForm();
      window.svlbkFillForm({ name: 'Blue Pen', brand: 'Pentonic', price_inr: 10, qty: 50, id: 'blue_pen', aliases: ['neeli pen'] });
      const filled = document.getElementById('svlbkfName').value + '|' + document.getElementById('svlbkfBrand').value;
      window.svlbkClearForm();
      const cleared = document.getElementById('svlbkfName').value + document.getElementById('svlbkfId').value;
      return { filled, cleared };
    });
    expect(out.filled).toBe('Blue Pen|Pentonic');
    expect(out.cleared).toBe('');
  });
});
