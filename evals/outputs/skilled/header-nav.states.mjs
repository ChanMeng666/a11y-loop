// The hamburger button is only rendered below the 60rem breakpoint (it is
// `display: none` at the 1280px viewport used for the default/dark/
// forced-colors/reduced-motion passes) and the search button is always
// visible. Each state guards on visibility so it is a genuine no-op on the
// passes where the control does not render, and a real interaction on the
// pass where it does (the 320px reflow pass, for the hamburger).
export const states = {
  'search-open': async (page) => {
    const button = page.getByRole('button', { name: 'Search' });
    if (await button.isVisible()) {
      await button.click();
    }
  },
  'mobile-drawer-open': async (page) => {
    const button = page.getByRole('button', { name: 'Open menu' });
    if (await button.isVisible()) {
      await button.click();
    }
  },
};
