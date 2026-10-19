export const states = {
  'newsletter-dialog-open': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').waitFor();
  },
  'newsletter-dialog-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByLabel('Email address').fill('not-an-email');
    await page.evaluate(() => document.getElementById('f').requestSubmit());
  },
};
