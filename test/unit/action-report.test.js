import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MARKER, HONESTY, buildOutputs, renderComment, renderSummary } from '../../action/lib.mjs';
import { findRedLineLanguage } from '../../src/lib/format/json.js';

const finding = (n) => ({
  ruleId: 'image-alt',
  wcag: { sc: '1.1.1' },
  selector: `html > body > img:nth-child(${n}) | with \`tick\``,
});

const report = {
  target: { value: 'demo/before/index.html' },
  summary: {
    violations: 12,
    needsReview: 3,
    bestPractice: 1,
    manualChecklist: 2,
    verdict: '12 automatically detectable failures',
    target: 'WCAG 2.2 Level AA',
    coverage: { statement: 'Automated checks cover a subset of WCAG. This is not an audit or conformance claim.' },
  },
  findings: { violations: Array.from({ length: 12 }, (_, i) => finding(i)) },
  manualChecklist: [{ text: 'Test with a screen reader.' }, { text: 'Zoom to 400%.' }],
};
const diff = {
  summary: { fixed: 2, new: 1, remaining: 10, regression: true },
  new: [finding(99)],
};

test('outputs always carry every key, zero without a baseline', () => {
  const o = buildOutputs({ report, diff: null, auditExit: 1, reportPath: 'r.json' });
  assert.deepEqual(Object.keys(o).sort(), [
    'exit-code', 'fixed', 'manual', 'needs-review', 'new', 'remaining', 'report-path', 'sarif-path', 'violations',
  ]);
  assert.equal(o.violations, 12);
  assert.equal(o.new, 0);
  assert.equal(buildOutputs({ report, diff, auditExit: 1 }).new, 1);
});

test('a report that never ran says nothing was checked', () => {
  const md = renderSummary({ report: null, diff: null, auditExit: 2 });
  assert.match(md, /Nothing was checked/);
  assert.equal(buildOutputs({ report: null, diff: null, auditExit: 2 }).violations, 0);
});

test('summary and comment stay inside the red lines and carry the honesty sentence', () => {
  for (const ctx of [
    { report, diff, auditExit: 1 },
    { report, diff: null, auditExit: 0, baselineNote: 'No baseline report at b.json.' },
    { report: null, diff: null, auditExit: 2 },
  ]) {
    for (const text of [renderSummary(ctx), renderComment({ ...ctx, runUrl: 'https://example.test/run' })]) {
      assert.deepEqual(findRedLineLanguage(text), []);
      assert.match(text, /no automatically detectable failures|Nothing was checked/);
      assert.doesNotMatch(text, /score|badge/i);
    }
  }
  assert.ok(HONESTY.includes('not a conformance claim'));
});

test('the comment starts with the hidden marker and shows at most ten rows', () => {
  const c = renderComment({ report, diff, auditExit: 1 });
  assert.ok(c.startsWith(`${MARKER}\n`));
  assert.match(c, /10 of 12 shown/);
  assert.match(c, /2 fixed · 1 new · 10 remaining/);
  assert.match(c, /2 manual checks/);
});

test('selectors with pipes and backticks cannot break the markdown', () => {
  const c = renderSummary({ report, diff: null, auditExit: 1 });
  assert.doesNotMatch(c, /`tick`/);
});
