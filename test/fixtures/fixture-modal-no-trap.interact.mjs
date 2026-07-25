// Companion interaction script for fixture-modal-no-trap.html.
//
// On load the dialog is display:none and absent from the accessibility tree,
// so an audit that only runs on page load reports a clean page. Every finding
// for this fixture exists only once the dialog has been opened. This module
// drives that state so a11y-loop (or an integration test) can audit it.
//
// See the "interact" block for this fixture in manifest.json for the expected
// findings once the "modal-open" state has been reached.

export const states = {
  'modal-open': async (page) => {
    await page.click('#openDialog');
    await page.waitForSelector('#fakeDialog.open');
  },
};
