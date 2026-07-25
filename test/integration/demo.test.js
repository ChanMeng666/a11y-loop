/**
 * The demo loop, end to end: demo/before seeds the WebAIM top-six plus the
 * AI-codegen failure modes (see demo/before/VIOLATIONS.md); demo/after fixes
 * them (see demo/after/FIXES.md). This suite proves both halves of that
 * story against the real engine, then proves the loop itself — audit,
 * fix, diff, converge — through the actual CLI process.
 *
 * Every expectation below was obtained by running the real audit engine
 * against the real demo pages and reading the actual output, the same way
 * test/integration/fixtures.test.js was built. Five real bugs were found and
 * fixed along the way (see src/lib/checks/keyboard.js, dialog.js,
 * reduced-motion.js, src/lib/browser-utils.js and src/lib/finding.js for the
 * code and comments; summarised in the final report to the team lead):
 *
 *  1. A positive-tabindex element was double-reported as "keyboard
 *     unreachable" too (fixed in keyboard.js, also covered by
 *     test/fixtures fixture-positive-tabindex.html).
 *  2. Opening demo/after's native <dialog> made the rest of the page
 *     genuinely inert (correct, intended behaviour), but tabbable() and the
 *     shared isVisible() helper didn't know that, so every check that walks
 *     "visible" elements flooded the report with ~40 false positives once
 *     the dialog opened (fixed in browser-utils.js / keyboard.js /
 *     focus-visible.js).
 *  3. The dialog check's "was focus moved into the dialog on open" question
 *     was answered too late — after the keyboard and focus-visibility
 *     surveys had already run their own Tab-walks and moved focus elsewhere
 *     — so a page that sets initial focus correctly was reported as though
 *     it had not (fixed in dialog.js / axe-runner.js: the initial-focus
 *     snapshot is now captured before anything else touches focus).
 *  4. The dialog trigger was identified from "whatever currently has focus",
 *     which a well-behaved dialog immediately overwrites by moving focus
 *     into itself; switched to tracking the last click instead (fixed in
 *     browser-utils.js / axe-runner.js).
 *  5. demo/after's hero section (a linear-gradient background) reported
 *     three real color-contrast VIOLATIONS on .kicker, .hero-sub and
 *     .hero-note, contradicting FIXES.md's documented (and otherwise
 *     correct) claim that a gradient background makes color-contrast
 *     undeterminable. Root cause, confirmed directly against real computed
 *     styles and reproduced independently of any a11y-loop code with a
 *     two-line test page: under `forcedColors: 'active'` emulation only,
 *     axe-core evaluates the pre-forced-colors author text colour against
 *     the post-forced-colors flattened background, producing a false
 *     failure — every other pass, and a plain default axe.run(), correctly
 *     call the same element undeterminable. Fixed in
 *     src/lib/finding.js (dedupeFindings / FORCED_COLORS_FRAGILE_RULES):
 *     a lone, uncorroborated forced-colors violation no longer overrides an
 *     established needs-review verdict from every other pass. Regression
 *     test: test/integration/forced-colors-gradient.test.js.
 *
 * With bug 5 fixed, demo/after audits fully clean — zero violations, exit 0
 * — exactly as FIXES.md claims.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runAudit } from '../../src/lib/axe-runner.js';
import { bucketFindings } from '../../src/lib/finding.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CLI = join(REPO, 'src', 'cli.js');
const BEFORE_HTML = join(REPO, 'demo', 'before', 'index.html');
const AFTER_HTML = join(REPO, 'demo', 'after', 'index.html');
const BEFORE_INTERACT = join(HERE, 'interact', 'demo-before.mjs');
const AFTER_INTERACT = join(HERE, 'interact', 'demo-after.mjs');

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

/** VIOLATIONS.md's sixteen seeded classes, mapped to the rule id and bucket
 * a11y-loop actually reports them under. "at least one finding" is the bar
 * per the integration scope — exact counts are the fixture matrix's job. */
