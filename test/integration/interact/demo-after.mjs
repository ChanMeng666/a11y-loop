// --interact states for demo/after. Opens the native <dialog> via its real
// trigger button, so the audit also covers the dialog's own contents (labelled
// inputs, a real submit button, descriptive link text) in the open state.
export const states = {
  'dialog-open': async (page) => {
    await page.click('#registerTrigger');
    await page.waitForSelector('#registerDialog[open]');
  },
};
