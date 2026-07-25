/**
 * Keyboard reachability and tab order (SC 2.1.1, 2.4.3).
 *
 * Two things axe cannot see, because it never presses a key:
 *  1. Positive `tabindex` values — always a defect. They pull elements out of
 *     document order into a separate, brittle tab sequence.
 *  2. The observed tab walk versus the set `tabbable()` says should be
 *     reachable. A mismatch means either something interactive is unreachable
 *     (a real failure) or the order diverges from DOM order (a judgment call
 *     for a human, so: needs review).
 */

import { makeFinding, SEVERITY } from '../finding.js';

/** How many Tab presses to walk before giving up. */
export const MAX_TAB_STEPS = 60;

/**
 * @param {Array<{selector:string, html:string, tabindex:string}>} elements
 * @returns {Array<{selector:string, html:string, tabindex:number}>}
 */
export function findPositiveTabindex(elements) {
  return elements
    .map((el) => ({ ...el, tabindex: Number.parseInt(el.tabindex, 10) }))
    .filter((el) => Number.isFinite(el.tabindex) && el.tabindex > 0);
}

/**
 * Compare what `tabbable()` says is reachable with what actually received focus.
 *
 * @param {{expected:string[], observed:string[]}} walk selectors, in order
 * @returns {{unreachable:string[], unexpected:string[], divergesAt:number|null}}
 */
export function diffTabOrder({ expected = [], observed = [] } = {}) {
  const observedSet = new Set(observed);
  const expectedSet = new Set(expected);

  const unreachable = expected.filter((sel) => !observedSet.has(sel));
  const unexpected = observed.filter((sel) => !expectedSet.has(sel));

  // Compare the order of the elements the two lists agree on.
  const commonExpected = expected.filter((sel) => observedSet.has(sel));
  const commonObserved = observed.filter((sel) => expectedSet.has(sel));
  let divergesAt = null;
  for (let i = 0; i < Math.min(commonExpected.length, commonObserved.length); i++) {
    if (commonExpected[i] !== commonObserved[i]) {
      divergesAt = i;
      break;
    }
  }

  return { unreachable, unexpected, divergesAt };
}

/**
 * Build findings from a completed keyboard survey.
 *
 * @param {object} survey
 * @param {Array} survey.positiveTabindex
 * @param {string[]} survey.expected
 * @param {string[]} survey.observed
 * @param {Array<{selector:string,html:string}>} [survey.expectedDetails]
 * @param {{passes:string[], state:string|null}} ctx
 */
export function keyboardFindings(survey, ctx) {
  const findings = [];
  const { passes = [], state = null } = ctx ?? {};

  for (const el of findPositiveTabindex(survey.positiveTabindex ?? [])) {
    findings.push(
      makeFinding({
        ruleId: 'positive-tabindex',
        source: 'a11y-loop',
        severity: SEVERITY.VIOLATION,
        impact: 'serious',
        sc: '2.4.3',
        selector: el.selector,
        html: el.html,
        message:
          `tabindex="${el.tabindex}" forces this element out of document order into a ` +
          'separate tab sequence. Use tabindex="0" (or no tabindex) and order the DOM instead.',
        passes,
        state,
        data: { tabindex: el.tabindex },
      }),
    );
  }

  const diff = diffTabOrder(survey);
  const detailFor = (selector) =>
    (survey.expectedDetails ?? []).find((d) => d.selector === selector)?.html ?? '';

  for (const selector of diff.unreachable) {
    findings.push(
      makeFinding({
        ruleId: 'keyboard-unreachable',
        source: 'a11y-loop',
        severity: SEVERITY.VIOLATION,
        impact: 'critical',
        sc: '2.1.1',
        selector,
        html: detailFor(selector),
        message:
          'This element should be reachable by keyboard but never received focus during a ' +
          `Tab walk of ${MAX_TAB_STEPS} steps. Check for aria-hidden, display:none on focus, ` +
          'a focus trap earlier in the page, or tabindex="-1".',
        passes,
        state,
      }),
    );
  }

  if (diff.divergesAt !== null) {
    findings.push(
      makeFinding({
        ruleId: 'focus-order-diverges',
        source: 'a11y-loop',
        severity: SEVERITY.NEEDS_REVIEW,
        impact: 'moderate',
        sc: '2.4.3',
        selector: survey.observed?.[diff.divergesAt] ?? 'html',
        html: '',
        message:
          'The observed tab order diverges from DOM order at position ' +
          `${diff.divergesAt + 1}. That is not automatically a failure — whether the order is ` +
          'logical is a human judgment. Confirm the sequence still makes sense.',
        passes,
        state,
        data: { expected: survey.expected, observed: survey.observed },
      }),
    );
  }

  return findings;
}

/**
 * Put the sequential focus navigation starting point at the top of the document.
 *
 * `blur()` alone is not enough: Chromium remembers the blurred element as the
 * starting point, so the next Tab continues from there and the elements BEFORE it
 * are never visited — which looks exactly like an unreachable control. This
 * matters whenever a state setup function has clicked something, which is most of
 * the time. A focused sentinel at the start of the body fixes the origin.
 *
 * @param {import('playwright').Page} page
 */
export async function resetFocusToDocumentStart(page) {
  await page.evaluate(() => {
    document.querySelector('[data-a11y-loop-sentinel]')?.remove();
    const sentinel = document.createElement('span');
    sentinel.tabIndex = 0;
    sentinel.setAttribute('data-a11y-loop-sentinel', '');
    sentinel.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.insertBefore(sentinel, document.body.firstChild);
    sentinel.focus();
  });
}

/** Remove the sentinel so it can never appear in a report or a later pass. */
export async function clearFocusSentinel(page) {
  await page.evaluate(() => document.querySelector('[data-a11y-loop-sentinel]')?.remove());
}

/**
 * Run the keyboard survey in a live page.
 * @param {import('playwright').Page} page
 */
export async function surveyKeyboard(page) {
  const expectedDetails = await page.evaluate(() => {
    const helpers = window.__a11yLoop;
    const nodes = window.tabbable ? window.tabbable.tabbable(document.body) : [];
    return nodes.map((el) => ({
      selector: helpers.cssPath(el),
      html: helpers.shortHtml(el),
    }));
  });

  const positiveTabindex = await page.evaluate(() => {
    const helpers = window.__a11yLoop;
    return Array.from(document.querySelectorAll('[tabindex]'))
      .filter((el) => helpers.isVisible(el))
      .map((el) => ({
        selector: helpers.cssPath(el),
        html: helpers.shortHtml(el),
        tabindex: el.getAttribute('tabindex'),
      }));
  });

  await resetFocusToDocumentStart(page);

  const observed = [];
  const seen = new Set();
  for (let i = 0; i < MAX_TAB_STEPS; i++) {
    await page.keyboard.press('Tab');
    const current = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (el.hasAttribute?.('data-a11y-loop-sentinel')) return null;
      return window.__a11yLoop.cssPath(el);
    });
    if (current === null) break;
    if (seen.has(current)) break; // wrapped around
    seen.add(current);
    observed.push(current);
  }

  await clearFocusSentinel(page);

  return {
    expected: expectedDetails.map((d) => d.selector),
    expectedDetails,
    observed,
    positiveTabindex,
  };
}
