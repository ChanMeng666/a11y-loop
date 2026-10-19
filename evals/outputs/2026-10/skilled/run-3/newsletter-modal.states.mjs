export const states = {
  'dialog-open': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').waitFor();
  },
  'dialog-validation-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const field = dialog.getByLabel('Email address');
    await field.fill('not-an-email');
    await field.press('Enter');
    await dialog.getByText('Enter a valid email address').waitFor();
  },
};
