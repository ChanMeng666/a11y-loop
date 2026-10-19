export const states = {
  'validation-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
};
