/**
 * Ambiguous link text (SC 2.4.4 Link Purpose (In Context), Level A).
 *
 * Cheap heuristic, deliberately narrow. "Read more" IS allowed by SC 2.4.4 when
 * the surrounding context makes the destination clear, and only a human can say
 * whether it does — so every finding here is needs-review, never a violation.
 * The phrase list is kept short on purpose: a broad list produces noise, and
 * noise is what makes agents ignore reports.
 */

import { makeFinding, SEVERITY } from '../finding.js';

/** Exact accessible names treated as uninformative on their own. */
export const AMBIGUOUS_PHRASES = ['click here', 'read more', 'learn more', 'here', 'more'];

/**
 * Normalise an accessible name for comparison: lowercase, strip surrounding
 * punctuation and trailing chevrons/arrows, collapse whitespace.
 */
export function normalizeLinkText(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[→⇒›»>]+/g, ' ')
    .replace(/[.!?:,;…]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @returns {boolean} */
export function isAmbiguousLinkText(text) {
  return AMBIGUOUS_PHRASES.includes(normalizeLinkText(text));
}

/**
 * @param {Array<{selector:string, html:string, name:string, context?:string}>} links
 * @param {{passes:string[], state:string|null}} ctx
 */
export function linkTextFindings(links = [], ctx) {
  const { passes = [], state = null } = ctx ?? {};
  return links
    .filter((link) => isAmbiguousLinkText(link.name))
    .map((link) =>
      makeFinding({
        ruleId: 'ambiguous-link-text',
        source: 'a11y-loop',
        severity: SEVERITY.NEEDS_REVIEW,
        impact: 'moderate',
        sc: '2.4.4',
        selector: link.selector,
        html: link.html,
        message:
          `Link text is "${link.name.trim()}", which does not describe the destination. ` +
          'SC 2.4.4 allows this when the surrounding context supplies the purpose, and only a ' +
          'human can judge that — so confirm the context, or name the destination in the link ' +
          '(e.g. "Read more about the speaker line-up").',
        passes,
        state,
        data: { name: link.name.trim(), context: link.context ?? null },
      }),
    );
}

/**
 * Collect visible links and their accessible names.
 * @param {import('playwright').Page} page
 */
export async function surveyLinks(page) {
  return page.evaluate(() => {
    const helpers = window.__a11yLoop;
    return Array.from(document.querySelectorAll('a[href], [role="link"]'))
      .filter((el) => helpers.isVisible(el))
      .map((el) => ({
        selector: helpers.cssPath(el),
        html: helpers.shortHtml(el),
        name: helpers.accessibleName(el),
        context: (el.closest('li, p, td, h1, h2, h3, h4, section')?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120),
      }));
  });
}
