/* a11y-loop demo — BEFORE behaviour.
 *
 * This is the state-coverage showcase: nothing here is detectable by an
 * axe-on-load scan, because on load the dialog does not exist in the
 * accessibility tree at all. The failures only appear once the dialog is open.
 *
 * Seeded defects (see VIOLATIONS.md B11):
 *   - opened from a clickable <div>, so keyboard users cannot reach it
 *   - no focus moved into the dialog on open
 *   - no focus trap: Tab walks straight out into the page behind
 *   - no Escape handling
 *   - no focus return to the trigger on close
 *   - background content is neither inert nor aria-hidden
 *   - close control is a <div> with an onclick and a "×" glyph
 */

function openRegister() {
  document.getElementById('overlay').classList.add('open');
  document.getElementById('registerModal').classList.add('open');
  // Focus is left wherever it was. Screen reader and keyboard users are
  // stranded outside the dialog they just opened.
}

function closeRegister() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('registerModal').classList.remove('open');
  // Focus is not returned to the trigger.
}

function toggleNav() {
  var nav = document.querySelector('.site-nav');
  // Purely visual toggle: no aria-expanded, no aria-controls, and the button
  // that calls this has no accessible name at all.
  nav.style.display = nav.style.display === 'none' ? 'block' : 'none';
}

// Clicking the backdrop closes it — mouse only, and it is not announced.
document.getElementById('overlay').addEventListener('click', closeRegister);
