// Companion interaction script for fixture-route-focus-managed.html.

export const states = {
  'open-order': async (page) => {
    await page.click('a[href="/orders/1042"]');
    await page.waitForFunction(() => location.pathname === '/orders/1042');
  },
};
