const { test, expect } = require('@playwright/test');

test.describe('AI Song Samples', () => {
  test('samples section renders with 5 playable songs on the Services page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const section = page.locator('#songSamples');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: /AI Song Samples/i })).toBeVisible();

    // 5 audio players, each with a same-origin mp3 source.
    const players = section.locator('audio');
    await expect(players).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(players.nth(i)).toHaveAttribute('src', /\/media\/songs\/.+\.mp3$/);
    }

    // The Custom AI Songs card links to the samples section.
    await expect(page.locator('a[href="#songSamples"]')).toBeVisible();

    // First player can actually load audio data (metadata) when asked.
    const canLoad = await page.evaluate(async () => {
      const a = document.querySelector('#songSamples audio');
      a.preload = 'metadata';
      a.load();
      return await new Promise((res) => {
        const done = (v) => res(v);
        a.addEventListener('loadedmetadata', () => done(a.duration > 0), { once: true });
        a.addEventListener('error', () => done(false), { once: true });
        setTimeout(() => done(false), 15000);
      });
    });
    expect(canLoad).toBe(true);
  });
});
