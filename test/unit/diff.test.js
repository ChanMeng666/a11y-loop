import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { diffReports, formatDiffHuman } from '../../src/lib/diff.js';
import {
  makeReport,
  cleanReport,
  emptyButtonFinding,
  contrastFinding,
  targetSizeFinding,
} from '../helpers/report-fixture.js';

const fps = (findings) => findings.map((f) => f.fingerprint);

describe('diffReports', () => {
  test('all violations gone is a convergence', () => {
    const before = makeReport({ findings: [emptyButtonFinding(), contrastFinding()] });
    const after = cleanReport();
    const diff = diffReports(before, after);

    assert.equal(diff.summary.fixed, 2);
    assert.equal(diff.summary.new, 0);
    assert.equal(diff.summary.remaining, 0);
    assert.equal(diff.summary.regression, false);
    assert.equal(diff.summary.converged, true);
    assert.match(diff.summary.verdict, /^Converged: all 2 violations fixed/);
  });

  test('matches by fingerprint, so an unchanged finding is REMAINING not NEW', () => {
    const before = makeReport({ findings: [emptyButtonFinding(), contrastFinding()] });
    const after = makeReport({ findings: [contrastFinding()] });
    const diff = diffReports(before, after);

    assert.deepEqual(fps(diff.fixed), fps([emptyButtonFinding()]));
    assert.deepEqual(fps(diff.remaining), fps([contrastFinding()]));
    assert.equal(diff.summary.new, 0);
    assert.match(diff.summary.verdict, /^Progress: 1 fixed, 1 still present/);
  });

  test('a new violation is a regression even when the total count falls', () => {
    const before = makeReport({
      findings: [emptyButtonFinding({ selector: 'button:nth-child(1)' }), emptyButtonFinding({ selector: 'button:nth-child(2)' }), contrastFinding()],
    });
    const after = makeReport({ findings: [targetSizeFinding({ severity: 'violation' })] });
    const diff = diffReports(before, after);

    assert.equal(diff.summary.fixed, 3);
    assert.equal(diff.summary.new, 1);
    assert.equal(diff.summary.regression, true);
    assert.match(diff.summary.verdict, /^REGRESSION: 1 new violation introduced/);
  });

  test('unchanged text or class values do not register as new findings', () => {
    // The fingerprint drops attribute values, so restyling is not a regression.
    const before = makeReport({ findings: [emptyButtonFinding({ html: '<button class="a"></button>' })] });
    const after = makeReport({ findings: [emptyButtonFinding({ html: '<button class="b c"></button>' })] });
    const diff = diffReports(before, after);
    assert.equal(diff.summary.new, 0);
    assert.equal(diff.summary.remaining, 1);
  });

  test('a moved element is a fix plus a new finding, not silently identical', () => {
    const before = makeReport({ findings: [emptyButtonFinding({ selector: 'html > body > button' })] });
    const after = makeReport({
      findings: [emptyButtonFinding({ selector: 'html > body > main > button' })],
    });
    const diff = diffReports(before, after);
    assert.equal(diff.summary.fixed, 1);
    assert.equal(diff.summary.new, 1);
    assert.equal(diff.summary.regression, true);
  });

  test('needs-review findings are diffed separately and never cause a regression', () => {
    const before = cleanReport();
    const after = makeReport({ findings: [targetSizeFinding()] });
    const diff = diffReports(before, after);

    assert.equal(diff.summary.new, 0, 'needs-review must not count as a new violation');
    assert.equal(diff.summary.regression, false);
    assert.equal(diff.needsReview.new.length, 1);
    assert.equal(diff.summary.needsReviewNew, 1);
  });

  test('two clean reports produce the no-violations verdict', () => {
    const diff = diffReports(cleanReport(), cleanReport());
    assert.equal(diff.summary.converged, true);
    assert.equal(diff.summary.verdict, 'No violations in either report');
  });

  test('detects the oscillation case: A fixed, B broken', () => {
    const a = emptyButtonFinding({ selector: '#a' });
    const b = contrastFinding({ selector: '#b' });
    const first = diffReports(makeReport({ findings: [a] }), makeReport({ findings: [b] }));
    assert.equal(first.summary.regression, true);
    const second = diffReports(makeReport({ findings: [b] }), makeReport({ findings: [a] }));
    assert.equal(second.summary.regression, true);
  });

  test('tolerates reports with missing buckets', () => {
    const diff = diffReports({}, {});
    assert.equal(diff.summary.fixed, 0);
    assert.equal(diff.summary.regression, false);
  });
});

describe('formatDiffHuman', () => {
  test('renders a compact table and a one-line verdict', () => {
    const diff = diffReports(
      makeReport({ findings: [emptyButtonFinding(), contrastFinding()] }),
      makeReport({ findings: [contrastFinding()] }),
    );
    const text = formatDiffHuman(diff, { beforePath: 'a.json', afterPath: 'b.json' });
    const lines = text.trim().split('\n');

    assert.match(lines[0], /before: a\.json · after: b\.json/);
    assert.ok(text.includes('FIXED'));
    assert.ok(text.includes('REMAINING'));
    assert.match(text, /SC 4\.1\.2/);
    assert.match(text, /button-name/);
    assert.equal(lines.at(-1), diff.summary.verdict);
  });

  test('flags NEW rows for a regression', () => {
    const diff = diffReports(cleanReport(), makeReport({ findings: [emptyButtonFinding()] }));
    const text = formatDiffHuman(diff);
    assert.match(text, /^NEW\s+SC 4\.1\.2/m);
    assert.match(text, /REGRESSION/);
  });

  test('says so plainly when there is nothing to compare', () => {
    const text = formatDiffHuman(diffReports(cleanReport(), cleanReport()));
    assert.match(text, /No violations in either report/);
  });

  test('mentions new needs-review findings without calling them blocking', () => {
    const diff = diffReports(cleanReport(), makeReport({ findings: [targetSizeFinding()] }));
    const text = formatDiffHuman(diff);
    assert.match(text, /1 new needs-review finding\(s\) — not blocking, but new/);
  });
});

