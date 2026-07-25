/**
 * Reflow (SC 1.4.10, Level AA) at 320×256.
 *
 * Playwright has no browser zoom API, but it does not need one: SC 1.4.10 says
 * "320 CSS pixels is equivalent to a starting viewport width of 1280 CSS pixels
 * wide at 400% zoom". Setting the viewport to 320×256 IS the 400% zoom test.
 *
 * The criterion excepts content that genuinely needs two-dimensional layout
 * (data tables, maps, diagrams), which is why this reports named overflowing
 * elements for review rather than failing the page outright.
 */

import { makeFinding, SEVERITY } from '../finding.js';

export const REFLOW_VIEWPORT = { width: 320, height: 256 };

/** Elements whose overflow SC 1.4.10 explicitly tolerates. */
const TWO_DIMENSIONAL_TAGS = new Set(['TABLE', 'SVG', 'CANVAS', 'IFRAME', 'VIDEO', 'IMG', 'PRE']);

/**
 * @param {{horizontalScroll:boolean, scrollWidth:number, clientWidth:number, culprits:Array}} result
 * @param {{passes:string[], state:string|null}} ctx
 */
export function reflowFindings(result, ctx) {
  const { passes = [], state = null } = ctx ?? {};
  if (!result?.horizontalScroll) return [];

  const culprits = result.culprits ?? [];
  const excepted = culprits.filter((c) => TWO_DIMENSIONAL_TAGS.has(c.tag));
  const plain = culprits.filter((c) => !TWO_DIMENSIONAL_TAGS.has(c.tag));
  const named = (plain.length ? plain : culprits).slice(0, 5);

  const overflowBy = result.scrollWidth - result.clientWidth;
  const list = named.length
    ? named
        .map((c) => `${c.selector ?? c.tag.toLowerCase()} (extends to ${c.right}px)`)
        .join(', ')
    : 'no single element could be identified';

  const exceptionNote = excepted.length
    ? ` ${excepted.length} of the overflowing element(s) are ` +
      `${[...new Set(excepted.map((c) => c.tag.toLowerCase()))].join('/')}, which SC 1.4.10 ` +
      'excepts when the content genuinely requires two-dimensional layout.'
    : '';

  return [
    makeFinding({
      ruleId: 'reflow-horizontal-scroll',
      source: 'a11y-loop',
      severity: plain.length ? SEVERITY.VIOLATION : SEVERITY.NEEDS_REVIEW,
      impact: 'serious',
      sc: '1.4.10',
      selector: named[0]?.selector ?? 'html',
      html: named[0]?.html ?? '',
      message:
        `At a ${REFLOW_VIEWPORT.width}×${REFLOW_VIEWPORT.height} viewport (equivalent to 400% ` +
        `zoom at 1280px) the page scrolls horizontally by ${overflowBy}px. Overflowing: ` +
        `${list}.${exceptionNote}`,
      passes,
      state,
      data: {
        viewport: REFLOW_VIEWPORT,
        scrollWidth: result.scrollWidth,
        clientWidth: result.clientWidth,
        culprits: culprits.slice(0, 20),
      },
    }),
  ];
}

/**
 * Detect horizontal overflow and name the elements responsible.
 * Assumes the viewport has already been set to 320×256.
 *
 * @param {import('playwright').Page} page
 */
export async function surveyReflow(page) {
  return page.evaluate(() => {
    const helpers = window.__a11yLoop;
    const doc = document.documentElement;
    const clientWidth = doc.clientWidth;
    const horizontalScroll = doc.scrollWidth > clientWidth + 1;
    const culprits = [];
    if (horizontalScroll) {
      for (const el of document.body.querySelectorAll('*')) {
        const rect = el.getBoundingClientRect();
        if (rect.right > clientWidth + 1 && rect.width > 0) {
          culprits.push({
            tag: el.tagName,
            selector: helpers.cssPath(el),
            html: helpers.shortHtml(el, 120),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
        }
        if (culprits.length >= 20) break;
      }
    }
    return { horizontalScroll, scrollWidth: doc.scrollWidth, clientWidth, culprits };
  });
}
