// Companion interaction script for fixture-dialog-sequences.html. From the
// PR #39 review repros. No state may produce a dialog-focus-not-returned row.

export const states = {
  // Save closes the dialog and focus goes back to its opener; then the state
  // clicks plain text, and Chromium moves focus to <body>. That second move is
  // the state's doing, not the dialog's.
  'submit-then-click-text': async (page) => {
    await page.click('#openA');
    await page.click('#saveA');
    await page.click('#note');
  },
  // Opened and submitted from the keyboard.
  'keyboard-open': async (page) => {
    await page.focus('#openA');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#dA[open]');
    await page.focus('#saveA');
    await page.keyboard.press(' ');
  },
  // Two dialogs in a row, each returning focus to its own opener.
  'two-in-a-row': async (page) => {
    await page.click('#openA');
    await page.click('#saveA');
    await page.click('#openB');
    await page.click('#saveB');
  },
  // The opener is removed with its row and focus goes to the list heading.
  'delete-row': async (page) => {
    await page.click('.del[data-row="r1"]');
    await page.click('#confirmC');
  },
  // Focus is restored 300 ms after the close, inside the settle window.
  'late-return': async (page) => {
    await page.click('#openD');
    await page.click('#saveD');
  },
};