describe('diffReports: RECLASSIFIED, never FIXED', () => {
  // A 0.3.2-style report: the forced-colors row is a violation, no routedFrom.
  const before = () =>
    makeReport({
      findings: [
        emptyButtonFinding(),
        contrastFinding({ selector: 'html > body > div.card > p', passes: ['forced-colors'] }),
      ],
    });
  // The same page now: the button is fixed, the card row was only routed.
  const after = () =>
    makeReport({
      findings: [
        contrastFinding({
          selector: 'html > body > div.card > p',
          passes: ['forced-colors'],
          severity: 'needsReview',
          suggestions: undefined,
          note: 'axe-core reads -webkit-text-fill-color first.',
          noteUrl: 'https://example.test/note',
          routedFrom: 'violation',
        }),
      ],
    });

  test('a violation that moved to needs-review by a documented rule is reclassified, not fixed', () => {
    const diff = diffReports(before(), after());
    assert.equal(diff.summary.fixed, 1);
    assert.equal(diff.summary.reclassified, 1);
    assert.deepEqual(fps(diff.fixed), fps([emptyButtonFinding()]));
    assert.equal(diff.reclassified[0].routedFrom, 'violation');
    assert.equal(diff.summary.converged, true);
    assert.equal(
      diff.summary.verdict,
      'Converged: all 1 violation fixed, 1 reclassified to needs-review, none introduced',
    );
  });

  test('when the only change is the reclassification, nothing is called fixed', () => {
    const onlyRouted = makeReport({ findings: [before().findings.violations[1]] });
    const diff = diffReports(onlyRouted, after());
    assert.equal(diff.summary.fixed, 0);
    assert.equal(diff.summary.reclassified, 1);
    assert.equal(diff.summary.verdict, 'Converged: no violations fixed, 1 reclassified to needs-review, none introduced');
    assert.doesNotMatch(diff.summary.verdict, /all \d+ violations? fixed/);
  });

  test('a row that left violations into needs-review WITHOUT routedFrom is still fixed', () => {
    const plain = makeReport({
      findings: [contrastFinding({ selector: 'html > body > div.card > p', passes: ['forced-colors'], severity: 'needsReview' })],
    });
    const diff = diffReports(before(), plain);
    assert.equal(diff.summary.reclassified, 0);
    assert.equal(diff.summary.fixed, 2);
  });

  test('the human table labels the row RECLASSIFIED and says it is not fixed', () => {
    const text = formatDiffHuman(diffReports(before(), after()));
    assert.match(text, /^RECLASSIFIED\s+SC 1\.4\.3\s+color-contrast/m);
    assert.match(text, /1 RECLASSIFIED: still on the page, now reported under needs-review/);
    assert.match(text, /Not fixed\./);
  });
});

// Each test below kills a mutant of src/lib/diff.js that the tests above let
// survive; the comment names it. Equivalent mutants have no test here.
describe('diff: mutation-tested edges', () => {
  // Kills `remaining: [...afterMap.values()].filter(…)` → `[...afterMap.values()]`,
  // which counted a NEW violation as REMAINING too.
  test('a new violation is NEW only, not also REMAINING', () => {
    const diff = diffReports(
      makeReport({ findings: [emptyButtonFinding(), contrastFinding()] }),
      makeReport({ findings: [contrastFinding(), emptyButtonFinding({ selector: 'html > body > main > button' })] }),
    );
    assert.deepEqual(fps(diff.remaining), fps([contrastFinding()]));
    assert.deepEqual(fps(diff.new), fps([emptyButtonFinding({ selector: 'html > body > main > button' })]));
    // Kills the verdict's `${remaining} still present)` → ``.
    assert.equal(diff.summary.verdict, 'REGRESSION: 1 new violation introduced (1 fixed, 1 still present)');
  });

  // Kills `reclassified > 0` → `true` / `>= 0` and `needsReviewNew > 0` →
  // `true` / `>= 0`: a plain diff must not print "0 RECLASSIFIED … Not fixed."
  // or "0 new needs-review finding(s)".
  test('the RECLASSIFIED and needs-review notes appear only when there is something to say', () => {
    const text = formatDiffHuman(diffReports(makeReport({ findings: [emptyButtonFinding()] }), cleanReport()));
    assert.doesNotMatch(text, /RECLASSIFIED/);
    assert.doesNotMatch(text, /needs-review/);
  });

  // Kills `finding.wcag?.sc` → `finding.wcag.sc` (throws on a row with no
  // criterion), the `'—'` placeholder → `''`, and `selector || '(document)'`
  // mutated to `&&`, `true`, `false` or an empty placeholder.
  test('a row with no criterion and no selector still renders', () => {
    const diff = diffReports(
      cleanReport(),
      makeReport({ findings: [emptyButtonFinding({ tags: [], selector: '' }), contrastFinding()] }),
    );
    assert.equal(diff.new[0].wcag, null);
    const text = formatDiffHuman(diff);
    assert.match(text, /^NEW\s+—\s+button-name\s+\(document\)$/m);
    assert.match(text, /^NEW\s+SC 1\.4\.3\s+color-contrast\s+html > body > p$/m);
  });
});
