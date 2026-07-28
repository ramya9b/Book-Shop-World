const { test, expect } = require('@playwright/test');

test.describe('Two-page nav: Services <-> Books & Stationery', () => {
  test('lands on Services, toggles to Books and back', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Landing = Services (home-view). Both nav buttons present.
    await expect(page.locator('body')).toHaveClass(/home-view/);
    await expect(page.locator('#navServicesBtn')).toBeVisible();
    await expect(page.locator('#navBooksBtn')).toBeVisible();

    // Services landing must NOT show the old catalog teasers.
    await expect(page.locator('#homeCatGrid')).toHaveCount(0);
    await expect(page.locator('#homeFeaturedGrid')).toHaveCount(0);

    // Go to Books & Stationery -> shop-view, catalog products visible.
    await page.locator('#navBooksBtn').click();
    await expect(page.locator('body')).toHaveClass(/shop-view/);
    await expect(page.locator('.pcard').first()).toBeVisible();

    // Back to Services.
    await page.locator('#navServicesBtn').click();
    await expect(page.locator('body')).toHaveClass(/home-view/);
    // New services are on the Services page.
    await expect(page.getByText('Custom AI Songs')).toBeVisible();
    await expect(page.getByText('Browse Books & Stationery').first()).toBeVisible();
  });
});
