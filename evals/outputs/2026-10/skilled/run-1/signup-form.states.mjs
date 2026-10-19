export const states = {
  'signup-form-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
  'signup-form-success': async (page) => {
    await page.getByLabel('Full name').fill('Ada Lovelace');
    await page.getByLabel('Email address').fill('ada@example.com');
    await page.getByLabel('Country or region').selectOption('Canada');
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
};
