// Companion interaction script for fixture-status-announced.html.
//
// Two states, and neither may produce a status-message row: the confirmation
// goes into a live region that was in the page first, and the disclosed
// paragraph is content the user asked to see. Its text includes "Saved", on
// purpose, so the disclosure exclusion is what keeps it quiet, not the wording.

export const states = {
  saved: async (page) => {
    await page.click('#save');
    await page.waitForFunction(() => document.getElementById('saveStatus').textContent.length > 0);
  },
  'details-expanded': async (page) => {
    await page.click('#detailsToggle');
    await page.waitForSelector('#shipDetails:not([hidden])');
  },
};
