/**
 * Focus visibility (SC 2.4.7) and focus-indicator contrast (SC 1.4.11).
 *
 * Method: read the computed style of every focusable element in its resting
 * state, focus it, read the computed style again, and diff. A focus indicator
 * exists only if something visibly CHANGED — an element that looks identical
 * focused and unfocused has no indicator, whatever its stylesheet claims.
 *
 * The ring's own contrast against the colour behind it is SC 1.4.11 territory
 * that essentially nothing automates. Where the adjacent background cannot be
 * determined (background images, gradients) the finding is needs-review rather
 * than a guess.
 */

import { makeFinding, SEVERITY } from '../finding.js';
import { checkContrast, parseColor, ColorParseError } from '../contrast-math.js';
import { resetFocusToDocumentStart, clearFocusSentinel } from './keyboard.js';

/** Computed properties compared between resting and focused state. */
export const WATCHED_PROPERTIES = [
  'outlineStyle',
  'outlineWidth',
  'outlineColor',
  'outlineOffset',
  'boxShadow',
  'borderTopWidth',
  'borderTopColor',
  'borderBottomWidth',
  'borderBottomColor',
  'backgroundColor',
  'color',
  'textDecorationLine',
  'textDecorationColor',
];

/** Minimum contrast for a focus indicator, as a non-text visual object. */
export const RING_CONTRAST_MIN = 3;

const isTransparent = (value) =>
  typeof value === 'string' &&
  (value === 'transparent' || /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(value));

const hasWidth = (value) => Number.parseFloat(value) > 0;

/**
 * Which watched properties changed on focus, described in plain terms.
 *
 * @param {Record<string,string>} base    computed style at rest
 * @param {Record<string,string>} focused computed style while focused
 * @returns {{visible:boolean, indicators:string[], changed:string[]}}
 */
export function describeFocusChange(base = {}, focused = {}) {
  const changed = WATCHED_PROPERTIES.filter((prop) => base[prop] !== focused[prop]);
  const indicators = [];

  const outlineAppeared =
    focused.outlineStyle !== 'none' &&
    hasWidth(focused.outlineWidth) &&
    !isTransparent(focused.outlineColor) &&
    (base.outlineStyle === 'none' ||
      !hasWidth(base.outlineWidth) ||
      isTransparent(base.outlineColor) ||
      base.outlineColor !== focused.outlineColor ||
      base.outlineWidth !== focused.outlineWidth);
  if (outlineAppeared) indicators.push('outline');

  if (
    focused.boxShadow &&
    focused.boxShadow !== 'none' &&
    base.boxShadow !== focused.boxShadow
  ) {
    indicators.push('box-shadow');
  }
  if (
    base.borderTopWidth !== focused.borderTopWidth ||
    base.borderTopColor !== focused.borderTopColor ||
    base.borderBottomWidth !== focused.borderBottomWidth ||
    base.borderBottomColor !== focused.borderBottomColor
  ) {
    indicators.push('border');
  }
  if (base.backgroundColor !== focused.backgroundColor) indicators.push('background-color');
  if (base.color !== focused.color) indicators.push('text colour');
  if (
    base.textDecorationLine !== focused.textDecorationLine ||
    base.textDecorationColor !== focused.textDecorationColor
  ) {
    indicators.push('text-decoration');
  }

  return { visible: indicators.length > 0, indicators, changed };
}

/**
 * The colour of the focus indicator itself, if one can be identified.
 * @returns {string|null}
 */
export function indicatorColor(focused = {}, indicators = []) {
  if (indicators.includes('outline') && !isTransparent(focused.outlineColor)) {
    return focused.outlineColor;
  }
  if (indicators.includes('box-shadow')) {
    const match = /(rgba?\([^)]*\))/.exec(focused.boxShadow ?? '');
    if (match && !isTransparent(match[1])) return match[1];
  }
  if (indicators.includes('border') && !isTransparent(focused.borderTopColor)) {
    return focused.borderTopColor;
  }
  return null;
}

/**
 * Contrast of a focus ring against what sits behind it.
 *
 * @returns {{determinable:boolean, ratio?:number, ratioDisplay?:string, passes?:boolean}}
 */
export function ringContrast(ringColor, adjacentBackground) {
  if (!ringColor || !adjacentBackground) return { determinable: false };
  try {
    parseColor(ringColor);
    parseColor(adjacentBackground);
  } catch (error) {
    if (error instanceof ColorParseError) return { determinable: false };
    throw error;
  }
  const result = checkContrast(ringColor, adjacentBackground, { ui: true });
  return {
    determinable: true,
    ratio: result.ratio,
    ratioDisplay: result.ratioDisplay,
    passes: result.passes.AA,
  };
}

/**
 * @param {Array} samples from `surveyFocusVisibility`
 * @param {{passes:string[], state:string|null}} ctx
 */
