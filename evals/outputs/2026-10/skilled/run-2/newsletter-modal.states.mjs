export const states = {
  'dialog-open': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
  // validate on change (type an invalid address, Tab away) so the only click is the page's opener button
  'dialog-validation-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').getByLabel('Email address').fill('not-an-email');
    await page.keyboard.press('Tab');
  },
};
