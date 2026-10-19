/**
 * SARIF v2.1.0 output, written directly.
 *
 * Supported with eyes open. GitHub code scanning only DISPLAYS results whose
 * location is a file path with a valid `physicalLocation.artifactLocation.uri`;
 * an accessibility finding's natural location is (page URL, CSS selector), so a
 * naive upload produces an empty Code Scanning view. The honest approach, taken
 * here, is to emit valid SARIF for Azure DevOps and the VS Code SARIF viewer and
 * to document the GitHub limitation rather than fake file paths.
 *
 * Plain JSON remains the primary machine format: SARIF is verbose and hostile to
 * an LLM's context budget.
 *
 * Until 0.3.0 this went through Microsoft's axe-sarif-converter, which pulled in
 * @puppeteer/browsers and with it seven high-severity `npm audit` findings, for a
 * code path that only ever built a JSON object. The writer below reproduces that
 * converter's output field for field: one run, one rule per rule id (sorted), one
 * result per finding, each located by the artifact URI plus the CSS selector as a
 * logical location. test/unit/format.test.js asserts it against a golden file
 * captured from axe-sarif-converter 3.1.0 before the dependency was removed.
 * Three differences are deliberate, and that test pins each of them:
 *
 *  - There is no `conversion` block. Nothing is converted any more, and naming a
 *    converter that did not run would misdescribe where the log came from.
 *  - The WCAG taxonomy is WCAG 2.2, built from wcag-map.js's SC_TABLE, not the
 *    converter's hardcoded WCAG 2.1 list. The tool targets 2.2 AA, and under the
 *    2.1 list every 2.2-only criterion (2.5.8 Target Size and the rest) had no
 *    taxon, so those rules carried no relationship at all. 4.1.1 Parsing is
 *    absent, as it is from WCAG 2.2.
 *  - For --html the converter wrote the fragment itself as the artifact URI,
 *    which is not a URI, so the log failed the SARIF 2.1.0 schema's
 *    `uri-reference` format. A fragment has no address, so it goes in the
 *    artifact's `contents` instead and results point at it by index alone.
 *
 * Still no invented file paths: the artifact URI is the audited page URL, or the
 * path given to --file, which is what the converter wrote too.
 */

import { SEVERITY } from '../finding.js';
import { SC_TABLE } from '../wcag-map.js';

const SARIF_SCHEMA =
  'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json';

/** The converter's taxonomy GUID, kept so anything keyed on it keeps working. */
const WCAG_TAXONOMY_GUID = 'ca34e0e1-5faf-4f55-a989-cdae42a98f18';

const wcagTaxonomyRef = () => ({ name: 'WCAG', index: 0, guid: WCAG_TAXONOMY_GUID });

/** Where GitHub's limitation is documented for report readers. */
export const GITHUB_LIMITATION_NOTE =
  'GitHub code scanning drops SARIF results without a file-path location. These results are ' +
  'located by URL and CSS selector, so use the Azure DevOps SARIF viewer or the VS Code SARIF ' +
  'extension, or map selectors back to source templates before uploading.';

/**
 * Rebuild an axe-shaped results object from our report, grouped by rule, which
 * the SARIF writer below consumes. Our own a11y-loop checks are included as
 * additional rules — they are real findings and dropping them from the SARIF
 * would misrepresent the run.
 *
 * @param {object} report
 * @returns {object} an axe-core AxeResults-shaped object
 */
export function toAxeShape(report) {
  const nodeFor = (finding) => ({
    html: finding.html,
    target: [finding.selector],
    any: [],
    all: [],
    none: [],
    impact: finding.impact ?? null,
    failureSummary: finding.message,
  });

  const groupByRule = (findings) => {
    const groups = new Map();
    for (const finding of findings) {
      if (!groups.has(finding.ruleId)) {
        const tags = [];
        if (finding.wcag?.sc) {
          tags.push(`wcag${finding.wcag.sc.replace(/\./g, '')}`);
          if (finding.wcag.level) {
            const version = finding.wcag.minVersion === '2.0' ? '2' : finding.wcag.minVersion.replace('.', '');
            tags.push(`wcag${version}${finding.wcag.level.toLowerCase()}`);
          }
        }
        if (finding.severity === SEVERITY.BEST_PRACTICE) tags.push('best-practice');
        for (const act of finding.act ?? []) tags.push(`ACT-${act}`);

        groups.set(finding.ruleId, {
          id: finding.ruleId,
          impact: finding.impact ?? null,
          tags,
          description: finding.message,
          help: finding.message,
          helpUrl: finding.helpUrl ?? 'https://github.com/chanmeng/a11y-loop',
          nodes: [],
        });
      }
      groups.get(finding.ruleId).nodes.push(nodeFor(finding));
    }
    return [...groups.values()];
  };

  return {
    testEngine: { name: 'axe-core', version: report.tool.axeCoreVersion },
    testRunner: { name: `${report.tool.name} ${report.tool.version}` },
    testEnvironment: {
      userAgent: report.tool.userAgent ?? `${report.tool.browser}/${report.tool.browserVersion}`,
      windowWidth: report.tool.viewport.width,
      windowHeight: report.tool.viewport.height,
      orientationAngle: 0,
      orientationType: 'landscape-primary',
    },
    toolOptions: { passes: report.tool.passesRun, states: report.tool.statesRun ?? [] },
    timestamp: report.tool.timestamp,
    url: report.target.value,
    violations: groupByRule([...report.findings.violations, ...report.findings.bestPractice]),
    incomplete: groupByRule(report.findings.needsReview),
    passes: [],
    inapplicable: [],
  };
}

