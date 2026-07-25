/**
 * Target size (SC 2.5.8, Level AA, new in WCAG 2.2).
 *
 * Our own geometric check rather than axe's `target-size`, which is disabled by
 * default and has a documented false-positive trail. We measure the rect and
 * apply the Spacing exception explicitly, so the report explains itself:
 * "18×18 CSS px, and the 24 px spacing circle overlaps <other element>".
 *
 * Everything here is needs-review, never a hard failure. Of the criterion's
 * five exceptions, only Spacing is measurable: Equivalent, Inline, User agent
 * control and Essential all require knowing the author's intent.
 */

import { makeFinding, SEVERITY } from '../finding.js';

export const MIN_TARGET_PX = 24;

const centerOf = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

/**
 * Does a 24 px-diameter circle centred on this target stay clear of every other
 * target's circle? Two circles of radius 12 clear each other when their centres
 * are at least 24 px apart.
 */
export function meetsSpacingException(target, allTargets) {
  const c = centerOf(target.rect);
  for (const other of allTargets) {
    if (other === target || other.selector === target.selector) continue;
    const o = centerOf(other.rect);
    const distance = Math.hypot(c.x - o.x, c.y - o.y);
    if (distance < MIN_TARGET_PX) return { met: false, conflictsWith: other.selector, distance };
  }
  return { met: true };
}

/**
 * @param {Array<{selector:string, html:string, rect:{x:number,y:number,width:number,height:number}, inline?:boolean}>} targets
 * @returns {Array<{selector:string, html:string, width:number, height:number, spacing:object, inline:boolean}>}
 */
export function evaluateTargets(targets = []) {
  const undersized = targets.filter(
    (t) => t.rect.width < MIN_TARGET_PX || t.rect.height < MIN_TARGET_PX,
  );
  return undersized.map((t) => ({
    selector: t.selector,
    html: t.html,
    width: Math.round(t.rect.width * 10) / 10,
    height: Math.round(t.rect.height * 10) / 10,
    inline: Boolean(t.inline),
    spacing: meetsSpacingException(t, targets),
  }));
}

/**
 * @param {Array} targets
 * @param {{passes:string[], state:string|null}} ctx
 */
export function targetSizeFindings(targets, ctx) {
  const { passes = [], state = null } = ctx ?? {};
  return evaluateTargets(targets).map((t) => {
    const size = `${t.width}×${t.height} CSS px`;
    const detail = t.spacing.met
      ? 'No other target sits within 24 px, so the Spacing exception may apply.'
      : `The 24 px spacing circle overlaps ${t.spacing.conflictsWith} ` +
        `(centres ${Math.round(t.spacing.distance)} px apart), so the Spacing exception does not apply.`;
    const inlineNote = t.inline
      ? ' This target is inside a sentence, so the Inline exception may also apply.'
      : '';

    return makeFinding({
      ruleId: 'target-size-min',
      source: 'a11y-loop',
      severity: SEVERITY.NEEDS_REVIEW,
      impact: 'moderate',
      sc: '2.5.8',
      selector: t.selector,
      html: t.html,
      message:
        `Target is ${size}, smaller than the 24×24 minimum. ${detail}${inlineNote} ` +
        'The Equivalent, User agent control and Essential exceptions cannot be judged ' +
        'automatically — confirm one applies, or enlarge the target.',
      passes,
      state,
      data: {
        width: t.width,
        height: t.height,
        minimum: MIN_TARGET_PX,
        spacingExceptionMet: t.spacing.met,
        conflictsWith: t.spacing.conflictsWith ?? null,
      },
    });
  });
}

/**
 * Measure every interactive element's rect.
 * @param {import('playwright').Page} page
 */
export async function surveyTargets(page) {
  return page.evaluate(() => {
    const helpers = window.__a11yLoop;
    return helpers.interactiveElements().map((el) => {
      const rect = el.getBoundingClientRect();
      // SC 2.5.8's Inline exception covers targets in a sentence or block of
      // text, so compare against the nearest text-bearing block rather than the
      // immediate parent — a link wrapped in a <span> would otherwise look
      // standalone.
      const block = el.closest('p, li, td, th, dd, blockquote, figcaption, h1, h2, h3, h4, h5, h6');
      const blockText = (block?.textContent ?? '').trim();
      const ownText = (el.textContent ?? '').trim();
      const inline =
        getComputedStyle(el).display === 'inline' &&
        Boolean(block) &&
        blockText.length > ownText.length + 10;
      return {
        selector: helpers.cssPath(el),
        html: helpers.shortHtml(el),
        inline,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      };
    });
  });
}
