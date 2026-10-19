// The page has two controls named "Subscribe": the button that opens the
// dialog and the submit button inside it. Scope the second lookup to the
// dialog so it doesn't collide with the trigger.
export const states = {
  'subscribe-dialog-open': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
  },
  'subscribe-dialog-error': async (page) => {
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Subscribe' }).click();
  },
};
