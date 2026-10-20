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
import { toAxeShape, toSarif, wcagTaxa, GITHUB_LIMITATION_NOTE, resultMessage, serializeSarif } from '../../src/lib/format/sarif.js';
import { SEVERITY, makeFinding } from '../../src/lib/finding.js';
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

  // Everything the converter wrote, except the two things schema 2 adds on
  // purpose: a message (the converter's was empty) and a properties bag.
  const asConverterWroteIt = ({ message: _m, properties: _p, ...result }) => result;

  test('same results: rule ids, count, kinds, levels, rule indices and locations', () => {
    assert.equal(run.results.length, golden.results.length);
    assert.deepEqual(
      run.results.map((r) => [r.ruleId, r.ruleIndex, r.kind, r.level]),
      golden.results.map((r) => [r.ruleId, r.ruleIndex, r.kind, r.level]),
    );
    assert.deepEqual(run.results.map(asConverterWroteIt), golden.results.map(asConverterWroteIt));
  });

  test('the golden messages were empty; ours carry the finding, its values and its evidence', () => {
    for (const result of golden.results) assert.deepEqual(result.message, { text: '', markdown: '' });
    const findings = goldenFindings();
    run.results.forEach((result, i) => {
      assert.ok(result.message.text.length > 0, result.ruleId);
      assert.ok(result.message.markdown.length > 0, result.ruleId);
      assert.ok(result.message.text.includes('Evidence: '), result.message.text);
      assert.match(result.properties.fingerprint, /^[0-9a-f]{12}$/);
      assert.ok(['measured', 'inferred', 'needs-review'].includes(result.properties.evidence));
    });
    const button = run.results.find((r) => r.ruleId === 'button-name');
    assert.ok(button.message.text.startsWith(findings[0].message), button.message.text);
    assert.match(button.message.text, /Evidence: measured\./);
    const dialog = run.results.find((r) => r.ruleId === 'dialog-focus-not-trapped');
    assert.match(dialog.message.text, /Evidence: inferred\./);
    assert.match(dialog.message.text, /State: dialog-open\./);
    const review = run.results.find((r) => r.ruleId === 'target-size-min');
    assert.match(review.message.text, /Evidence: needs-review\./);
    assert.equal(review.level, 'none');
  });

  test('a contrast result names the measured pair, and a routed row carries its note', () => {
    const measured = contrastFinding({
      data: { contrast: { fgColor: '#999999', bgColor: '#ffffff', contrastRatio: 2.84, expectedContrastRatio: '4.5:1' } },
    });
    const routed = contrastFinding({
      severity: SEVERITY.NEEDS_REVIEW,
      selector: 'html > body > div > p',
      passes: ['forced-colors'],
      suggestions: undefined,
      data: { contrast: { fgColor: '#e8e6ef', bgColor: '#ffffff', contrastRatio: 1.23, expectedContrastRatio: '4.5:1' } },
      note: 'axe-core reads -webkit-text-fill-color first.',
      noteUrl: 'https://example.test/field-note',
      routedFrom: 'violation',
    });
    const results = toSarif(makeReport({ findings: [measured, routed], targetType: 'url' })).runs[0].results;
    const fail = results.find((r) => r.kind === 'fail');
    assert.match(fail.message.text, /Measured: 2\.84:1 for foreground #999999 on background #ffffff, 4\.5:1 required\./);
    assert.match(fail.message.markdown, /\*\*Measured:\*\* 2\.84:1/);
    const open = results.find((r) => r.kind === 'open');
    assert.match(open.message.text, /Note: axe-core reads -webkit-text-fill-color first\. See https:\/\/example\.test\/field-note/);
    assert.match(open.message.text, /Passes: forced-colors\./);
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

// Each test below kills a mutant of src/lib/format/json.js that the tests above
// let survive; the comment names it. Equivalent mutants have no test here.
describe('json report: mutation-tested edges', () => {
  // Kills `\s+` → `\S+` in five red-line patterns, `conforms?` → `conforms`,
  // `guarantee\w*` → `guarantee\w` and `reduces?` → `reduces`. Each phrase is
  // a credibility red line (AGENTS.md) the existing cases did not exercise.
  test('every red-line phrase is caught in its plain spelling', () => {
    for (const phrase of [
      'compliance achieved',
      'the page conforms to WCAG 2.2',
      'pages conform to WCAG 2.2',
      'the form is fully accessible',
      'we guarantee it',
      'this will reduce legal risk',
      '100% accessible',
    ]) {
      assert.ok(findRedLineLanguage(phrase).length > 0, phrase);
    }
  });

  // Kills `.map((pattern) => pattern.source)` → `() => undefined`.
  test('findRedLineLanguage names the patterns it matched', () => {
    assert.deepEqual(findRedLineLanguage('Now fully accessible.'), ['\\bfully\\s+accessible\\b']);
  });

  // Kills the two denominators → empty strings: a percentage is never quoted
  // without what it is a percentage of.
  test('the coverage percentages carry their denominators', () => {
    assert.equal(COVERAGE.criteriaWithAnyAutomatedRuleDenominator, '17 of the 55 WCAG 2.2 A/AA criteria');
    assert.equal(COVERAGE.criteriaReliablyAutomatedDenominator, '7 of the 55 WCAG 2.2 A/AA criteria');
  });

  // Kills `!finding.wcag?.sc` → `false` and `finding.wcag.sc` (throws on a
  // violation with no criterion), `!map.has(sc)` → `true` (count reset),
  // `count += 1` → `-= 1`, and the criterion sort removed.
  test('affectedCriteria skips rows with no criterion, counts per SC and sorts', () => {
    const noSc = emptyButtonFinding({ tags: [], selector: 'x' });
    const criteria = affectedCriteria([
      emptyButtonFinding(),
      noSc,
      contrastFinding(),
      contrastFinding({ selector: 'html > body > h2' }),
    ]);
    assert.deepEqual(criteria.map((c) => [c.sc, c.count]), [['1.4.3', 2], ['4.1.2', 1]]);
  });

  // Kills `'minor'` → `''` in IMPACTS, and `f.wcag?.wcag22Only` →
  // `f.wcag.wcag22Only` (throws on a violation with no criterion).
  test('summary counts minor violations and survives a violation with no criterion', () => {
    const report = makeReport({ findings: [emptyButtonFinding({ impact: 'minor', tags: [] })] });
    assert.deepEqual(report.summary.byImpact, { minor: 1 });
    assert.equal(report.summary.wcag22OnlyViolations, 0);
  });

  // Kills the summary filters removed or mutated: `reducedConfidence` counts only
  // rows with confidence, `routedToNeedsReview` only rows with routedFrom, and
  // `clusters.violations` / `violationRowsClustered` only violation clusters
  // (`=== 'violation'` → `true`, `false`, `!==`, `''`; `n + c.count` → `n - c.count`).
  test('summary counters count only what they name', () => {
    const link = (n, severity, extra = {}) =>
      makeFinding({ ruleId: 'link-name', source: 'axe', severity, tags: ['wcag2a', 'wcag244'], selector: `a:nth-child(${n})`, html: '<a></a>', message: 'm', passes: ['default'], ...extra });
    const report = makeReport({
      findings: [
        link(1, SEVERITY.VIOLATION, { confidence: { level: 'reduced', reason: 'budget' } }),
        link(2, SEVERITY.VIOLATION),
        link(3, SEVERITY.VIOLATION),
        link(1, SEVERITY.NEEDS_REVIEW, { routedFrom: 'violation', state: 's' }),
        link(2, SEVERITY.NEEDS_REVIEW, { state: 's' }),
        link(1, SEVERITY.NEEDS_REVIEW, { state: 't' }),
        link(2, SEVERITY.NEEDS_REVIEW, { state: 't' }),
      ],
    });
    assert.equal(report.summary.evidence.reducedConfidence, 1);
    assert.equal(report.summary.evidence.routedToNeedsReview, 1);
    assert.deepEqual(report.summary.clusters, { total: 3, violations: 1, violationRowsClustered: 3 });
  });
});

// Each test below kills a mutant of src/lib/format/sarif.js that the tests above
// let survive; the comment names it. SARIF is a secondary output (see the
// file's header), so its static metadata strings get one assertion, not one each.
describe('sarif: mutation-tested edges', () => {
  // Kills serializeSarif's body → `{}` and its template → ``, and SARIF_SCHEMA → ''.
  // `audit --sarif` writes exactly this string.
  test('serializeSarif is the SARIF log as JSON with a trailing newline', () => {
    const report = makeReport();
    const text = serializeSarif(report);
    assert.ok(text.endsWith('}\n'));
    assert.deepEqual(JSON.parse(text), toSarif(report));
    assert.equal(JSON.parse(text).$schema, 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json');
  });

  // Kills `if (finding.wcag.level)` → `true` (throws on a criterion with no
  // level, the unknown-SC fallback), `minVersion === '2.0'` → `true`, the
  // `replace('.', '')` arguments mutated, and `const tags = []` → a junk tag.
  test('rule tags follow the criterion\'s own version and level, and tolerate no level', () => {
    const reflow = emptyButtonFinding({ ruleId: 'own-reflow', source: 'a11y-loop', sc: '1.4.10', tags: [], act: [] });
    const unknown = emptyButtonFinding({ ruleId: 'future-rule', tags: ['wcag999'], act: [] });
    assert.equal(unknown.wcag.level, null);
    const shape = toAxeShape(makeReport({ findings: [reflow, unknown] }));
    assert.deepEqual(shape.violations.map((g) => [g.id, g.tags]), [
      ['own-reflow', ['wcag1410', 'wcag21aa']],
      ['future-rule', ['wcag999']],
    ]);
  });

  // Kills the period rule mutated (`&&` → `||`, the negation dropped, the
  // `[.!?]$` anchor dropped or negated, constant true/false), and every
  // optional part made unconditional (`if (meta.passes?.length)`,
  // `if (meta.state)`, `if (meta.evidence)`, `if (meta.note)` → `true`).
  test('a bare result message is the summary with one full stop', () => {
    const msg = (failureSummary, a11yLoop = {}) => resultMessage({ failureSummary, a11yLoop: { passes: [], ...a11yLoop } }).text;
    assert.equal(msg('Fix it'), 'Fix it.');
    assert.equal(msg('Fix it!'), 'Fix it!');
    assert.equal(msg('A. Then b'), 'A. Then b.');
    assert.equal(msg(''), '');
  });

  // Kills `c?.fgColor && c?.bgColor` → `||`, the ratio guard → `true`, and the
  // empty-ratio, empty-requirement and empty-noteUrl fallbacks → junk.
  test('Measured needs both colours, and leaves out what axe did not give', () => {
    const msg = (a11yLoop) => resultMessage({ failureSummary: 'Low contrast', a11yLoop }).text;
    assert.equal(msg({ contrast: { fgColor: '#999999', bgColor: '#ffffff' } }), 'Low contrast. Measured: foreground #999999 on background #ffffff.');
    assert.equal(msg({ contrast: { fgColor: '#999999' } }), 'Low contrast.');
    assert.equal(msg({ note: 'Routed.' }), 'Low contrast. Note: Routed.');
  });

  // Kills `if (meta.confidence)` → `false`, its text → ``, `confidence ?? null`
  // → `&& null` in toAxeShape, `.join(', ')` on passes → `''`, and the markdown
  // label pattern `Confidence \w+` → `\w` / `\W+` and its `.join(' ')` → `''`.
  // A row whose probe hit a budget has to say so wherever it is read.
  test('a reduced-confidence row says so, in text and in markdown', () => {
    const finding = dialogFinding({ passes: ['default', 'dark'], confidence: { level: 'reduced', reason: 'the Tab walk hit its step budget.' } });
    const [result] = toSarif(makeReport({ findings: [finding] })).runs[0].results;
    assert.equal(
      result.message.text,
      'Tabbing inside this dialog moved focus out of it. Passes: default, dark. State: dialog-open. Evidence: inferred. Confidence reduced: the Tab walk hit its step budget.',
    );
    assert.equal(
      result.message.markdown,
      'Tabbing inside this dialog moved focus out of it. **Passes:** default, dark. **State:** dialog-open. **Evidence:** inferred. **Confidence reduced:** the Tab walk hit its step budget.',
    );
  });

  // Kills `kinds: ['superset']` → `[]` or `['']`, and the taxonomy's name,
  // fullName, organization, informationUri and isComprehensive mutated.
  test('relationships are supersets, and the taxonomy names WCAG 2.2 by W3C', () => {
    const run = toSarif(makeReport()).runs[0];
    const kinds = run.tool.driver.rules.flatMap((r) => r.relationships.map((rel) => rel.kinds));
    assert.ok(kinds.length > 0);
    for (const k of kinds) assert.deepEqual(k, ['superset']);
    const { taxa: _taxa, guid: _guid, ...taxonomy } = run.taxonomies[0];
    assert.deepEqual(taxonomy, {
      name: 'WCAG',
      fullName: 'Web Content Accessibility Guidelines (WCAG) 2.2',
      organization: 'W3C',
      informationUri: 'https://www.w3.org/TR/WCAG22',
      version: '2.2',
      isComprehensive: true,
    });
  });
});
