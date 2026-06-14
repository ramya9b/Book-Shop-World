// Browser E2E — owner admin. Auth + client-side validation only.
// Real add/edit/delete against the LIVE database is intentionally NOT automated here
// (it would mutate the live shop). Validation tests below never reach a write.
//
// Run with credentials:  OWNER_PASSWORD=... npx playwright test admin
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.OWNER_EMAIL || 'srrgkenterprises@gmail.com';
const PASS = process.env.OWNER_PASSWORD;

async function login(page) {
  await page.goto('/?admin=stock', { waitUntil: 'domcontentloaded' });
  await page.locator('#svlbkEmail').fill(EMAIL);
  await page.locator('#svlbkPass').fill(PASS);
  await page.locator('#svlbkLoginBtn').click();
  await expect(page.locator('#svlbkPanel')).toBeVisible({ timeout: 15000 });
}

test.describe('S6 — admin authentication', () => {
  test('overlay opens with a login form', async ({ page }) => {
    await page.goto('/?admin=stock', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#svlbkAdmin')).toBeVisible();
    await expect(page.locator('#svlbkEmail')).toBeVisible();
    await expect(page.locator('#svlbkPass')).toBeVisible();
  });

  test('empty credentials shows a prompt', async ({ page }) => {
    await page.goto('/?admin=stock', { waitUntil: 'domcontentloaded' });
    await page.locator('#svlbkLoginBtn').click();
    await expect(page.locator('#svlbkLoginMsg')).toContainText(/enter your email/i);
  });

  test('wrong password is rejected', async ({ page }) => {
    test.skip(!PASS, 'set OWNER_PASSWORD to run');
    await page.goto('/?admin=stock', { waitUntil: 'domcontentloaded' });
    await page.locator('#svlbkEmail').fill(EMAIL);
    await page.locator('#svlbkPass').fill('definitely-wrong-' + Date.now());
    await page.locator('#svlbkLoginBtn').click();
    await expect(page.locator('#svlbkLoginMsg')).toContainText(/wrong email or password|check your email and password/i, { timeout: 15000 });
  });

  test('owner can sign in', async ({ page }) => {
    test.skip(!PASS, 'set OWNER_PASSWORD to run');
    await login(page);
    await expect(page.locator('#svlbkWho')).toContainText(EMAIL);
    await expect(page.locator('#svlbkItems .svlbk-item').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('S7 — catalog validation (no DB writes)', () => {
  test.skip(!PASS, 'set OWNER_PASSWORD to run');

  test('duplicate ids are rejected before saving', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '+ Add item' }).click();
    await page.getByRole('button', { name: '+ Add item' }).click();
    const cards = page.locator('#svlbkItems .svlbk-item');
    const n = await cards.count();
    for (let i = n - 2; i < n; i++) {
      const c = cards.nth(i);
      await c.getByLabel('ID').fill('dup_qa');
      await c.getByLabel('Name').fill('QA Item');
      await c.getByLabel('Price (₹)').fill('1');
    }
    await page.locator('#svlbkSaveCatBtn').click();
    await expect(page.locator('#svlbkCatMsg')).toContainText(/ids must be unique/i);
  });

  test('missing/blank price is rejected', async ({ page }) => {
    // type=number blocks letters at the input, so blank is the reachable invalid case.
    await login(page);
    await page.getByRole('button', { name: '+ Add item' }).click();
    const c = page.locator('#svlbkItems .svlbk-item').last();
    await c.getByLabel('ID').fill('price_qa');
    await c.getByLabel('Name').fill('QA');
    await c.getByLabel('Price (₹)').fill(''); // leave price empty
    await page.locator('#svlbkSaveCatBtn').click();
    await expect(page.locator('#svlbkCatMsg')).toContainText(/numeric price/i);
  });

  test('invalid id format is rejected', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '+ Add item' }).click();
    const c = page.locator('#svlbkItems .svlbk-item').last();
    await c.getByLabel('ID').fill('Bad ID!');
    await c.getByLabel('Name').fill('QA');
    await c.getByLabel('Price (₹)').fill('5');
    await page.locator('#svlbkSaveCatBtn').click();
    await expect(page.locator('#svlbkCatMsg')).toContainText(/lowercase letters, numbers and underscores/i);
  });
});
