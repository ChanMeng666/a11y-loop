export const states = {
  'search-open': async (page) => {
    await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  },
  'drawer-open': async (page) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.getByRole('button', { name: 'Menu' }).click();
  },
};
