/**
 * Clickable non-interactive elements with no keyboard path (SC 2.1.1, Level A).
 *
 * The archetypal AI-codegen failure: a <div> or <span> styled and wired to act
 * like a button (an onclick handler, cursor: pointer) but with no role, no
 * tabindex, and no keydown handling. No axe rule fires on this — nothing about
 * the markup is invalid, the element is simply unreachable by keyboard.
 *
 * Detected via the `onclick` IDL property rather than by firing a synthetic
 * click, so running this check never triggers page side effects (navigation,
 * form submission, a payment flow, ...). This catches both the inline
 * `onclick="..."` attribute and `el.onclick = fn` assignment, which covers the
 * two patterns seen in the fixtures and the demo. It does not catch handlers
 * added with `addEventListener('click', ...)` — a known, documented gap.
 *
 * Deliberately narrow: an element that already carries a `role` or a
 * `tabindex` is a different, already-covered failure (positive-tabindex,
 * keyboard-unreachable, or role-button-keyboard-activation); flagging it again
 * here would double-count the same defect under a second rule id.
 */

import { makeFinding, SEVERITY } from '../finding.js';

/** Native elements that are already keyboard-operable; never flagged here. */
const NATIVELY_INTERACTIVE = [
  'A',
  'BUTTON',
  'INPUT',
  'SELECT',
  'TEXTAREA',
  'SUMMARY',
  'OPTION',
  'LABEL',
];

/**
 * @param {Array<{selector:string, html:string, tag:string, name:string}>} elements
 * @param {{passes:string[], state:string|null}} ctx
 */
export function divButtonFindings(elements = [], ctx) {
  const { passes = [], state = null } = ctx ?? {};
  return elements.map((el) =>
    makeFinding({
      ruleId: 'div-button',
      source: 'a11y-loop',
      severity: SEVERITY.VIOLATION,
      impact: 'critical',
      sc: '2.1.1',
      selector: el.selector,
      html: el.html,
      message:
        `This <${String(el.tag ?? '').toLowerCase()}> has a click handler but no role, no ` +
        'tabindex, and no keyboard handler. It is not reachable by Tab and does not respond to ' +
        'Enter or Space, so keyboard and screen-reader users cannot activate it. Use a real ' +
        '<button> (or <a href> for navigation), or add role="button", tabindex="0", and keydown ' +
        'handling for both Enter and Space.',
      passes,
      state,
      data: { tag: el.tag, name: el.name },
    }),
  );
}

/**
 * Survey the page for clickable elements with no keyboard path.
 * @param {import('playwright').Page} page
 */
export async function surveyClickableNonInteractive(page) {
  return page.evaluate((nativeTags) => {
    const helpers = window.__a11yLoop;
    const results = [];
    for (const el of document.querySelectorAll('*')) {
      if (nativeTags.includes(el.tagName)) continue;
      if (el.hasAttribute('role')) continue;
      if (el.hasAttribute('tabindex')) continue;
      if (typeof el.onclick !== 'function') continue;
      if (!helpers.isVisible(el)) continue;
      results.push({
        selector: helpers.cssPath(el),
        html: helpers.shortHtml(el),
        tag: el.tagName,
        name: helpers.accessibleName(el),
      });
    }
    return results;
  }, NATIVELY_INTERACTIVE);
}
