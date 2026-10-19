export const states = {
  'signup-form-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
};