export function focusVisibilityFindings(samples, ctx) {
  const findings = [];
  const { passes = [], state = null } = ctx ?? {};

  for (const sample of samples) {
    const change = describeFocusChange(sample.base, sample.focused);

    if (!change.visible) {
      findings.push(
        makeFinding({
          ruleId: 'focus-not-visible',
          source: 'a11y-loop',
          severity: SEVERITY.VIOLATION,
          impact: 'serious',
          sc: '2.4.7',
          selector: sample.selector,
          html: sample.html,
          message:
            'Nothing about this element changes visually when it receives keyboard focus ' +
            '(no outline, box-shadow, border, background or text change). Keyboard users ' +
            'cannot tell where they are.',
          passes,
          state,
        }),
      );
      continue;
    }

    const ring = indicatorColor(sample.focused, change.indicators);
    const contrast = ringContrast(ring, sample.adjacentBackground);

    if (!contrast.determinable) {
      findings.push(
        makeFinding({
          ruleId: 'focus-indicator-contrast',
          source: 'a11y-loop',
          severity: SEVERITY.NEEDS_REVIEW,
          impact: 'moderate',
          sc: '1.4.11',
          selector: sample.selector,
          html: sample.html,
          message:
            `Focus indicator present (${change.indicators.join(', ')}), but its contrast ` +
            'could not be computed — the colour behind it is an image, a gradient, or not ' +
            'resolvable. Confirm the indicator is clearly visible against its surroundings.',
          passes,
          state,
          data: { indicators: change.indicators, indicatorColor: ring },
        }),
      );
      continue;
    }

    if (!contrast.passes) {
      findings.push(
        makeFinding({
          ruleId: 'focus-indicator-contrast',
          source: 'a11y-loop',
          severity: SEVERITY.NEEDS_REVIEW,
          impact: 'moderate',
          sc: '1.4.11',
          selector: sample.selector,
          html: sample.html,
          message:
            `The focus indicator (${change.indicators.join(', ')}, ${ring}) has a contrast ` +
            `ratio of ${contrast.ratioDisplay}:1 against the adjacent background ` +
            `${sample.adjacentBackground}, below the ${RING_CONTRAST_MIN}:1 minimum for ` +
            'non-text visual information.',
          passes,
          state,
          data: {
            indicators: change.indicators,
            indicatorColor: ring,
            adjacentBackground: sample.adjacentBackground,
            ratio: contrast.ratio,
          },
        }),
      );
    }
  }

  return findings;
}

/** How many Tab presses the focus walk will make. */
export const MAX_FOCUS_STEPS = 40;

/**
 * Record resting and focused computed styles for each focusable element.
 *
 * Focus is driven with the Tab KEY rather than `element.focus()`, because
 * `:focus-visible` is exactly the selector that distinguishes the two: Chromium
 * applies it on keyboard focus and withholds it on programmatic focus for most
 * element types. Calling `.focus()` would report missing focus rings on elements
 * that style `:focus-visible` correctly.
 *
 * The cost is a second Tab walk (the keyboard check does its own). Both walks are
 * read-only, so they cannot contaminate each other.
 *
 * @param {import('playwright').Page} page
 */
export async function surveyFocusVisibility(page) {
  const resting = await page.evaluate((watched) => {
    const helpers = window.__a11yLoop;
    const nodes = window.tabbable ? window.tabbable.tabbable(document.body) : [];
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const read = (el) => {
      const style = getComputedStyle(el);
      const out = {};
      for (const prop of watched) out[prop] = style[prop];
      return out;
    };
    const map = {};
    for (const el of nodes) {
      if (!helpers.isVisible(el)) continue;
      map[helpers.cssPath(el)] = {
        html: helpers.shortHtml(el),
        style: read(el),
        adjacentBackground: helpers.backdropColor(el.parentElement ?? el),
      };
    }
    return map;
  }, WATCHED_PROPERTIES);

  await resetFocusToDocumentStart(page);

  const samples = [];
  const seen = new Set();
  for (let i = 0; i < MAX_FOCUS_STEPS; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate((watched) => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (el.hasAttribute?.('data-a11y-loop-sentinel')) return null;
      const style = getComputedStyle(el);
      const focused = {};
      for (const prop of watched) focused[prop] = style[prop];
      return { selector: window.__a11yLoop.cssPath(el), focused };
    }, WATCHED_PROPERTIES);

    if (!stop) break;
    if (seen.has(stop.selector)) break; // wrapped around
    seen.add(stop.selector);

    const base = resting[stop.selector];
    if (!base) continue; // tabbable did not predict it; the keyboard check reports that
    samples.push({
      selector: stop.selector,
      html: base.html,
      base: base.style,
      focused: stop.focused,
      adjacentBackground: base.adjacentBackground,
    });
  }

  await clearFocusSentinel(page);
  return samples;
}
