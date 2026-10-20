/**
 * Report quality: evidence tiers, forced-colors routing, root-cause clusters,
 * budget-hit confidence, and the summary-first human output.
 *
 * The routing and clustering tests were each checked by mutation: remove the
 * forced-colors branch from reviewRouting(), or key clusters on selector alone,
 * and the tests named for them go red.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

import {
  makeFinding,
  dedupeFindings,
  bucketFindings,
  defaultEvidence,
  EVIDENCE,
  SEVERITY,
} from '../../src/lib/finding.js';
import {
  findingsFromAxeResults,
  reviewRouting,
  contrastDataForNode,
  FORCED_COLORS_NOTE_URL,
} from '../../src/lib/axe-runner.js';
import {
  buildClusters,
  selectorPattern,
  colourPairSummary,
  contrastCommand,
  contrastCause,
  describeCause,
} from '../../src/lib/cluster.js';
import { buildReport, serializeReport, SCHEMA_VERSION, findRedLineLanguage } from '../../src/lib/format/json.js';
import { formatHuman } from '../../src/lib/format/human.js';
import { keyboardFindings, MAX_TAB_STEPS } from '../../src/lib/checks/keyboard.js';
import { dialogFindings, MAX_WRAP_TICKS } from '../../src/lib/checks/dialog.js';
import { buildChecklist } from '../../src/lib/format/checklist.js';
import { TOOL } from '../helpers/report-fixture.js';

/** An axe `color-contrast` node as axe-core 4.14 returns it. */
function contrastNode(selector, fg, bg, ratio, expected = '4.5:1') {
  return {
    target: [selector],
    ancestry: [selector],
    html: `<p>${selector}</p>`,
    impact: 'serious',
    any: [
      {
        id: 'color-contrast',
        data: {
          fgColor: fg,
          bgColor: bg,
          contrastRatio: ratio,
          fontSize: '12.0pt (16px)',
          fontWeight: 'normal',
          expectedContrastRatio: expected,
        },
      },
    ],
    all: [],
    none: [],
    failureSummary: `Fix any of the following:\n  Element has insufficient color contrast of ${ratio} (foreground color: ${fg}, background color: ${bg})`,
  };
}

function contrastResults(nodes) {
  return {
    violations: [
      {
        id: 'color-contrast',
        impact: 'serious',
        tags: ['cat.color', 'wcag2aa', 'wcag143'],
        help: 'Elements must meet minimum color contrast ratio thresholds',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/color-contrast',
        nodes,
      },
    ],
    incomplete: [],
  };
}

describe('evidence tiers', () => {
  test('axe violations and static own checks are measured', () => {
    assert.equal(defaultEvidence({ ruleId: 'color-contrast', severity: SEVERITY.VIOLATION }), EVIDENCE.MEASURED);
    assert.equal(defaultEvidence({ ruleId: 'positive-tabindex', severity: SEVERITY.VIOLATION }), EVIDENCE.MEASURED);
    assert.equal(defaultEvidence({ ruleId: 'region', severity: SEVERITY.BEST_PRACTICE }), EVIDENCE.MEASURED);
  });

  test('violations concluded from a driven probe are inferred', () => {
    for (const ruleId of ['keyboard-unreachable', 'dialog-focus-not-trapped', 'dialog-escape-does-not-close', 'div-button']) {
      assert.equal(defaultEvidence({ ruleId, severity: SEVERITY.VIOLATION }), EVIDENCE.INFERRED, ruleId);
    }
  });

  test('every needs-review row is needs-review, whatever produced it', () => {
    assert.equal(defaultEvidence({ ruleId: 'color-contrast', severity: SEVERITY.NEEDS_REVIEW }), EVIDENCE.NEEDS_REVIEW);
    assert.equal(defaultEvidence({ ruleId: 'keyboard-unreachable', severity: SEVERITY.NEEDS_REVIEW }), EVIDENCE.NEEDS_REVIEW);
  });

  test('makeFinding sets evidence, and leaves the fingerprint exactly as before', () => {
    const spec = { ruleId: 'button-name', source: 'axe', severity: SEVERITY.VIOLATION, selector: 'html > body > button', html: '<button></button>', message: 'x' };
    const finding = makeFinding(spec);
    assert.equal(finding.evidence, EVIDENCE.MEASURED);
    // The fingerprint of this exact finding before any of this work existed.
    assert.equal(finding.fingerprint, makeFinding({ ...spec, evidence: EVIDENCE.INFERRED, note: 'n' }).fingerprint);
  });
});