const BEFORE_CLASSES = [
  { label: 'B1 low-contrast text', bucket: 'violations', ruleId: 'color-contrast' },
  { label: 'B2 images missing alt', bucket: 'violations', ruleId: 'image-alt' },
  { label: 'B3 unlabeled input/textarea', bucket: 'violations', ruleId: 'label' },
  { label: 'B3 unlabeled select', bucket: 'violations', ruleId: 'select-name' },
  { label: 'B4 empty links', bucket: 'violations', ruleId: 'link-name' },
  { label: 'B5 empty button', bucket: 'violations', ruleId: 'button-name' },
  { label: 'B6 missing html lang', bucket: 'violations', ruleId: 'html-has-lang' },
  { label: 'B7 clickable div-as-button', bucket: 'violations', ruleId: 'div-button' },
  { label: 'B8 skipped heading levels', bucket: 'bestPractice', ruleId: 'heading-order' },
  { label: 'B9 focus indicator removed', bucket: 'violations', ruleId: 'focus-not-visible' },
  { label: 'B10 aria-hidden on a focusable link', bucket: 'violations', ruleId: 'aria-hidden-focus' },
  { label: 'B10 role=heading with no level', bucket: 'violations', ruleId: 'aria-required-attr' },
  { label: 'B10 role=menu with no menuitems', bucket: 'violations', ruleId: 'aria-required-children' },
  {
    label: 'B11 modal: focus not moved in on open',
    bucket: 'violations',
    ruleId: 'dialog-initial-focus',
    state: 'dialog-open',
  },
  {
    label: 'B11 modal: no focus trap',
    bucket: 'violations',
    ruleId: 'dialog-focus-not-trapped',
    state: 'dialog-open',
  },
  {
    label: 'B11 modal: Escape does not close',
    bucket: 'violations',
    ruleId: 'dialog-escape-does-not-close',
    state: 'dialog-open',
  },
  { label: 'B12 targets below 24x24', bucket: 'needsReview', ruleId: 'target-size-min' },
  { label: 'B13 fixed-width layout / no reflow', bucket: 'violations', ruleId: 'reflow-horizontal-scroll' },
  { label: 'B14 reduced-motion ignored', bucket: 'violations', ruleId: 'reduced-motion-ignored' },
  { label: 'B15 ambiguous link text', bucket: 'needsReview', ruleId: 'ambiguous-link-text' },
  { label: 'B16 positive tabindex', bucket: 'violations', ruleId: 'positive-tabindex' },
];

describe('demo/before — every VIOLATIONS.md class is detected', () => {
  let buckets;

  before(async () => {
    const { states } = await import(pathToFileURL(BEFORE_INTERACT).href);
    const result = await runAudit({
      target: { type: 'file', value: BEFORE_HTML },
      options: { bestPractice: true, states },
    });
    buckets = bucketFindings(result.findings);
  }, { timeout: 60_000 });

  for (const cls of BEFORE_CLASSES) {
    test(`${cls.label} -> ${cls.ruleId} in ${cls.bucket}`, () => {
      const found = buckets[cls.bucket].filter(
        (f) => f.ruleId === cls.ruleId && (!cls.state || f.state === cls.state),
      );
      assert.ok(
        found.length >= 1,
        `expected at least one "${cls.ruleId}" in ${cls.bucket}` +
          (cls.state ? ` (state: ${cls.state})` : '') +
          `, found ${found.length}`,
      );
    });
  }
});

