import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeFinding,
  dedupeFindings,
  bucketFindings,
  truncateHtml,
  SEVERITY,
  EVIDENCE,
  HTML_TRUNCATE_AT,
  defaultEvidence,
} from '../../src/lib/finding.js';

describe('truncateHtml', () => {
  test('collapses whitespace', () => {
    assert.equal(truncateHtml('<p>\n  hello   world\n</p>'), '<p> hello world </p>');
  });

  test('caps at 200 characters with an ellipsis', () => {
    const long = `<div>${'x'.repeat(500)}</div>`;
    const out = truncateHtml(long);
    assert.equal(out.length, HTML_TRUNCATE_AT + 1);
    assert.ok(out.endsWith('…'));
  });

  test('leaves short html alone', () => {
    assert.equal(truncateHtml('<b>hi</b>'), '<b>hi</b>');
  });

  test('handles non-strings', () => {
    assert.equal(truncateHtml(undefined), '');
  });
});

describe('makeFinding', () => {
  test('builds the agent-facing shape from axe tags', () => {
    const finding = makeFinding({
      ruleId: 'button-name',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      impact: 'critical',
      tags: ['cat.name-role-value', 'wcag2a', 'wcag412'],
      selector: [['html > body > button']],
      html: '<button></button>',
      message: 'Buttons must have discernible text',
      helpUrl: 'https://example.test/button-name',
      passes: ['default', 'dark'],
    });

    assert.match(finding.fingerprint, /^[0-9a-f]{12}$/);
    assert.equal(finding.ruleId, 'button-name');
    assert.equal(finding.source, 'axe');
    assert.equal(finding.impact, 'critical');
    assert.equal(finding.wcag.sc, '4.1.2');
    assert.equal(finding.wcag.name, 'Name, Role, Value');
    assert.equal(finding.wcag.level, 'A');
    assert.equal(finding.wcag.minVersion, '2.0');
    assert.equal(finding.wcag.wcag22Only, false);
    assert.deepEqual(finding.passes, ['default', 'dark']);
    assert.equal(finding.selector, 'html > body > button');
    assert.equal(finding.state, null);
  });

  test('looks up ACT rule ids for axe findings', () => {
    const finding = makeFinding({
      ruleId: 'button-name',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      tags: ['wcag2a', 'wcag412'],
      selector: 'button',
      message: 'x',
    });
    assert.ok(finding.act.includes('97a4e1'));
  });

  test('own checks take their criterion directly and carry no ACT ids', () => {
    const finding = makeFinding({
      ruleId: 'positive-tabindex',
      source: 'a11y-loop',
      severity: SEVERITY.VIOLATION,
      sc: '2.4.3',
      selector: '#x',
      message: 'x',
    });
    assert.equal(finding.wcag.sc, '2.4.3');
    assert.equal(finding.wcag.name, 'Focus Order');
    assert.deepEqual(finding.act, []);
  });

  test('best-practice rules have no wcag block', () => {
    const finding = makeFinding({
      ruleId: 'region',
      source: 'axe',
      severity: SEVERITY.BEST_PRACTICE,
      tags: ['cat.keyboard', 'best-practice'],
      selector: 'html',
      message: 'x',
    });
    assert.equal(finding.wcag, null);
  });

  test('omits suggestions and data when there are none', () => {
    const finding = makeFinding({
      ruleId: 'r',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      selector: 'x',
      message: 'm',
    });
    assert.equal('suggestions' in finding, false);
    assert.equal('data' in finding, false);
  });

  test('carries suggestions when supplied', () => {
    const finding = makeFinding({
      ruleId: 'color-contrast',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      tags: ['wcag2aa', 'wcag143'],
      selector: 'p',
      message: 'm',
      suggestions: [{ role: 'foreground', direction: 'darker', hex: '#595959', newRatio: 7 }],
    });
    assert.equal(finding.suggestions.length, 1);
    assert.equal(finding.suggestions[0].hex, '#595959');
  });
});

