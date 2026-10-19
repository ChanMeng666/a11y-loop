// Written by the benchmark operator, not the generating agent (baseline agents
// never audited). Same guard-on-visibility shape as the 2026-07 baseline script:
// the menu button only renders below 720px, so the drawer state is a real
// interaction on the 320px reflow pass and a no-op elsewhere.
export const states = {
  'search-open': async (page) => {
    const b = page.getByRole('button', { name: 'Search' });
    if (await b.isVisible()) await b.click();
  },
  'mobile-drawer-open': async (page) => {
    const b = page.locator('button[aria-controls="drawer"]').first();
    if (await b.isVisible()) await b.click();
  },
};
