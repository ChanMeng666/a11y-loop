// Companion interaction script for fixture-dialog-focus-lost.html.
//
// The state's own action closes the dialog through its Submit button. The
// dialog is removed and focus falls to <body>, so dialog-focus-not-returned
// must be reported even though no Escape probe ever runs.

export const states = {
  'submit-valid': async (page) => {
    await page.click('#openSub');
    await page.waitForSelector('#subDialog');
    await page.fill('#subEmail', 'name@example.com');
    await page.click('#submitSub');
    await page.waitForSelector('#subDialog', { state: 'detached' });
  },
  // Focus is lost, and the state's next click puts it on Help. The close is
  // judged from the snapshot frozen at that click, so it is still reported.
  'submit-then-click': async (page) => {
    await page.click('#openSub');
    await page.waitForSelector('#subDialog');
    await page.fill('#subEmail', 'name@example.com');
    await page.click('#submitSub');
    await page.click('#help');
  },
};
