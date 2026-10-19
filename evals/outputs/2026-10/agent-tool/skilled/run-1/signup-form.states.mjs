export const states = {
  'signup-form-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
  'signup-form-success': async (page) => {
    await page.getByLabel('Name (required)').fill('Ada Lovelace');
    await page.getByLabel('Email address (required)').fill('ada@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
};
