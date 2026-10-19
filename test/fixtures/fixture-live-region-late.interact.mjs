// Companion interaction script for fixture-live-region-late.html.

export const states = {
  'added-to-cart': async (page) => {
    await page.click('#addToCart');
    await page.waitForSelector('#product [role="status"]');
  },
};
