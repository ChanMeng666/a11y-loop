export const states = {
  'dialog-open': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').waitFor();
  },
  'dialog-validation-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').waitFor();
    await page.evaluate(() => document.getElementById('f').requestSubmit());
    await page.locator('#email-err').waitFor({ state: 'visible' });
  },
};
