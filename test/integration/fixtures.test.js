/**
 * Fixture matrix — every fixture in test/fixtures/manifest.json audited by the
 * real engine (`runAudit`, real Playwright/Chromium, real axe-core), asserting
 * exactly what the manifest says each one should produce.
 *
 * This exercises the actual browser codepath rather than mocking it: each
 * fixture is served over http (never file://) and audited across all five
 * passes, exactly as `a11y-loop audit --file <fixture>` would do it.
 *
 * Ground truth for every assertion here was obtained by running the real
 * audit engine against every fixture and reading the actual output — not
 * assumed from the manifest's original text. Where the manifest's expectation
 * did not match observed reality (a few rule-id placeholders, two
 * allowNeedsReview flags, and one genuine behavioural finding — see the fixed
 * manifest.json and its inline notes), the manifest was corrected rather than
 * the CLI weakened. One real CLI bug was found and fixed along the way: a
 * positive-tabindex element was being double-reported as also
 * "keyboard-unreachable" (src/lib/checks/keyboard.js) — see that file's
 * comments and test/unit/checks.test.js for the fix.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runAudit } from '../../src/lib/axe-runner.js';
import { bucketFindings } from '../../src/lib/finding.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, '..', 'fixtures');

const manifest = JSON.parse(await readFile(join(FIXTURES_DIR, 'manifest.json'), 'utf8'));

/** Load the states export of a fixture's companion --interact module, if any. */
async function loadInteractStates(entry) {
  if (!entry?.interact?.required) return {};
  const mod = await import(pathToFileURL(join(FIXTURES_DIR, entry.interact.script)).href);
  return mod.states;
}

/**
 * Which bucket(s) an expectation should be searched in, per the manifest's
 * own `expectationFields` documentation:
 *  - axeTag "best-practice"  -> the separated, non-blocking bestPractice bucket
 *  - landsIn "incomplete"    -> needsReview only
 *  - allowNeedsReview true   -> the check may legitimately land in either
 *                               bucket (some a11y-loop checks are ALWAYS
 *                               needsReview by design; some axe rules are
 *                               flexible) — search both, combined
 *  - otherwise               -> violations only
 */
function findingsFor(buckets, item) {
  if (item.axeTag === 'best-practice') {
    return buckets.bestPractice.filter((f) => f.ruleId === item.ruleIdOrCheck);
  }
  if (item.landsIn === 'incomplete') {
    return buckets.needsReview.filter((f) => f.ruleId === item.ruleIdOrCheck);
  }
  if (item.allowNeedsReview === true) {
    return [...buckets.violations, ...buckets.needsReview].filter(
      (f) => f.ruleId === item.ruleIdOrCheck,
    );
  }
  return buckets.violations.filter((f) => f.ruleId === item.ruleIdOrCheck);
}

/** Pass name a `requiresPass` value maps to, for the optional pass-membership check. */
const PASS_NAME = { 'viewport-320': 'reflow', 'reduced-motion': 'reduced-motion' };

describe('fixture matrix (test/fixtures/manifest.json, real engine)', () => {
  for (const [file, entry] of Object.entries(manifest.fixtures)) {
    test(
      `${file} — ${entry.title}`,
      { timeout: 45_000 },
      async () => {
        const states = await loadInteractStates(entry);
        const result = await runAudit({
          target: { type: 'file', value: join(FIXTURES_DIR, file) },
          options: { bestPractice: true, states },
        });
        const buckets = bucketFindings(result.findings);

        if (entry.expectClean) {
          assert.deepEqual(
            buckets.violations,
            [],
            `${file} is documented as expectClean but produced violations: ` +
              JSON.stringify(buckets.violations.map((f) => f.ruleId)),
          );
        }

        // A few fixtures document what a *different* tool (axe alone) should
        // see, independent of what a11y-loop's own checks add — e.g. the
        // placeholder-as-label fixture is the regression guard for "axe's
        // `label` rule passes on placeholder-only inputs", which is real and
        // worth locking in even though a11y-loop has no check for that gap.
        if (/zero violations/i.test(entry.axeExpectation ?? '')) {
          assert.deepEqual(
            buckets.violations,
            [],
            `${file}: axeExpectation says zero violations, got ` +
              JSON.stringify(buckets.violations.map((f) => f.ruleId)),
          );
        }

        // Every documented expectation must be met, in the bucket it's
        // documented to land in, with at least its minimum node count.
        // proposedCheck entries describe a check the CLI does not implement
        // (yet) — the fixture still exists as a future regression target, but
        // there is nothing to assert positively today.
        for (const item of (entry.expect ?? []).filter((i) => !i.proposedCheck)) {
          const found = findingsFor(buckets, item);
          assert.ok(
            found.length >= item.minNodes,
            `${file}: expected >= ${item.minNodes} "${item.ruleIdOrCheck}" (${item.detector}), got ${found.length}`,
          );
          if (item.requiresPass && PASS_NAME[item.requiresPass]) {
            assert.ok(
              found.some((f) => f.passes?.includes(PASS_NAME[item.requiresPass])),
              `${file}: "${item.ruleIdOrCheck}" should be tagged with the ${PASS_NAME[item.requiresPass]} pass`,
            );
          }
          if (item.wcag22Only) {
            assert.ok(
              found.every((f) => f.wcag?.wcag22Only),
              `${file}: "${item.ruleIdOrCheck}" should be flagged WCAG 2.2-only`,
            );
          }
        }

        // assertAlso: for every fixture except the one(s) under test, no
        // other rule should report a violation. Derive the expected set from
        // the manifest itself rather than hardcoding it a second time.
        const expectedViolationRuleIds = new Set(
          (entry.expect ?? [])
            .filter((item) => item.axeTag !== 'best-practice')
            .map((item) => item.ruleIdOrCheck),
        );
        const unexpected = buckets.violations
          .map((f) => f.ruleId)
          .filter((id) => !expectedViolationRuleIds.has(id));
        assert.deepEqual(
          unexpected,
          [],
          `${file}: unexpected violation rule id(s) fired — either the fixture drifted or a ` +
            `runner regression introduced a new finding: ${unexpected.join(', ')}`,
        );
      },
    );
  }
});
