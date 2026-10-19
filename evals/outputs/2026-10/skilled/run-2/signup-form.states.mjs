export const states = {
  'form-validation-errors': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
};
