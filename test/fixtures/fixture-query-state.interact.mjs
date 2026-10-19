// Companion interaction script for fixture-query-state.html.

export const states = {
  'filter-red': async (page) => {
    await page.click('#red');
    await page.waitForFunction(() => location.search === '?color=red');
  },
};
