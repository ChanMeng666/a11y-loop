/**
 * Regression test for a real axe-core limitation, found while investigating
 * why demo/after reported color-contrast VIOLATIONS on its gradient-backed
 * hero text (.kicker, .hero-sub, .hero-note) when FIXES.md documents — and
 * every other pass agrees — that a gradient background makes color-contrast
 * undeterminable (`incomplete`).
 *
 * Root cause, confirmed independently of any a11y-loop code or the demo
 * page: under `forcedColors: 'active'` emulation, Chromium correctly
 * flattens a gradient background (backgroundImage becomes 'none',
 * backgroundColor becomes the Canvas colour) and correctly substitutes the
 * rendered text colour (confirmed the real computed `color` was
 * rgb(0,0,0) — black, 21:1 against white, genuinely fine) — but axe-core's
 * color-contrast rule evaluates the ORIGINAL author colour instead of the
 * true rendered one, against the new background, and reports a false
 * failure. Reproduced with the two-line minimal page below, with a literal
 * hex colour (not a CSS custom property, ruling that out as the trigger) —
 * so this affects any gradient-background text under the forced-colors
 * pass, not something specific to demo/after's markup or serving.
 *
 * Every other pass (default, dark, reduced-motion, reflow), and a plain
 * default axe.run() with no emulation and no runOnly restriction at all,
 * correctly report the same element as incomplete. The fix (see
 * src/lib/finding.js, dedupeFindings, FORCED_COLORS_FRAGILE_RULES) refuses to
 * let a lone, uncorroborated forced-colors violation override an
 * already-established needs-review verdict from every other pass.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { runAudit } from '../../src/lib/axe-runner.js';
import { bucketFindings } from '../../src/lib/finding.js';

const GRADIENT_FRAGMENT = `
  <section style="background: linear-gradient(135deg, #0b3b36, #0e4a57); padding: 2rem;">
    <p style="color: #d6f3ee; margin: 0;">Gradient-backed text that is genuinely readable once rendered.</p>
  </section>
`;

describe('forced-colors + gradient background: a known axe-core false positive', () => {
  test(
    'the finding lands in needsReview across all five passes, never in violations',
    { timeout: 30_000 },
    async () => {
      const result = await runAudit({
        target: { type: 'html', value: GRADIENT_FRAGMENT },
        options: { bestPractice: true },
      });
      const buckets = bucketFindings(result.findings);

      const violation = buckets.violations.find((f) => f.ruleId === 'color-contrast');
      assert.equal(
        violation,
        undefined,
        'the gradient-backed paragraph must not be reported as a color-contrast violation',
      );

      const needsReview = buckets.needsReview.find((f) => f.ruleId === 'color-contrast');
      assert.ok(needsReview, 'the gradient-backed paragraph should still be surfaced as needsReview');
      assert.ok(
        needsReview.passes.includes('forced-colors'),
        'the forced-colors pass should still be recorded, even though it did not win the severity',
      );
    },
  );
});