/** Understanding-document slug for a criterion name: "Contrast (Minimum)" becomes "contrast-minimum". */
function understandingSlug(name) {
  return name.toLowerCase().replace(/[(),]/g, '').trim().replace(/\s+/g, '-');
}

/**
 * `best-practice` plus one taxon per WCAG 2.2 success criterion, keyed by the
 * axe-style tag (`wcag143`) and sorted by that string, as the converter sorted
 * its list, so a relationship's `index` is its taxon's position.
 */
export function wcagTaxa() {
  const taxa = [{ id: 'best-practice', name: 'Best Practice' }];
  for (const [sc, { name }] of Object.entries(SC_TABLE)) {
    taxa.push({
      id: `wcag${sc.replace(/\./g, '')}`,
      name: `WCAG ${sc}`,
      shortDescription: { text: name },
      helpUri: `https://www.w3.org/WAI/WCAG22/Understanding/${understandingSlug(name)}`,
    });
  }
  return taxa.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function toolDriver(axeVersion, rules) {
  return {
    name: 'axe-core',
    fullName: `axe for Web v${axeVersion}`,
    shortDescription: { text: 'An open source accessibility rules library for automated testing.' },
    version: axeVersion,
    semanticVersion: axeVersion,
    informationUri: 'https://www.deque.com/axe/axe-for-web/',
    downloadUri: `https://www.npmjs.com/package/axe-core/v/${axeVersion}`,
    properties: { 'microsoft/qualityDomain': 'Accessibility' },
    supportedTaxonomies: [wcagTaxonomyRef()],
    rules,
  };
}

/**
 * @param {object} report
 * @returns {object} a SARIF v2.1.0 log
 */
export function toSarif(report) {
  const axe = toAxeShape(report);
  const taxa = wcagTaxa();
  const taxonIndex = new Map(taxa.map((taxon, i) => [taxon.id, i]));

  // One rule per id, sorted by id. When an id is in both buckets the
  // needs-review group is the one described, as in the converter.
  const groupsById = new Map();
  for (const group of [...axe.violations, ...axe.incomplete]) groupsById.set(group.id, group);
  const ruleIds = [...groupsById.keys()].sort();
  const ruleIndex = new Map(ruleIds.map((id, i) => [id, i]));

  const rules = ruleIds.map((id) => {
    const group = groupsById.get(id);
    return {
      id,
      name: group.help,
      fullDescription: { text: `${group.description}.` },
      helpUri: group.helpUrl,
      relationships: group.tags
        .filter((tag) => taxonIndex.has(tag))
        .map((tag) => ({
          target: { id: tag, index: taxonIndex.get(tag), toolComponent: wcagTaxonomyRef() },
          kinds: ['superset'],
        })),
    };
  });

  const isFragment = report.target.type === 'html';
  const artifactLocation = () => (isFragment ? { index: 0 } : { uri: axe.url, index: 0 });
  const artifact = isFragment
    ? { contents: { text: axe.url }, sourceLanguage: 'html', roles: ['analysisTarget'] }
    : { location: artifactLocation(), sourceLanguage: 'html', roles: ['analysisTarget'] };

  // kind/level as the converter set them: violations and best-practice are
  // `fail` at `error`, needs-review is `open` at `none`. The message is empty,
  // as the converter's was: it built the text from axe's per-check results,
  // which a11y-loop findings do not carry. The finding's own text is the
  // rule's `name` and `fullDescription`.
  const results = [];
  const addResults = (groups, kind) => {
    for (const group of groups) {
      for (const node of group.nodes) {
        results.push({
          ruleId: group.id,
          ruleIndex: ruleIndex.get(group.id),
          kind,
          level: kind === 'fail' ? 'error' : 'none',
          message: { text: '', markdown: '' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: artifactLocation(),
                region: { startLine: 1, snippet: { text: node.html } },
              },
              logicalLocations: [{ fullyQualifiedName: node.target.join(';'), kind: 'element' }],
            },
          ],
        });
      }
    }
  };
  addResults(axe.violations, 'fail');
  addResults(axe.incomplete, 'open');

  return {
    version: '2.1.0',
    $schema: SARIF_SCHEMA,
    runs: [
      {
        tool: { driver: toolDriver(axe.testEngine.version, rules) },
        invocations: [{ startTimeUtc: axe.timestamp, endTimeUtc: axe.timestamp, executionSuccessful: true }],
        artifacts: [artifact],
        results,
        taxonomies: [
          {
            name: 'WCAG',
            fullName: 'Web Content Accessibility Guidelines (WCAG) 2.2',
            organization: 'W3C',
            informationUri: 'https://www.w3.org/TR/WCAG22',
            version: '2.2',
            guid: WCAG_TAXONOMY_GUID,
            isComprehensive: true,
            taxa,
          },
        ],
        properties: { a11yLoopNote: GITHUB_LIMITATION_NOTE },
      },
    ],
  };
}

/** Serialized SARIF, with a trailing newline. */
export function serializeSarif(report) {
  return `${JSON.stringify(toSarif(report), null, 2)}\n`;
}
