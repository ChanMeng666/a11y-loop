import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildReport,
  serializeReport,
  affectedCriteria,
  findRedLineLanguage,
  CLEAN_VERDICT,
  COVERAGE,
} from '../../src/lib/format/json.js';
import { formatHuman, findingHeadline, groupFindings, describeTarget } from '../../src/lib/format/human.js';
import { buildChecklist } from '../../src/lib/format/checklist.js';
import { toAxeShape, toSarif, wcagTaxa, GITHUB_LIMITATION_NOTE } from '../../src/lib/format/sarif.js';
import { SEVERITY } from '../../src/lib/finding.js';
import {
  makeReport,
  cleanReport,
  emptyButtonFinding,
  contrastFinding,
  targetSizeFinding,
  bestPracticeFinding,
  dialogFinding,
  TOOL,
} from '../helpers/report-fixture.js';

describe('buildReport', () => {
  test('separates the three buckets and never counts best-practice as a violation', () => {
    const report = makeReport();
    assert.equal(report.findings.violations.length, 2);
    assert.equal(report.findings.needsReview.length, 1);
    assert.equal(report.findings.bestPractice.length, 1);
    assert.equal(report.summary.violations, 2);
    assert.equal(
      report.findings.violations.some((f) => f.severity === SEVERITY.BEST_PRACTICE),
      false,
    );
  });

  test('uses the exact clean-run sentence when there are no violations', () => {
    const report = cleanReport();
    assert.equal(report.summary.verdict, CLEAN_VERDICT);
    assert.equal(report.summary.verdict, 'No automatically detectable failures');
  });

  test('counts failures with correct pluralisation', () => {
    assert.equal(
      makeReport({ findings: [emptyButtonFinding()] }).summary.verdict,
      '1 automatically detectable failure',
    );
    assert.equal(
      makeReport({ findings: [emptyButtonFinding(), contrastFinding()] }).summary.verdict,
      '2 automatically detectable failures',
    );
  });

  test('records provenance and the WCAG 2.2 AA target', () => {
    const report = makeReport();
    assert.equal(report.tool.axeCoreVersion, '4.12.1');
    assert.equal(report.tool.browser, 'Chromium');
    assert.deepEqual(report.tool.viewport, { width: 1280, height: 720 });
    assert.equal(report.tool.passesRun.length, 5);
    assert.equal(report.summary.target, 'WCAG 2.2 Level AA');
    assert.match(report.tool.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  test('reports coverage with denominators attached', () => {
    const { coverage } = makeReport().summary;
    assert.equal(coverage.issueVolumePercent, 57);
    assert.equal(coverage.criteriaWithAnyAutomatedRulePercent, 31);
    assert.equal(coverage.criteriaReliablyAutomatedPercent, 13);
    assert.equal(coverage.criteriaUntestableByAnyTool, 9);
    assert.match(coverage.issueVolumeDenominator, /volume|instances/i);
    assert.match(coverage.statement, /not an audit or conformance claim/);
  });

  test('counts impacts and WCAG 2.2-only violations', () => {
    const report = makeReport({
      findings: [
        emptyButtonFinding(),
        contrastFinding(),
        targetSizeFinding({ severity: SEVERITY.VIOLATION }),
      ],
    });
    assert.deepEqual(report.summary.byImpact, { critical: 1, serious: 1, moderate: 1 });
    assert.equal(report.summary.wcag22OnlyViolations, 1);
  });

  test('summarises the criteria affected, in criterion order', () => {
    const criteria = affectedCriteria([contrastFinding(), emptyButtonFinding()]);
    assert.deepEqual(
      criteria.map((c) => c.sc),
      ['1.4.3', '4.1.2'],
    );
    assert.equal(criteria[0].name, 'Contrast (Minimum)');
  });

  test('serialises as indented JSON with a trailing newline', () => {
    const text = serializeReport(makeReport());
    assert.ok(text.endsWith('\n'));
    assert.doesNotThrow(() => JSON.parse(text));
    assert.ok(text.includes('\n  "tool"'));
  });
});

describe('report language — the credibility red lines', () => {
  const redLineFor = (text) => findRedLineLanguage(text);

  test('detects the phrases a tool must never use', () => {
    assert.ok(redLineFor('This page is compliant with WCAG 2.2').length > 0);
    assert.ok(redLineFor('your site is accessible').length > 0);
    assert.ok(redLineFor('passed WCAG 2.1 AA').length > 0);
    assert.ok(redLineFor('guarantees conformance').length > 0);
    assert.ok(redLineFor('no manual testing required').length > 0);
    assert.ok(redLineFor('accessibility score: 92').length > 0);
    assert.ok(redLineFor('reduces legal risk').length > 0);
  });

  test('does not fire on legitimate technical language', () => {
    assert.deepEqual(redLineFor('Element has no accessible name'), []);
    assert.deepEqual(redLineFor('aria-label provides the accessible name'), []);
    assert.deepEqual(redLineFor('No automatically detectable failures'), []);
  });

  test('the clean verdict and coverage statement are clear of red lines', () => {
    assert.deepEqual(redLineFor(CLEAN_VERDICT), []);
    assert.deepEqual(redLineFor(COVERAGE.statement), []);
  });

  test('a full clean human report contains no conformance claim', () => {
    const text = formatHuman(cleanReport());
    assert.deepEqual(findRedLineLanguage(text), []);
    assert.ok(text.includes(CLEAN_VERDICT));
  });

  test('a full report with findings contains no conformance claim', () => {
    assert.deepEqual(findRedLineLanguage(formatHuman(makeReport())), []);
  });

  test('the serialised JSON report contains no conformance claim', () => {
    assert.deepEqual(findRedLineLanguage(serializeReport(makeReport())), []);
  });
});

describe('findingHeadline', () => {
  test('renders SC first, then ACT, then the axe rule id', () => {
    assert.equal(
      findingHeadline(emptyButtonFinding()),
      'SC 4.1.2 Name, Role, Value (Level A) · ACT 97a4e1, m6b1q3 · axe: button-name',
    );
  });

  test('marks own checks as a11y-loop and flags WCAG 2.2-only criteria', () => {
    const headline = findingHeadline(targetSizeFinding());
    assert.match(headline, /^SC 2\.5\.8 Target Size \(Minimum\) \(Level AA\)/);
    assert.match(headline, /a11y-loop: target-size-min/);
    assert.match(headline, /WCAG 2\.2 only/);
  });

  test('falls back to the rule id when there is no criterion', () => {
    assert.equal(findingHeadline(bestPracticeFinding()), 'axe: region');
  });
});

describe('groupFindings', () => {
  test('groups findings sharing a rule, and splits by state', () => {
    const groups = groupFindings([
      emptyButtonFinding({ selector: 'button:nth-child(1)' }),
      emptyButtonFinding({ selector: 'button:nth-child(2)' }),
      contrastFinding(),
      emptyButtonFinding({ selector: 'button:nth-child(3)', state: 'modal-open' }),
    ]);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].items.length, 2);
    assert.equal(groups[2].state, 'modal-open');
  });
});

describe('formatHuman', () => {
  test('shows every section with counts', () => {
    const text = formatHuman(makeReport());
    assert.match(text, /VIOLATIONS \(2\)/);
    assert.match(text, /NEEDS REVIEW \(1\)/);
    assert.match(text, /BEST PRACTICE \(1\)/);
    assert.match(text, /MANUAL CHECKS \(\d+\)/);
  });

  test('labels needs-review as not a pass and points at where to look', () => {
    const text = formatHuman(makeReport());
    assert.match(text, /not passes/);
    assert.match(text, /needsReview array/);
  });

  test('marks best practice as non-blocking with no criterion', () => {
    assert.match(formatHuman(makeReport()), /no success criterion, non-blocking/);
  });

  test('prints contrast fix suggestions with before and after ratios', () => {
    const text = formatHuman(makeReport());
    assert.match(text, /fix: text darker → #767676 \(ratio 4\.54:1\)/);
  });

  test('notes when a finding only appeared in non-default passes', () => {
    const text = formatHuman(
      makeReport({ findings: [contrastFinding({ passes: ['dark', 'forced-colors'] })] }),
    );
    assert.match(text, /\[only under: dark, forced-colors\]/);
  });

  test('tags state-specific findings with the state name', () => {
    const text = formatHuman(makeReport({ findings: [dialogFinding()], statesRun: ['dialog-open'] }));
    assert.match(text, /state: dialog-open/);
  });

  test('always ends with provenance and the coverage statement', () => {
    const text = formatHuman(makeReport());
    assert.match(text, /Provenance: a11y-loop 0\.1\.0 · axe-core 4\.12\.1 · Chromium/);
    assert.match(text, /viewport 1280×720/);
    assert.match(text, /passes: default, dark, forced-colors, reduced-motion, reflow/);
    assert.ok(text.includes(COVERAGE.statement));
  });

  test('says explicitly when no interaction states were audited', () => {
    assert.match(formatHuman(makeReport()), /states: none \(use --interact/);
    assert.match(
      formatHuman(makeReport({ statesRun: ['modal-open'] })),
      /states: modal-open/,
    );
  });

  test('a clean report still shows the manual checklist', () => {
    const text = formatHuman(cleanReport());
    assert.match(text, /MANUAL CHECKS \(\d+\)/);
    assert.match(text, /No automatically detectable failures across 5 rendering passes/);
    assert.equal(/VIOLATIONS/.test(text), false);
  });

  test('--quiet is a single summary line', () => {
    const text = formatHuman(makeReport(), { quiet: true });
    assert.equal(text.trim().split('\n').length, 1);
    assert.match(text, /2 automatically detectable failures/);
    assert.match(text, /1 to review/);
  });

  test('describeTarget summarises a fragment instead of printing it', () => {
    assert.equal(
      describeTarget({ type: 'html', value: '<button></button>', servedAt: 'http://127.0.0.1:1/' }),
      'inline HTML fragment, 17 chars (served at http://127.0.0.1:1/)',
    );
    assert.equal(describeTarget({ type: 'url', value: 'http://x.test/' }), 'http://x.test/');
    assert.equal(
      describeTarget({ type: 'file', value: 'page.html', servedAt: 'http://127.0.0.1:2/' }),
      'page.html (served at http://127.0.0.1:2/)',
    );
  });
});

describe('buildChecklist', () => {
  test('always includes AT testing and focus-order judgment', () => {
    const ids = buildChecklist({ facts: {} }).map((i) => i.id);
    assert.ok(ids.includes('assistive-technology'));
    assert.ok(ids.includes('focus-order-logic'));
    assert.ok(ids.includes('keyboard-only-walkthrough'));
  });

  test('adds an alt-text item only when images are present', () => {
    assert.equal(
      buildChecklist({ facts: { images: 0 } }).some((i) => i.id === 'alt-text-quality'),
      false,
    );
    const item = buildChecklist({ facts: { images: 3 } }).find((i) => i.id === 'alt-text-quality');
    assert.ok(item);
    assert.match(item.text, /3 images/);
    assert.match(item.why, /alt="decorative image"/);
    assert.match(item.why, /draft/);
  });

  test('adds form items only when there are fields', () => {
    const withForm = buildChecklist({ facts: { formFields: 2 } }).map((i) => i.id);
    assert.ok(withForm.includes('form-error-quality'));
    assert.ok(withForm.includes('label-clarity'));
    assert.equal(
      buildChecklist({ facts: { formFields: 0 } }).some((i) => i.id === 'form-error-quality'),
      false,
    );
  });

  test('adds media, table, aria, dialog and motion items when relevant', () => {
    const has = (facts, id) => buildChecklist({ facts }).some((i) => i.id === id);
    assert.ok(has({ videos: 1 }, 'media-alternatives'));
    assert.ok(has({ tables: 1 }, 'table-reflow-meaning'));
    assert.ok(has({ ariaAttributes: 4 }, 'aria-appropriateness'));
    assert.ok(has({ dialogs: 1 }, 'dialog-behaviour'));
    assert.ok(has({ animations: 1 }, 'motion-essential'));
    assert.ok(has({ stickyElements: 1 }, 'focus-not-obscured'));
    assert.equal(has({}, 'media-alternatives'), false);
  });

  test('the ARIA item cites the WebAIM finding that ARIA correlates with more errors', () => {
    const item = buildChecklist({ facts: { ariaAttributes: 10 } }).find(
      (i) => i.id === 'aria-appropriateness',
    );
    assert.match(item.why, /59\.1 vs 42\.0/);
    assert.match(item.why, /role is a promise/);
  });

  test('adds engine-limitation notes for rules that actually came back incomplete', () => {
    const items = buildChecklist({
      facts: {},
      incompleteRuleIds: ['color-contrast', 'frame-tested'],
    });
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes('contrast-undeterminable'));
    assert.ok(ids.includes('cross-origin-frames'));
    const contrast = items.find((i) => i.id === 'contrast-undeterminable');
    assert.match(contrast.why, /background images, gradients/);
    assert.match(contrast.why, /1:1/);
  });

  test('does not add engine notes for rules that did not come back incomplete', () => {
    const ids = buildChecklist({ facts: {}, incompleteRuleIds: [] }).map((i) => i.id);
    assert.equal(ids.includes('contrast-undeterminable'), false);
    assert.equal(ids.includes('cross-origin-frames'), false);
  });

  test('flags untested hover/focus contrast only when no states were audited', () => {
    assert.ok(
      buildChecklist({ facts: {}, statesRun: [] }).some((i) => i.id === 'hover-focus-contrast'),
    );
    assert.equal(
      buildChecklist({ facts: {}, statesRun: ['hover'] }).some((i) => i.id === 'hover-focus-contrast'),
      false,
    );
  });

  test('every item explains why automation cannot do it', () => {
    for (const item of buildChecklist({
      facts: { images: 1, formFields: 1, links: 1, headings: 1, videos: 1, tables: 1, ariaAttributes: 1 },
      incompleteRuleIds: ['color-contrast'],
    })) {
      assert.ok(item.text?.length > 10, `${item.id} has no text`);
      assert.ok(item.why?.length > 20, `${item.id} has no why`);
    }
  });
});

describe('SARIF output', () => {
  test('maps our report onto an axe-shaped object', () => {
    const shape = toAxeShape(makeReport());
    assert.equal(shape.testEngine.version, '4.12.1');
    assert.equal(shape.testEnvironment.windowWidth, 1280);
    assert.ok(shape.violations.length >= 2);
    assert.ok(shape.incomplete.length >= 1);
    assert.equal(shape.url, '<button></button>');
  });

  test('carries ACT ids and WCAG tags through as tags', () => {
    const shape = toAxeShape(makeReport());
    const button = shape.violations.find((v) => v.id === 'button-name');
    assert.ok(button.tags.includes('wcag412'));
    assert.ok(button.tags.includes('wcag2a'));
    assert.ok(button.tags.includes('ACT-97a4e1'));
  });

  test('produces a valid SARIF 2.1 log carrying the GitHub limitation note', () => {
    const log = toSarif(makeReport());
    assert.equal(log.version, '2.1.0');
    assert.equal(log.runs.length, 1);
    assert.ok(log.runs[0].results.length > 0);
    assert.equal(log.runs[0].properties.a11yLoopNote, GITHUB_LIMITATION_NOTE);
    assert.match(GITHUB_LIMITATION_NOTE, /GitHub code scanning drops SARIF results/);
  });

  test('includes our own checks, not just axe rules', () => {
    const log = toSarif(makeReport({ findings: [dialogFinding()] }));
    const ruleIds = log.runs[0].results.map((r) => r.ruleId);
    assert.ok(ruleIds.includes('dialog-focus-not-trapped'));
  });
});

/**
 * axe-sarif-converter 3.1.0's output for the report below, captured with that
 * package still installed and then removed along with it. The direct writer
 * has to reproduce it, except where sarif.js's header says it deliberately
 * does not.
 */
describe('SARIF output matches the axe-sarif-converter golden file', () => {
  const golden = JSON.parse(
    readFileSync(new URL('../fixtures/golden/sarif-axe-sarif-converter-3.1.0.json', import.meta.url), 'utf8'),
  ).runs[0];

  const goldenFindings = () => [
    emptyButtonFinding(),
    emptyButtonFinding({ selector: 'html > body > div > button', html: '<button></button>' }),
    contrastFinding(),
    targetSizeFinding(),
    bestPracticeFinding(),
    dialogFinding(),
  ];
  // The golden file was captured from an --html report. targetType 'url' keeps
  // the same target value, so everything except the --html artifact handling
  // can be compared field for field.
  const run = toSarif(makeReport({ findings: goldenFindings(), targetType: 'url' })).runs[0];
  const withoutRelationships = (rules) => rules.map(({ relationships, ...rule }) => rule);

  test('same results: rule ids, count, kinds, levels, message text and locations', () => {
    assert.equal(run.results.length, golden.results.length);
    assert.deepEqual(
      run.results.map((r) => [r.ruleId, r.kind, r.level, r.message.text]),
      golden.results.map((r) => [r.ruleId, r.kind, r.level, r.message.text]),
    );
    assert.deepEqual(run.results, golden.results);
  });

  test('same rules, tool driver, invocations, artifacts and run properties', () => {
    assert.deepEqual(withoutRelationships(run.tool.driver.rules), withoutRelationships(golden.tool.driver.rules));
    const { rules: _ours, ...driver } = run.tool.driver;
    const { rules: _theirs, ...goldenDriver } = golden.tool.driver;
    assert.deepEqual(driver, goldenDriver);
    assert.deepEqual(run.invocations, golden.invocations);
    assert.deepEqual(run.artifacts, golden.artifacts);
    assert.deepEqual(run.properties, golden.properties);
  });

  test('no conversion block, because no converter ran', () => {
    assert.ok(golden.conversion);
    assert.equal('conversion' in run, false);
  });

  test('relationships keep every golden one and add only WCAG 2.2 criteria', () => {
    const taxa = run.taxonomies[0].taxa;
    golden.tool.driver.rules.forEach((goldenRule, i) => {
      const rule = run.tool.driver.rules[i];
      const ids = rule.relationships.map((rel) => rel.target.id);
      const goldenIds = goldenRule.relationships.map((rel) => rel.target.id);
      assert.deepEqual(ids.filter((id) => goldenIds.includes(id)), goldenIds, rule.id);
      for (const rel of rule.relationships) {
        assert.equal(taxa[rel.target.index].id, rel.target.id, `${rule.id} points at the wrong taxon`);
      }
    });
    const targetSize = run.tool.driver.rules.find((r) => r.id === 'target-size-min');
    assert.deepEqual(targetSize.relationships.map((rel) => rel.target.id), ['wcag258']);
  });

  test('the taxonomy is WCAG 2.2: the 2.1 list carried over, 2.2 changes only', () => {
    const taxonomy = run.taxonomies[0];
    assert.equal(taxonomy.version, '2.2');
    assert.equal(taxonomy.guid, golden.taxonomies[0].guid);
    assert.equal(taxonomy.taxa.length, 87, 'best-practice plus 86 WCAG 2.2 criteria');
    const ours = new Map(taxonomy.taxa.map((t) => [t.id, t]));
    // What WCAG 2.2 itself changed: 4.1.1 removed, 2.5.5 renamed, and the
    // converter's lower-case "Resize text" against the Recommendation's title.
    const changedIn22 = new Set(['wcag411', 'wcag255', 'wcag144']);
    assert.equal(ours.has('wcag411'), false);
    assert.equal(ours.get('wcag255').shortDescription.text, 'Target Size (Enhanced)');
    for (const taxon of golden.taxonomies[0].taxa) {
      if (changedIn22.has(taxon.id)) continue;
      const mine = ours.get(taxon.id);
      assert.ok(mine, `${taxon.id} missing`);
      assert.equal(mine.name, taxon.name);
      assert.deepEqual(mine.shortDescription, taxon.shortDescription);
      assert.equal(mine.helpUri, taxon.helpUri?.replace('/WCAG21/', '/WCAG22/'), taxon.id);
    }
    assert.deepEqual(wcagTaxa(), taxonomy.taxa);
  });

  test('rules and taxa are sorted by id, as the converter sorted them, and indices follow', () => {
    // Findings arriving out of order: the golden fixture's already are sorted.
    const log = toSarif(makeReport({ findings: [dialogFinding(), contrastFinding(), emptyButtonFinding()] }));
    const { rules } = log.runs[0].tool.driver;
    assert.deepEqual(rules.map((r) => r.id), ['button-name', 'color-contrast', 'dialog-focus-not-trapped']);
    for (const result of log.runs[0].results) assert.equal(rules[result.ruleIndex].id, result.ruleId);
    const ids = log.runs[0].taxonomies[0].taxa.map((t) => t.id);
    assert.deepEqual(ids, [...ids].sort());
    assert.ok(ids.indexOf('wcag1410') < ids.indexOf('wcag142'), 'string order, as axe tags sort');
  });

  test('an --html fragment is embedded as artifact contents, not written as a URI', () => {
    const html = toSarif(makeReport({ findings: goldenFindings(), targetType: 'html' })).runs[0];
    assert.deepEqual(html.artifacts, [
      { contents: { text: '<button></button>' }, sourceLanguage: 'html', roles: ['analysisTarget'] },
    ]);
    for (const result of html.results) {
      assert.deepEqual(result.locations[0].physicalLocation.artifactLocation, { index: 0 });
    }
    // Everything else is the golden file's.
    assert.deepEqual(
      html.results.map((r) => r.locations[0].logicalLocations),
      golden.results.map((r) => r.locations[0].logicalLocations),
    );
  });
});
