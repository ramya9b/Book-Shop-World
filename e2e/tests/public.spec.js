// Browser E2E — public/read-only suites. Safe against production (no writes).
const { test, expect } = require('@playwright/test');

test.describe('S1 — i18n (EN/TE/KN)', () => {
  test('switches language, updates <html lang> + aria-pressed', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#lbTE').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'te');
    await expect(page.locator('#lbTE')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#lbEN')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#lbKN').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'kn');
    await page.locator('#lbEN').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('language persists across reload', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#lbTE').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'te');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'te');
  });
});

test.describe('S2 — WhatsApp ordering', () => {
  test('shop WhatsApp links use the correct number', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await page.locator('a[href*="wa.me/919945411489"]').count()).toBeGreaterThan(0);
  });

  test('cart -> "Order via WhatsApp" opens wa.me with a total', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#homeFeaturedGrid .add-btn').first().click();
    await page.locator('.cart-btn').first().click();
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /order via whatsapp/i }).click(),
    ]);
    // wa.me redirects to api.whatsapp.com/send — assert the number + order text, not the host.
    expect(popup.url()).toContain('919945411489');
    expect(decodeURIComponent(popup.url())).toMatch(/Total/i);
  });
});

test.describe('S3 — shop status badge', () => {
  test('badge renders a state (open/closed/soon)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const badge = page.locator('#hoursBadge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/open|closed|soon/);
  });
});

test.describe('S4/S5 — PWA + SEO', () => {
  test('manifest is valid and green-themed', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.ok()).toBeTruthy();
    const m = await res.json();
    expect(m.theme_color).toBe('#0A7A4E');
    expect(Array.isArray(m.icons) && m.icons.length).toBeTruthy();
  });

  test('key SEO tags present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain('LocalBusiness');
  });

  test('sitemap.xml and robots.txt serve', async ({ request }) => {
    expect((await request.get('/sitemap.xml')).ok()).toBeTruthy();
    expect((await request.get('/robots.txt')).ok()).toBeTruthy();
  });
});

test.describe('S8 — public "In Stock Now"', () => {
  test('lists in-stock items and hides out-of-stock', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#liveStockSection')).toBeVisible({ timeout: 30000 }); // Firebase WS connect
    await expect(page.locator('#liveStockGrid .svlbk-stk-card').first()).toBeVisible();
    await expect(page.locator('#liveStockGrid')).not.toContainText('Glue Stick'); // out of stock
  });
});

test.describe('S13 — accessibility', () => {
  test('language switcher exposes aria', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.lang-sw')).toHaveAttribute('role', 'group');
    await expect(page.locator('#lbEN')).toHaveAttribute('aria-label', /english/i);
  });

  test('every image has alt text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // WCAG: every <img> must HAVE an alt attribute (empty alt is valid for decorative).
    const imgs = page.locator('img');
    const n = await imgs.count();
    for (let i = 0; i < n; i++) {
      expect(await imgs.nth(i).getAttribute('alt'), `img #${i} missing alt`).not.toBeNull();
    }
  });

  test('language button meets ~44px tap target', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const box = await page.locator('#lbEN').boundingBox();
    expect(box && box.height).toBeGreaterThanOrEqual(40);
  });
});

test.describe('S14 — existing routes load with no page errors', () => {
  for (const q of ['?admin=1', '?shopStatus=1', '?cat=lic', '?tool=calc']) {
    test(`/${q}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const res = await page.goto('/' + q, { waitUntil: 'domcontentloaded' });
      expect(res.status()).toBeLessThan(400);
      await page.waitForTimeout(1500);
      expect(errors).toEqual([]);
    });
  }
});
