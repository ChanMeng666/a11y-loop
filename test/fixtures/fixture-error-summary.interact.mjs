// Companion interaction script for fixture-error-summary.html. From the PR #39
// review repros. Neither state may produce a status-message-not-announced row.

export const states = {
  // GOV.UK pattern: the error summary receives focus, each inline error is
  // linked from its own field with aria-describedby.
  'govuk-summary': async (page) => {
    await page.click('#go');
    await page.waitForSelector('#summary:not([hidden])');
  },
  // Focus moves to the first invalid field; the second error is linked from
  // its own field, which does not have focus.
  'focus-first-invalid': async (page) => {
    await page.evaluate(() => {
      document.body.dataset.mode = 'first';
    });
    await page.click('#go');
    await page.waitForSelector('#pw-err:not([hidden])');
  },
  // A bad address, then Tab: the error appears linked from its own field while
  // focus is on the next one, and nothing was clicked.
  'blur-validation': async (page) => {
    await page.fill('#email', 'name.example.com');
    await page.press('#email', 'Tab');
    await page.waitForSelector('#email-err:not([hidden])');
  },
};
