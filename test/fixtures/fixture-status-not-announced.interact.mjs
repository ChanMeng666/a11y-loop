// Companion interaction script for fixture-status-not-announced.html.

export const states = {
  saved: async (page) => {
    await page.click('#save');
    await page.waitForSelector('#profile p');
  },
};
