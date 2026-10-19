// Companion interaction script for fixture-route-shadow-announcer.html. From the
// PR #39 review repros. Neither state may produce a route-change-focus-lost row.

export const states = {
  'shadow-announcer': async (page) => {
    await page.click('a[href="/orders/1042"]');
    await page.waitForFunction(() => location.pathname === '/orders/1042');
  },
  'focus-after-fetch': async (page) => {
    await page.evaluate(() => {
      document.body.dataset.mode = 'late';
    });
    await page.click('a[href="/orders/1042"]');
    await page.waitForFunction(() => location.pathname === '/orders/1042');
  },
};
