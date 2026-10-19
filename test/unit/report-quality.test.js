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