describe('dedupeFindings', () => {
  const finding = (overrides = {}) =>
    makeFinding({
      ruleId: 'color-contrast',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      tags: ['wcag2aa', 'wcag143'],
      selector: 'p',
      html: '<p>low</p>',
      message: 'm',
      ...overrides,
    });

  test('merges the same finding seen in several passes and records each pass', () => {
    const merged = dedupeFindings([
      finding({ passes: ['default'] }),
      finding({ passes: ['dark'] }),
      finding({ passes: ['forced-colors'] }),
    ]);
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0].passes, ['default', 'dark', 'forced-colors']);
  });

  test('does not merge the same element found by different rules', () => {
    const merged = dedupeFindings([
      finding({ passes: ['default'] }),
      finding({ ruleId: 'link-name', tags: ['wcag2a', 'wcag412'], passes: ['default'] }),
    ]);
    assert.equal(merged.length, 2);
  });

  test('keeps findings from different interaction states apart', () => {
    const merged = dedupeFindings([
      finding({ passes: ['default'], state: null }),
      finding({ passes: ['default'], state: 'modal-open' }),
    ]);
    assert.equal(merged.length, 2);
  });

  test('a violation in any pass outranks a needs-review sighting', () => {
    const merged = dedupeFindings([
      finding({ severity: SEVERITY.NEEDS_REVIEW, passes: ['default'], message: 'unsure' }),
      finding({ severity: SEVERITY.VIOLATION, passes: ['dark'], message: 'definitely' }),
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].severity, SEVERITY.VIOLATION);
    assert.equal(merged[0].message, 'definitely');
  });

  test('a forced-colors violation corroborated by another pass still wins', () => {
    const merged = dedupeFindings([
      finding({ severity: SEVERITY.NEEDS_REVIEW, passes: ['default'], message: 'undeterminable' }),
      finding({ severity: SEVERITY.VIOLATION, passes: ['dark'], message: 'real failure' }),
      finding({ severity: SEVERITY.VIOLATION, passes: ['forced-colors'], message: 'still failing' }),
    ]);
    assert.equal(merged[0].severity, SEVERITY.VIOLATION);
  });

  test('a forced-colors violation of a non-contrast rule outranks needs-review', () => {
    const merged = dedupeFindings([
      finding({ ruleId: 'other-rule', severity: SEVERITY.NEEDS_REVIEW, passes: ['default'] }),
      finding({ ruleId: 'other-rule', severity: SEVERITY.VIOLATION, passes: ['forced-colors'] }),
    ]);
    assert.equal(merged[0].severity, SEVERITY.VIOLATION);
  });

  test('a forced-colors-only violation with no prior sighting is still reported as a violation', () => {
    // Nothing to compare against yet, so there is no established
    // needs-review verdict to protect — this is the ordinary, unaffected case.
    const merged = dedupeFindings([finding({ severity: SEVERITY.VIOLATION, passes: ['forced-colors'] })]);
    assert.equal(merged[0].severity, SEVERITY.VIOLATION);
  });

  test('suggestions survive the merge even if the first sighting had none', () => {
    const merged = dedupeFindings([
      finding({ passes: ['default'] }),
      finding({ passes: ['dark'], suggestions: [{ hex: '#595959' }] }),
    ]);
    assert.equal(merged[0].suggestions.length, 1);
  });

  test('does not mutate its input', () => {
    const original = finding({ passes: ['default'] });
    dedupeFindings([original, finding({ passes: ['dark'] })]);
    assert.deepEqual(original.passes, ['default']);
  });
});

describe('bucketFindings', () => {
  test('splits by severity and never puts best-practice in violations', () => {
    const input = [
      { severity: SEVERITY.VIOLATION, ruleId: 'a' },
      { severity: SEVERITY.NEEDS_REVIEW, ruleId: 'b' },
      { severity: SEVERITY.BEST_PRACTICE, ruleId: 'c' },
      { severity: SEVERITY.VIOLATION, ruleId: 'd' },
    ];
    const buckets = bucketFindings(input);
    assert.deepEqual(
      buckets.violations.map((f) => f.ruleId),
      ['a', 'd'],
    );
    assert.deepEqual(
      buckets.needsReview.map((f) => f.ruleId),
      ['b'],
    );
    assert.deepEqual(
      buckets.bestPractice.map((f) => f.ruleId),
      ['c'],
    );
  });
});