describe('demo/after — audits fully clean, dialog exercised', () => {
  let buckets;

  before(async () => {
    const { states } = await import(pathToFileURL(AFTER_INTERACT).href);
    const result = await runAudit({
      target: { type: 'file', value: AFTER_HTML },
      options: { bestPractice: true, states },
    });
    buckets = bucketFindings(result.findings);
  }, { timeout: 60_000 });

  test('zero violations of any kind', () => {
    assert.deepEqual(
      buckets.violations,
      [],
      `demo/after should have no violations: ${buckets.violations.map((f) => f.ruleId).join(', ')}`,
    );
  });

  test('the hero heading and link still land in needsReview, per FIXES.md', () => {
    // This is the "zero violations is not zero results" point FIXES.md
    // itself makes: the gradient background genuinely makes color-contrast
    // undeterminable for axe, so these stay needsReview rather than
    // disappearing — a report that hid them would look more verified than
    // it is.
    const heroNeedsReview = buckets.needsReview.filter(
      (f) => f.ruleId === 'color-contrast' && /section:nth-child\(1\)/.test(f.selector),
    );
    assert.ok(heroNeedsReview.length >= 1);
  });

  test('the dialog is exercised cleanly: no dialog-* findings at all', () => {
    const dialogFindings = buckets.violations.filter((f) => f.ruleId.startsWith('dialog-'));
    assert.deepEqual(dialogFindings, []);
  });

  test('no div-button findings: zero clickable divs remain', () => {
    assert.deepEqual(
      buckets.violations.filter((f) => f.ruleId === 'div-button'),
      [],
    );
  });
});

describe('loop e2e — real CLI process, demo/before to demo/after', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'a11y-loop-demo-e2e-'));
  });

  after(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  test(
    'audit before, audit after, diff: seeded violations fixed, no unexplained new ones',
    { timeout: 60_000 },
    () => {
      const beforeOut = join(dir, 'before.json');
      const afterOut = join(dir, 'after.json');

      const beforeRun = runCli([
        'audit',
        '--file',
        BEFORE_HTML,
        '--interact',
        BEFORE_INTERACT,
        '--out',
        beforeOut,
        '--quiet',
      ]);
      assert.equal(beforeRun.status, 1, `demo/before should exit 1 (violations): ${beforeRun.stderr}`);

      const afterRun = runCli([
        'audit',
        '--file',
        AFTER_HTML,
        '--interact',
        AFTER_INTERACT,
        '--out',
        afterOut,
        '--quiet',
      ]);
      assert.equal(afterRun.status, 0, `demo/after should exit 0 (clean): ${afterRun.stderr}`);

      const diffRun = runCli(['diff', '--before', beforeOut, '--after', afterOut, '--json']);
      const diff = JSON.parse(diffRun.stdout);

      // Every seeded class must not remain. Fingerprints are selector/
      // ancestry-based and before/after are two structurally different
      // pages, so "fixed" here means "no finding of that class is left",
      // not "the exact same fingerprint disappeared".
      const remainingRuleIds = new Set(diff.remaining.map((f) => f.ruleId));
      for (const cls of BEFORE_CLASSES.filter((c) => c.bucket === 'violations')) {
        assert.ok(
          !remainingRuleIds.has(cls.ruleId),
          `${cls.label} (${cls.ruleId}) should not remain in demo/after`,
        );
      }

      assert.deepEqual(diff.new, [], `unexpected new violation(s) introduced: ${JSON.stringify(diff.new)}`);
      assert.equal(diff.remaining.length, 0, 'demo/after should carry over none of the seeded violations');
      assert.ok(diff.fixed.length >= BEFORE_CLASSES.filter((c) => c.bucket === 'violations').length);
      assert.equal(diff.summary.converged, true);
      assert.equal(diffRun.status, 0);
    },
  );

  test('a genuinely clean audit exits 0 through the real CLI process', { timeout: 30_000 }, () => {
    const run = runCli(['audit', '--html', '<!doctype html><html lang="en"><title>t</title><body><h1>Hi</h1></body></html>', '--quiet']);
    assert.equal(run.status, 0, run.stderr);
  });

  test('a fragment with a seeded violation exits 1 through the real CLI process', { timeout: 30_000 }, () => {
    const run = runCli(['audit', '--html', '<button></button>', '--quiet']);
    assert.equal(run.status, 1, run.stderr);
  });
});
