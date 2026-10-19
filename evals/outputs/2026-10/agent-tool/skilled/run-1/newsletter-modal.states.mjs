export const states = {
  'subscribe-dialog-open': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').waitFor();
  },
  // Validation runs on change (blur after editing) so this state is reached
  // without a click inside the dialog.
  'subscribe-dialog-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).first().click();
    await page.getByRole('dialog').waitFor();
    await page.getByLabel('Email address').fill('not-an-email');
    await page.keyboard.press('Tab');
    await page.locator('#email-err').waitFor();
  },
};
