// Companion interaction script for fixture-route-focus-lost.html.
//
// Follows a client-side route: the click is a real click on a real link, and
// the page's router turns it into a pushState plus a view swap.

export const states = {
  'open-order': async (page) => {
    await page.click('a[href="/orders/1042"]');
    await page.waitForFunction(() => location.pathname === '/orders/1042');
  },
};
