// Written by the benchmark operator, not the generating agent. The error state
// submits via requestSubmit() rather than clicking the in-dialog submit button:
// a11y-loop 0.3.2 takes the last clicked element as the dialog's trigger, so a
// click inside the open dialog yields a spurious dialog-focus-not-returned.
// Same driver shape the skilled agents in runs 2 and 3 used.
export const states = {
  'subscribe-dialog-open': async (page) => {
    await page.locator('#open').click();
  },
  'subscribe-dialog-error': async (page) => {
    await page.locator('#open').click();
    await page.locator('dialog input[type="email"]').fill('not-an-email');
    await page.locator('dialog form').evaluate((f) => f.requestSubmit());
  },
};