describe('forced-colors contrast routing', () => {
  const nodes = () => [contrastNode('html > body > div > p', '#e8e6ef', '#ffffff', 1.23)];

  test('a color-contrast violation from the forced-colors pass lands in needsReview with its note', () => {
    const [finding] = findingsFromAxeResults(contrastResults(nodes()), { passName: 'forced-colors' });
    assert.equal(finding.severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(finding.evidence, EVIDENCE.NEEDS_REVIEW);
    assert.equal(finding.routedFrom, SEVERITY.VIOLATION);
    assert.match(finding.note, /-webkit-text-fill-color/);
    assert.equal(finding.noteUrl, FORCED_COLORS_NOTE_URL);
    assert.equal(finding.suggestions, undefined, 'a colour derived from the mismatched pair must not be suggested');
    assert.deepEqual(finding.data.contrast.fgColor, '#e8e6ef');
  });

  test('the same violation from every other pass stays a violation', () => {
    for (const passName of ['default', 'dark', 'reduced-motion', 'reflow']) {
      const [finding] = findingsFromAxeResults(contrastResults(nodes()), { passName });
      assert.equal(finding.severity, SEVERITY.VIOLATION, passName);
      assert.equal(finding.routedFrom, undefined, passName);
      assert.equal(finding.note, undefined, passName);
    }
  });

  test('only contrast rules move: another rule in the forced-colors pass stays a violation', () => {
    assert.equal(reviewRouting('button-name', 'forced-colors'), null);
    assert.equal(reviewRouting('color-contrast', 'default'), null);
    assert.equal(reviewRouting('target-size', 'default').routed, false);
  });

  test('a row that fails in the default pass is still a violation after dedupe, with no routing note', () => {
    const fromDefault = findingsFromAxeResults(contrastResults(nodes()), { passName: 'default' });
    const fromForced = findingsFromAxeResults(contrastResults(nodes()), { passName: 'forced-colors' });
    const [merged] = dedupeFindings([...fromDefault, ...fromForced]);
    assert.equal(merged.severity, SEVERITY.VIOLATION);
    assert.deepEqual(merged.passes, ['default', 'forced-colors']);
    assert.equal(merged.note, undefined);
    assert.equal(merged.routedFrom, undefined);
  });

  test('a routed row later seen failing in another pass is promoted and loses the note', () => {
    const fromForced = findingsFromAxeResults(contrastResults(nodes()), { passName: 'forced-colors' });
    const fromReflow = findingsFromAxeResults(contrastResults(nodes()), { passName: 'reflow' });
    const [merged] = dedupeFindings([...fromForced, ...fromReflow]);
    assert.equal(merged.severity, SEVERITY.VIOLATION);
    assert.equal(merged.evidence, EVIDENCE.MEASURED);
    assert.equal(merged.note, undefined);
    assert.equal(merged.noteUrl, undefined);
    assert.equal(merged.routedFrom, undefined);
  });

  test('axe incomplete rows are untouched by the routing', () => {
    const results = { violations: [], incomplete: contrastResults(nodes()).violations };
    const [finding] = findingsFromAxeResults(results, { passName: 'forced-colors' });
    assert.equal(finding.severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(finding.routedFrom, undefined);
  });

  test('contrastDataForNode keeps the measured values and nothing else', () => {
    assert.deepEqual(contrastDataForNode(contrastNode('p', '#999999', '#ffffff', 2.84)), {
      fgColor: '#999999',
      bgColor: '#ffffff',
      contrastRatio: 2.84,
      expectedContrastRatio: '4.5:1',
      fontSize: '12.0pt (16px)',
      fontWeight: 'normal',
    });
    assert.equal(contrastDataForNode({ any: [], all: [], none: [] }), undefined);
  });
});

describe('root-cause clusters', () => {
  const contrastRows = () =>
    findingsFromAxeResults(
      contrastResults([
        contrastNode('html > body > p:nth-child(1)', '#999999', '#ffffff', 2.84),
        contrastNode('html > body > p:nth-child(2)', '#999999', '#ffffff', 2.84),
        contrastNode('html > body > footer > span', '#999999', '#FFFFFF', 2.84),
        contrastNode('html > body > p:nth-child(4)', '#b0b0b0', '#ffffff', 2.16),
        contrastNode('html > body > h2', '#999999', '#ffffff', 2.84, '3:1'),
      ]),
      { passName: 'default' },
    );

  test('contrast rows cluster by colour pair and required ratio, not by where they sit', () => {
    const clusters = buildClusters(bucketFindings(contrastRows()));
    assert.equal(clusters.length, 1);
    const [cluster] = clusters;
    assert.equal(cluster.kind, 'colour-pair');
    assert.equal(cluster.count, 3, 'the footer span shares the pair; case in the hex does not split it');
    assert.deepEqual(cluster.cause, {
      foreground: '#999999',
      background: '#ffffff',
      contrastRatio: 2.84,
      expectedContrastRatio: '4.5:1',
    });
    assert.equal(cluster.causeText, '#999999 text on #ffffff: 2.84:1 against 4.5:1 required');
    assert.equal(cluster.fixCommand, 'a11y-loop contrast "#999999" "#ffffff" --fix');
    assert.ok(cluster.suggestions?.length, 'the fix is given once per cluster');
    assert.equal(cluster.representative.selector, 'html > body > p:nth-child(1)');
  });

  test('every finding stays in findings, and belongs to at most one cluster', () => {
    const findings = contrastRows();
    const report = buildReport({
      tool: TOOL,
      target: { type: 'url', value: 'http://x.test/' },
      findings,
      manualChecklist: [],
    });
    assert.equal(report.findings.violations.length, 5);
    const members = report.clusters.flatMap((c) => c.fingerprints);
    assert.equal(new Set(members).size, members.length);
    for (const fp of members) assert.ok(findings.some((f) => f.fingerprint === fp));
  });

  test('a cluster needs two members; singletons are the long tail', () => {
    const clusters = buildClusters(bucketFindings(contrastRows().slice(3)));
    assert.deepEqual(clusters, []);
  });

  test('non-contrast rows cluster by selector pattern', () => {
    assert.equal(selectorPattern('ul > li:nth-child(3) > a:nth-of-type(2)'), 'ul > li:nth-child(n) > a:nth-of-type(n)');
    const links = [1, 2, 3].map((n) =>
      makeFinding({ ruleId: 'link-name', source: 'axe', severity: SEVERITY.VIOLATION, tags: ['wcag2a', 'wcag244'], selector: `footer > a:nth-child(${n})`, html: '<a href="#"></a>', message: 'm', passes: ['default'] }),
    );
    const [cluster] = buildClusters(bucketFindings(links));
    assert.equal(cluster.kind, 'selector-pattern');
    assert.equal(cluster.count, 3);
    assert.equal(cluster.cause.selectorPattern, 'footer > a:nth-child(n)');
    assert.equal(cluster.fixCommand, undefined);
  });

  test('clusters never mix buckets or states', () => {
    const base = { ruleId: 'link-name', source: 'axe', tags: ['wcag2a'], html: '<a></a>', message: 'm', passes: ['default'] };
    const findings = [
      makeFinding({ ...base, severity: SEVERITY.VIOLATION, selector: 'a:nth-child(1)' }),
      makeFinding({ ...base, severity: SEVERITY.NEEDS_REVIEW, selector: 'a:nth-child(2)' }),
      makeFinding({ ...base, severity: SEVERITY.VIOLATION, selector: 'a:nth-child(3)', state: 'menu-open' }),
    ];
    assert.deepEqual(buildClusters(bucketFindings(findings)), []);
  });

  test('cluster ids are stable across runs and orderings', () => {
    const a = buildClusters(bucketFindings(contrastRows()));
    const b = buildClusters(bucketFindings(contrastRows().reverse()));
    assert.equal(a[0].id, b[0].id);
    assert.match(a[0].id, /^cl-[0-9a-f]{10}$/);
  });

  test('colourPairSummary counts distinct pairs behind the rows', () => {
    assert.deepEqual(colourPairSummary(contrastRows()), { pairs: 3, rows: 5 });
  });

  test('a large-text pair gets --large in its command', () => {
    assert.equal(
      contrastCommand({ foreground: '#585858', background: '#1a1a1a', expectedContrastRatio: '3:1' }),
      'a11y-loop contrast "#585858" "#1a1a1a" --large --fix',
    );
  });
});

describe('budget-hit confidence', () => {
  const ctx = { passes: ['default'], state: null };

  test('keyboard-unreachable carries reduced confidence when the Tab walk used its whole budget', () => {
    const survey = { expected: ['#a', '#b'], observed: ['#a'], positiveTabindex: [] };
    const [plain] = keyboardFindings(survey, ctx);
    assert.equal(plain.confidence, undefined);
    assert.equal(plain.evidence, EVIDENCE.INFERRED);
    const [capped] = keyboardFindings({ ...survey, budgetExhausted: true }, ctx);
    assert.equal(capped.confidence.level, 'reduced');
    assert.match(capped.confidence.reason, new RegExp(`all ${MAX_TAB_STEPS} presses`));
    assert.equal(capped.severity, SEVERITY.VIOLATION, 'confidence never changes the severity');
  });

  test('dialog-focus-not-trapped carries reduced confidence when the wrap budget decided it', () => {
    const observation = {
      selector: '#dlg',
      html: '<div role="dialog">',
      focusMovedIntoDialog: true,
      focusTrapped: false,
      escapedTo: 'html > body > span',
      escapeClosed: true,
      focusReturnedToTrigger: true,
      trigger: '#open',
    };
    const [plain] = dialogFindings(observation, ctx);
    assert.equal(plain.confidence, undefined);
    const [capped] = dialogFindings({ ...observation, wrapBudgetExhausted: true }, ctx);
    assert.equal(capped.ruleId, 'dialog-focus-not-trapped');
    assert.match(capped.confidence.reason, new RegExp(`more than ${MAX_WRAP_TICKS} Tab`));
  });
});

describe('JSON report: additive schema 2 fields', () => {
  test('schemaVersion, clusters and the evidence summary are present, and old keys are unchanged', () => {
    const report = buildReport({
      tool: TOOL,
      target: { type: 'url', value: 'http://x.test/' },
      findings: [],
      manualChecklist: [],
    });
    assert.equal(report.schemaVersion, SCHEMA_VERSION);
    assert.equal(SCHEMA_VERSION, 2);
    assert.deepEqual(report.clusters, []);
    for (const key of ['tool', 'target', 'summary', 'findings', 'manualChecklist', 'pageInventory']) {
      assert.ok(key in report, key);
    }
    for (const key of ['violations', 'needsReview', 'bestPractice', 'manualChecklist', 'byImpact', 'criteriaAffected', 'verdict', 'coverage']) {
      assert.ok(key in report.summary, key);
    }
    assert.deepEqual(report.summary.evidence.violations, { measured: 0, inferred: 0, 'needs-review': 0 });
    assert.equal(report.summary.clusters.total, 0);
  });
});

// ---- Human output snapshots ------------------------------------------------

function snapshotReport() {
  const contrast = findingsFromAxeResults(
    contrastResults([
      contrastNode('html > body > main > p:nth-child(1)', '#999999', '#ffffff', 2.84),
      contrastNode('html > body > main > p:nth-child(2)', '#999999', '#ffffff', 2.84),
      contrastNode('html > body > main > p:nth-child(3)', '#999999', '#ffffff', 2.84),
      contrastNode('html > body > footer > p', '#b0b0b0', '#ffffff', 2.16),
    ]),
    { passName: 'default' },
  );
  const routed = findingsFromAxeResults(
    contrastResults([contrastNode('html > body > div.card > p', '#e8e6ef', '#ffffff', 1.23)]),
    { passName: 'forced-colors' },
  );
  const keyboard = keyboardFindings(
    { expected: ['#late'], observed: [], positiveTabindex: [], expectedDetails: [{ selector: '#late', html: '<a href="#">late</a>' }], budgetExhausted: true },
    { passes: ['default'], state: null },
  );
  const facts = { images: 0, formFields: 0, links: 1, headings: 1, ariaAttributes: 0 };
  return buildReport({
    tool: TOOL,
    target: { type: 'file', value: 'page.html', servedAt: 'http://127.0.0.1:1234/' },
    findings: dedupeFindings([...contrast, ...routed, ...keyboard]),
    manualChecklist: buildChecklist({ facts, incompleteRuleIds: [], statesRun: [] }),
    facts,
  });
}

const SNAPSHOT_DIR = new URL('../fixtures/golden/', import.meta.url);

/** Compare against a stored snapshot; UPDATE_SNAPSHOTS=1 rewrites it. */
function matchSnapshot(name, text) {
  const url = new URL(name, SNAPSHOT_DIR);
  if (process.env.UPDATE_SNAPSHOTS === '1') writeFileSync(url, text, 'utf8');
  const expected = readFileSync(url, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(text, expected);
}

describe('human output: summary first, clusters, then the long tail', () => {
  test('matches the stored snapshot', () => {
    matchSnapshot('human-summary-first.txt', formatHuman(snapshotReport()));
  });

  test('--verbose lists every member of a cluster (snapshot)', () => {
    matchSnapshot('human-summary-first-verbose.txt', formatHuman(snapshotReport(), { verbose: true }));
  });

  test('the summary block comes before any section and names the exit code', () => {
    const text = formatHuman(snapshotReport());
    const summaryAt = text.indexOf('\nSUMMARY\n');
    assert.ok(summaryAt > 0);
    assert.ok(summaryAt < text.indexOf('\nVIOLATIONS ('));
    assert.match(text, /Exit 1: 5 automatically detectable failures\./);
    assert.match(text, /5 violations: 4 measured, 1 inferred, 1 of them with reduced confidence/);
    assert.match(text, /1 forced-colors contrast row moved here from violations/);
    assert.match(text, /\+2 more like this/);
  });

  test('the cluster rows are collapsed by default and the representative is the first', () => {
    const text = formatHuman(snapshotReport());
    assert.ok(text.includes('e.g. html > body > main > p:nth-child(1)'));
    assert.equal(text.includes('html > body > main > p:nth-child(3)'), false);
    assert.ok(formatHuman(snapshotReport(), { verbose: true }).includes('html > body > main > p:nth-child(3)'));
  });

  test('a clean report says exit 0 is not a conformance claim', () => {
    const report = buildReport({ tool: TOOL, target: { type: 'url', value: 'http://x.test/' }, findings: [], manualChecklist: [] });
    assert.match(formatHuman(report), /Exit 0: no automatically detectable failures in the passes and states run\. That is not a conformance claim\./);
  });

  test('a version-1 report (no clusters, no evidence) still renders', () => {
    const report = JSON.parse(serializeReport(snapshotReport()));
    delete report.schemaVersion;
    delete report.clusters;
    delete report.summary.evidence;
    delete report.summary.clusters;
    delete report.summary.colourPairs;
    const text = formatHuman(report);
    assert.match(text, /Root causes: 1 cluster covers 3 of/);
  });

  test('no red-line language in either form', () => {
    assert.deepEqual(findRedLineLanguage(formatHuman(snapshotReport())), []);
    assert.deepEqual(findRedLineLanguage(formatHuman(snapshotReport(), { verbose: true })), []);
    assert.deepEqual(findRedLineLanguage(serializeReport(snapshotReport())), []);
  });
});

// Each test below kills a mutant of src/lib/cluster.js that the tests above let
// survive; the comment names it. Equivalent mutants have no test here.
describe('root-cause clusters: mutation-tested edges', () => {
  const link = (n, overrides = {}) =>
    makeFinding({
      ruleId: 'link-name',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      tags: ['wcag2a', 'wcag244'],
      selector: `footer > a:nth-child(${n})`,
      html: '<a href="#"></a>',
      message: 'm',
      passes: ['default'],
      ...overrides,
    });
  const pairRow = (n, overrides = {}) =>
    makeFinding({
      ruleId: 'color-contrast',
      source: 'axe',
      severity: SEVERITY.VIOLATION,
      tags: ['wcag2aa', 'wcag143'],
      selector: `p:nth-child(${n})`,
      html: '<p>x</p>',
      message: 'm',
      passes: ['default'],
      data: { contrast: { fgColor: '#999999', bgColor: '#ffffff', contrastRatio: 2.84, expectedContrastRatio: '4.5:1' } },
      ...overrides,
    });

  // Kills `members.length < MIN_CLUSTER_SIZE` → `<=`.
  test('two members are enough for a cluster', () => {
    const clusters = buildClusters(bucketFindings([link(1), link(2)]));
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].count, 2);
  });

  // Kills the `['needsReview', …]` and `['bestPractice', …]` order entries
  // mutated to `[]` or to an empty bucket name.
  test('needs-review and best-practice rows cluster in their own buckets', () => {
    const clusters = buildClusters(
      bucketFindings([
        link(1, { severity: SEVERITY.NEEDS_REVIEW }),
        link(2, { severity: SEVERITY.NEEDS_REVIEW }),
        link(1, { severity: SEVERITY.BEST_PRACTICE, ruleId: 'region' }),
        link(2, { severity: SEVERITY.BEST_PRACTICE, ruleId: 'region' }),
      ]),
    );
    assert.deepEqual(clusters.map((c) => [c.ruleId, c.severity]), [
      ['link-name', SEVERITY.NEEDS_REVIEW],
      ['region', SEVERITY.BEST_PRACTICE],
    ]);
  });

  // Kills the sort comparator mutants (removed, `b.count + a.count`, `&&`,
  // `a.seq + b.seq`, constant true/false) and `seq++` → `seq--`.
  test('clusters are ordered largest first, then by first appearance', () => {
    const rows = [
      link(1, { ruleId: 'a-rule' }),
      link(2, { ruleId: 'a-rule' }),
      link(1, { ruleId: 'b-rule' }),
      link(2, { ruleId: 'b-rule' }),
      link(1, { ruleId: 'c-rule' }),
      link(2, { ruleId: 'c-rule' }),
      link(3, { ruleId: 'c-rule' }),
      link(1, { ruleId: 'd-rule' }),
      link(2, { ruleId: 'd-rule' }),
    ];
    assert.deepEqual(buildClusters(bucketFindings(rows)).map((c) => c.ruleId), ['c-rule', 'a-rule', 'b-rule', 'd-rule']);
  });

  // Kills `finding.state ?? null` → `&& null`, `first.evidence ?? null` →
  // `&& null`, `first.wcag ?? null` → `&& null`, and `state ?? ''` → `state && ''`
  // in clusterId (which made the same cause in two states share one id).
  test('a cluster carries its state, evidence and criterion, and its id depends on the state', () => {
    const clusters = buildClusters(
      bucketFindings([link(1, { state: 'menu-open' }), link(2, { state: 'menu-open' }), link(1, { state: 'menu-closed' }), link(2, { state: 'menu-closed' })]),
    );
    assert.deepEqual(clusters.map((c) => c.state), ['menu-open', 'menu-closed']);
    assert.equal(clusters[0].evidence, EVIDENCE.MEASURED);
    assert.equal(clusters[0].wcag.sc, '2.4.4');
    assert.notEqual(clusters[0].id, clusters[1].id);
  });

  // Kills clusterId's `[bucket, ruleId, …]` → `[]`, which gives every cluster one id.
  test('different causes get different cluster ids', () => {
    const clusters = buildClusters(bucketFindings([link(1), link(2), pairRow(1), pairRow(2)]));
    assert.equal(clusters.length, 2);
    assert.notEqual(clusters[0].id, clusters[1].id);
  });

  // Kills `group.kind === 'colour-pair' && suggestions` → `||` and → `true`.
  // A routed forced-colors row has its suggestion dropped, so its cluster must
  // not hand out a fix command either.
  test('a colour-pair cluster without suggestions has no fix command', () => {
    const [cluster] = buildClusters(bucketFindings([pairRow(1), pairRow(2)]));
    assert.equal(cluster.kind, 'colour-pair');
    assert.equal(cluster.fixCommand, undefined);
  });

  // Kills `members.find((m) => m.note)` → `() => undefined`, `if (note)` →
  // `false` or an empty block, and `if (note.noteUrl)` → `false`.
  test('a routed row\'s note and noteUrl reach its cluster', () => {
    const routed = { severity: SEVERITY.NEEDS_REVIEW, passes: ['forced-colors'], note: 'axe reads the fill colour first.', noteUrl: 'https://example.test/n', routedFrom: 'violation' };
    const [cluster] = buildClusters(bucketFindings([pairRow(1, routed), pairRow(2, routed)]));
    assert.equal(cluster.note, routed.note);
    assert.equal(cluster.noteUrl, routed.noteUrl);
  });

  // Kills `'color-contrast-enhanced'` → `''` in CONTRAST_RULES.
  test('color-contrast-enhanced rows cluster by colour pair too', () => {
    const enhanced = { ruleId: 'color-contrast-enhanced', tags: ['wcag2aaa', 'wcag146'] };
    const [cluster] = buildClusters(bucketFindings([pairRow(1, enhanced), pairRow(2, enhanced)]));
    assert.equal(cluster.kind, 'colour-pair');
  });

  // Kills `!CONTRAST_RULES.has(ruleId)` → `false` and `!fg || !bg` → `&&`.
  test('only a contrast rule with both colours measured has a colour-pair cause', () => {
    const contrast = { fgColor: '#999999', bgColor: '#ffffff' };
    assert.equal(contrastCause({ ruleId: 'link-in-text-block', data: { contrast } }), null);
    assert.equal(contrastCause({ ruleId: 'color-contrast', data: { contrast: { fgColor: '#999999' } } }), null);
  });

  // Kills `[^)]*` → `[^)]` in selectorPattern.
  test('a multi-digit index is replaced too', () => {
    assert.equal(selectorPattern('ul > li:nth-child(12) > a'), 'ul > li:nth-child(n) > a');
  });

  // Kills `cluster.kind === 'colour-pair'` → `true` in describeCause, the
  // selector sentence mutated to an empty string, and ratioText's null and
  // undefined checks (→ `false`, `&&`) and its `'?'` → `''`.
  test('describeCause words both kinds, with ? for a ratio axe did not give', () => {
    assert.equal(
      describeCause({ kind: 'selector-pattern', cause: { selectorPattern: 'a:nth-child(n)' } }),
      'the same rule on elements matching a:nth-child(n)',
    );
    assert.equal(
      describeCause({ kind: 'colour-pair', cause: { foreground: '#999999', background: '#ffffff', contrastRatio: null, expectedContrastRatio: undefined } }),
      '#999999 text on #ffffff: ?:1 against ?:1 required',
    );
  });
});
