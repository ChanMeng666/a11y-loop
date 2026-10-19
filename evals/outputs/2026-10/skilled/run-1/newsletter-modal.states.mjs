export const states = {
  'dialog-open': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
  'dialog-validation-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.evaluate(() => document.getElementById('f').requestSubmit());
  },
};