// Each test below kills a mutant of src/lib/finding.js that the tests above let
// survive; the comment names it. Equivalent mutants have no test here.
describe('finding: mutation-tested edges', () => {
  const finding = (overrides = {}) =>
    makeFinding({
      ruleId: 'color-contrast',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      tags: ['wcag2aa', 'wcag143'],
      selector: 'p',
      html: '<p>low</p>',
      message: 'm',
      ...overrides,
    });

  // Kills the upgrade condition mutated to `true`, to `||`, or with its second
  // half → `true`. Two needs-review sightings must stay needs-review (it is the
  // exit code), and a later needs-review sighting must not demote a violation.
  test('needs-review sightings never make a violation, and never unmake one', () => {
    const twoReviews = dedupeFindings([
      finding({ severity: SEVERITY.NEEDS_REVIEW, passes: ['default'] }),
      finding({ severity: SEVERITY.NEEDS_REVIEW, passes: ['dark'] }),
    ]);
    assert.equal(twoReviews[0].severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(twoReviews[0].evidence, EVIDENCE.NEEDS_REVIEW);

    const violationFirst = dedupeFindings([
      finding({ severity: SEVERITY.VIOLATION, passes: ['default'], message: 'definitely' }),
      finding({ severity: SEVERITY.NEEDS_REVIEW, passes: ['dark'], message: 'unsure' }),
    ]);
    assert.equal(violationFirst[0].severity, SEVERITY.VIOLATION);
    assert.equal(violationFirst[0].message, 'definitely');
  });

  // Kills `if (finding.confidence) existing.confidence = …` → `if (false)`,
  // `if (!existing.data && finding.data)` → `true` (wipes data with undefined)
  // and → `false` / `existing.data` (never adopts it).
  test('an upgrade takes the violating sighting\'s confidence, and keeps or adopts data', () => {
    const confidence = { level: 'reduced', reason: 'Tab budget hit' };
    const [withConfidence] = dedupeFindings([
      finding({ severity: SEVERITY.NEEDS_REVIEW, passes: ['default'] }),
      finding({ severity: SEVERITY.VIOLATION, passes: ['dark'], confidence, data: { contrast: { fgColor: '#999999' } } }),
    ]);
    assert.deepEqual(withConfidence.confidence, confidence);
    assert.deepEqual(withConfidence.data, { contrast: { fgColor: '#999999' } });

    const [keptData] = dedupeFindings([
      finding({ severity: SEVERITY.NEEDS_REVIEW, passes: ['default'], data: { contrast: { fgColor: '#777777' } } }),
      finding({ severity: SEVERITY.VIOLATION, passes: ['dark'] }),
    ]);
    assert.deepEqual(keptData.data, { contrast: { fgColor: '#777777' } });
  });

  // Kills `if (!existing.suggestions && finding.suggestions)` → `true`, which
  // let a later sighting without suggestions wipe the first one's.
  test('a later sighting without suggestions does not wipe them', () => {
    const merged = dedupeFindings([
      finding({ passes: ['default'], suggestions: [{ hex: '#595959' }] }),
      finding({ passes: ['dark'] }),
    ]);
    assert.deepEqual(merged[0].suggestions, [{ hex: '#595959' }]);
  });

  // Kills `!existing.passes.includes(pass)` → `true` (a pass listed twice) and
  // the dedupe key's `state ?? ''` → `state && ''` (every named state merged).
  test('a pass is listed once, and two named states stay apart', () => {
    const merged = dedupeFindings([finding({ passes: ['default'] }), finding({ passes: ['dark', 'default'] })]);
    assert.deepEqual(merged[0].passes, ['default', 'dark']);
    assert.equal(dedupeFindings([finding({ state: 'menu-open' }), finding({ state: 'menu-closed' })]).length, 2);
  });

  // Kills `BEST_PRACTICE: 'bestPractice'` → `''`: these strings are the
  // `severity` values in every JSON report.
  test('severity values are the report schema strings', () => {
    assert.deepEqual(SEVERITY, { VIOLATION: 'violation', NEEDS_REVIEW: 'needsReview', BEST_PRACTICE: 'bestPractice' });
  });

  // Kills the `'dialog-initial-focus'` and `'role-button-keyboard-activation'`
  // entries of INFERRED_RULES → `''`.
  test('every driven-probe rule is inferred evidence', () => {
    for (const ruleId of [
      'keyboard-unreachable',
      'dialog-initial-focus',
      'dialog-focus-not-trapped',
      'dialog-escape-does-not-close',
      'dialog-focus-not-returned',
      'role-button-keyboard-activation',
      'div-button',
      'route-change-focus-lost',
      'status-message-not-announced',
    ]) {
      assert.equal(defaultEvidence({ ruleId, severity: SEVERITY.VIOLATION }), EVIDENCE.INFERRED, ruleId);
    }
  });

  // Kills `.trim()` dropped and `flat.length <= limit` → `<`.
  test('truncateHtml trims, and keeps a snippet of exactly the limit whole', () => {
    assert.equal(truncateHtml('  <b>x</b>  '), '<b>x</b>');
    const exact = `<p>${'x'.repeat(HTML_TRUNCATE_AT - 7)}</p>`;
    assert.equal(exact.length, HTML_TRUNCATE_AT);
    assert.equal(truncateHtml(exact), exact);
  });

  // Kills the defaults `html = ''` and `passes = []` → junk values, the array
  // selector's `.join(', ')` → `.join('')`, and `String(selector ?? '')` → junk.
  test('makeFinding defaults: no html, no passes, array and missing selectors', () => {
    const bare = makeFinding({ ruleId: 'reflow', source: 'a11y-loop', severity: SEVERITY.VIOLATION, sc: '1.4.10', selector: null, message: 'm' });
    assert.deepEqual([bare.html, bare.passes, bare.selector], ['', [], '']);
    assert.equal(finding({ selector: [['iframe', 'button']] }).selector, 'iframe, button');
  });
});
