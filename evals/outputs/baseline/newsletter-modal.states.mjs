// The page has two controls named "Subscribe": the button that opens the
// modal and the submit button inside it. Unlike a native <dialog>, this
// modal is a plain div[role="dialog"] that stays in the DOM (hidden only via
// opacity/pointer-events) even while closed, so both buttons are visible to
// Playwright's role query at once — the opener must be selected by ID to
// disambiguate, and the submit button scoped to the dialog role.
export const states = {
  'subscribe-dialog-open': async (page) => {
    await page.locator('#openModalBtn').click();
  },
  'subscribe-dialog-error': async (page) => {
    await page.locator('#openModalBtn').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Subscribe' }).click();
  },
};
