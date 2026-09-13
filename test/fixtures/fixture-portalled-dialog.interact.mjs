// Companion interaction script for fixture-portalled-dialog.html.
//
// On load there is no dialog in the document at all, so an audit that only runs
// on page load has nothing to say about it. The whole point of this fixture —
// a correct portalled dialog that a11y-loop must NOT report as broken — exists
// only once the menu has been opened.
//
// See the "portalled-dialog" entry in manifest.json for what may and may not
// fire in this state.

export const states = {
  'menu-open': async (page) => {
    await page.click('#openMenu');
    await page.waitForSelector('[data-portal] [role="dialog"]');
  },
};
