// Companion interaction script for fixture-dialog-opener-removed.html.

export const states = {
  'delete-row': async (page) => {
    await page.click('.del[data-row="r1"]');
    await page.click('#confirmC');
    await page.waitForSelector('#r1', { state: 'detached' });
  },
};
