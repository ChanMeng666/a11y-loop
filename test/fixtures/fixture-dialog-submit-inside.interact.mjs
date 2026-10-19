// Companion interaction script for fixture-dialog-submit-inside.html.
//
// Both states end with a click on the dialog's OWN Submit button, which is the
// shape that made a11y-loop 0.3.x misattribute the dialog's trigger. Neither may
// produce a dialog-focus-not-returned row: the dialog returns focus to its real
// opener, "Subscribe", every time it closes.

export const states = {
  // The 2026-10 benchmark's newsletter-modal error state: the dialog stays open
  // with a validation error, and the Escape probe then closes it.
  'submit-invalid': async (page) => {
    await page.click('#openSub');
    await page.waitForSelector('#subDialog[open]');
    await page.click('#submitSub');
    await page.waitForFunction(() => document.getElementById('subError').textContent.length > 0);
  },
  // The state's own action closes the dialog.
  'submit-valid': async (page) => {
    await page.click('#openSub');
    await page.waitForSelector('#subDialog[open]');
    await page.fill('#subEmail', 'name@example.com');
    await page.click('#submitSub');
    await page.waitForSelector('#subDialog:not([open])', { state: 'attached' });
  },
};
