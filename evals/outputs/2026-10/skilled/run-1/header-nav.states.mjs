export const states = {
  'search-open': async (page) => {
    await page.getByRole('button', { name: 'Search' }).click();
  },
  'drawer-open': async (page) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.getByRole('button', { name: 'Menu' }).click();
  },
};
