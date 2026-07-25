// --interact states for demo/before — the state-coverage showcase (VIOLATIONS.md
// B11). On load the registration dialog is display:none and absent from the
// accessibility tree; every dialog-related finding, and several instances of
// other classes that live only inside the dialog (B3, B7, B12, B15), exist only
// once this state has been reached.
export const states = {
  'dialog-open': async (page) => {
    await page.evaluate(() => window.openRegister());
    await page.waitForSelector('#registerModal.open');
  },
};
