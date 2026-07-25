/**
 * Does `prefers-reduced-motion: reduce` actually do anything?
 *
 * Declaring a media query is not the same as honouring it. This samples
 * computed animation state while the browser reports the reduce preference, and
 * reports animations that are still running.
 *
 * Criterion mapping, chosen to stay honest about levels:
 *  - An animation that loops forever, or runs for more than 5 seconds, and
 *    starts on its own is SC 2.2.2 Pause, Stop, Hide (Level A) → violation.
 *  - A short, finite animation is SC 2.3.3 Animation from Interactions
 *    (Level AAA) → needs review, because AAA is not part of an AA target.
 */

import { makeFinding, SEVERITY } from '../finding.js';

/** SC 2.2.2's threshold for "more than five seconds". */
export const LONG_ANIMATION_SECONDS = 5;

/** `"2s"` → 2, `"500ms"` → 0.5, `"0s"` → 0. Handles comma-separated lists. */
export function parseSeconds(value) {
  if (typeof value !== 'string') return 0;
  const durations = value.split(',').map((part) => {
    const text = part.trim();
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) return 0;
    return /ms$/.test(text) ? number / 1000 : number;
  });
  return Math.max(0, ...durations);
}

/** `"infinite"` or a finite count. */
export function isInfinite(iterationCount) {
  return String(iterationCount ?? '').split(',').some((part) => part.trim() === 'infinite');
}

/**
 * @param {Array<{selector:string, html:string, animationName:string,
 *   animationDuration:string, animationPlayState:string, animationIterationCount:string,
 *   transitionDuration:string}>} samples
 */
export function findRunningAnimations(samples = []) {
  const running = [];
  for (const sample of samples) {
    const names = (sample.animationName ?? 'none')
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n && n !== 'none');
    if (names.length === 0) continue;

    const duration = parseSeconds(sample.animationDuration);
    if (duration === 0) continue;
    const playState = String(sample.animationPlayState ?? 'running');
    if (playState.split(',').every((s) => s.trim() === 'paused')) continue;

    const infinite = isInfinite(sample.animationIterationCount);
    running.push({
      selector: sample.selector,
      html: sample.html,
      names,
      duration,
      infinite,
      continuous: infinite || duration > LONG_ANIMATION_SECONDS,
    });
  }
  return running;
}

/**
 * @param {Array} samples
 * @param {{passes:string[], state:string|null}} ctx
 */
export function reducedMotionFindings(samples, ctx) {
  const { passes = [], state = null } = ctx ?? {};
  return findRunningAnimations(samples).map((animation) => {
    const lifetime = animation.infinite
      ? 'loops forever'
      : `runs for ${animation.duration}s`;
    return makeFinding({
      ruleId: 'reduced-motion-ignored',
      source: 'a11y-loop',
      severity: animation.continuous ? SEVERITY.VIOLATION : SEVERITY.NEEDS_REVIEW,
      impact: animation.continuous ? 'serious' : 'moderate',
      sc: animation.continuous ? '2.2.2' : '2.3.3',
      selector: animation.selector,
      html: animation.html,
      message:
        `Animation "${animation.names.join(', ')}" is still running while the browser reports ` +
        `prefers-reduced-motion: reduce, and it ${lifetime}. Wrap the animation in ` +
        '@media (prefers-reduced-motion: no-preference), or disable it under reduce.' +
        (animation.continuous
          ? ''
          : ' Short, finite animations are Level AAA, so this is flagged for review rather ' +
            'than as an AA failure.'),
      passes,
      state,
      data: {
        animationNames: animation.names,
        durationSeconds: animation.duration,
        infinite: animation.infinite,
      },
    });
  });
}

/**
 * Sample computed animation state. Only meaningful on the reduced-motion pass.
 *
 * Uses isRendered rather than isVisible deliberately: SC 2.2.2 is about
 * motion a SIGHTED user can see, which has nothing to do with the
 * accessibility tree. A moving element inside an aria-hidden container (a
 * decorative marquee/ticker, say) is still a real vestibular hazard and still
 * needs to stop under prefers-reduced-motion, even though it is correctly
 * invisible to a screen reader.
 *
 * @param {import('playwright').Page} page
 */
export async function surveyAnimations(page) {
  return page.evaluate(() => {
    const helpers = window.__a11yLoop;
    const samples = [];
    for (const el of document.querySelectorAll('*')) {
      if (!helpers.isRendered(el)) continue;
      const style = getComputedStyle(el);
      if (!style.animationName || style.animationName === 'none') continue;
      samples.push({
        selector: helpers.cssPath(el),
        html: helpers.shortHtml(el),
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        animationPlayState: style.animationPlayState,
        animationIterationCount: style.animationIterationCount,
        transitionDuration: style.transitionDuration,
      });
      if (samples.length >= 30) break;
    }
    return samples;
  });
}
