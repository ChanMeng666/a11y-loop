/**
 * SARIF v2.1 output, via Microsoft's axe-sarif-converter.
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
 */

import { createRequire } from 'node:module';
import { SEVERITY } from '../finding.js';

const require = createRequire(import.meta.url);

/** Where GitHub's limitation is documented for report readers. */
export const GITHUB_LIMITATION_NOTE =
  'GitHub code scanning drops SARIF results without a file-path location. These results are ' +
  'located by URL and CSS selector, so use the Azure DevOps SARIF viewer or the VS Code SARIF ' +
  'extension, or map selectors back to source templates before uploading.';

/**
 * Rebuild an axe-shaped results object from our report so the converter can
 * consume it. Our own a11y-loop checks are included as additional rules — they
 * are real findings and dropping them from the SARIF would misrepresent the run.
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

/**
 * @param {object} report
 * @returns {object} a SARIF v2.1 log
 */
export function toSarif(report) {
  const { convertAxeToSarif } = require('axe-sarif-converter');
  const log = convertAxeToSarif(toAxeShape(report));
  for (const run of log.runs ?? []) {
    run.properties = { ...run.properties, a11yLoopNote: GITHUB_LIMITATION_NOTE };
  }
  return log;
}

/** Serialized SARIF, with a trailing newline. */
export function serializeSarif(report) {
  return `${JSON.stringify(toSarif(report), null, 2)}\n`;
}
