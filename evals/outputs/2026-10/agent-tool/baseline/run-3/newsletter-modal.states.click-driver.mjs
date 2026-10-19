// Written by the benchmark operator, not the generating agent.
export const states = {
  'subscribe-dialog-open': async (page) => {
    await page.locator('#open').click();
  },
  'subscribe-dialog-error': async (page) => {
    await page.locator('#open').click();
    await page.locator('dialog [type="submit"]').click();
  },
};
