/**
 * The JSON report — the primary machine format and the agent-facing contract.
 *
 * Design rules:
 *  - Stable keys, so a loop can rely on them across versions.
 *  - `violations` / `needsReview` / `bestPractice` are separate arrays.
 *    best-practice rules have no success criterion behind them and are NEVER
 *    counted as violations or allowed to affect the exit code.
 *  - Every finding carries a fingerprint, so `diff` can match across runs.
 *  - The summary states what was NOT checked as prominently as what was.
 *  - No conformance language, ever. See RED_LINE_PATTERNS.
 */

import { bucketFindings, EVIDENCE } from '../finding.js';
import { compareSc, CONFORMANCE_SET } from '../wcag-map.js';
import { buildClusters, colourPairSummary } from '../cluster.js';

/**
 * The report's shape version. Reports from 0.3.x and earlier carry no field
 * and are version 1. Version 2 only ADDS: `evidence` (and, when relevant,
 * `confidence`, `note`, `noteUrl`, `routedFrom`, `data.contrast`) on findings,
 * the top-level `clusters` array, and `summary.evidence`, `summary.clusters`
 * and `summary.colourPairs`. Nothing was renamed or removed, so a version-1
 * reader keeps working.
 */
export const SCHEMA_VERSION = 2;

/** The clean-run sentence. Deliberately not "passed", "compliant" or "accessible". */
export const CLEAN_VERDICT = 'No automatically detectable failures';

/** Coverage, with denominators attached. Quoting 57% alone overstates the case. */
export const COVERAGE = Object.freeze({
  statement:
    'Automated checks cover a subset of WCAG (Deque: ~57% of issues by volume; ~31% of AA ' +
    'criteria have any automated rule). This is not an audit or conformance claim.',
  issueVolumePercent: 57,
  issueVolumeDenominator: 'instances of individual issues found, per Deque’s 2,000-audit study',
  criteriaWithAnyAutomatedRulePercent: 31,
  criteriaWithAnyAutomatedRuleDenominator: `17 of the ${CONFORMANCE_SET.aaSet} WCAG 2.2 A/AA criteria`,
  criteriaReliablyAutomatedPercent: 13,
  criteriaReliablyAutomatedDenominator: `7 of the ${CONFORMANCE_SET.aaSet} WCAG 2.2 A/AA criteria`,
  criteriaUntestableByAnyTool: 9,
  criteriaRequiringHumanVerification: 13,
});

/**
 * Phrases that must never appear in a11y-loop's own report language. The FTC
 * fined accessiBe $1M over claims of this kind; the Overlay Fact Sheet has 800+
 * signatories. A tool that overstates coverage makes agents declare victory
 * early, which is the exact failure this one exists to prevent.
 */
export const RED_LINE_PATTERNS = [
  /\bcompliant\b/i,
  /\bcompliance\s+(?:guaranteed|achieved|confirmed)\b/i,
  /\bconforms?\s+to\s+WCAG\b/i,
  /\bfully\s+accessible\b/i,
  /\bis\s+accessible\b/i,
  /\bpasse[sd]\s+WCAG\b/i,
  /\bguarantee\w*\b/i,
  /\bno\s+manual\s+testing\b/i,
  /\breduces?\s+legal\s+risk\b/i,
  /\baccessibility\s+score\b/i,
  /\b100%\s+accessible\b/i,
];

/** @returns {string[]} the red-line phrases present in a block of text. */
export function findRedLineLanguage(text) {
  return RED_LINE_PATTERNS.filter((pattern) => pattern.test(String(text ?? ''))).map(
    (pattern) => pattern.source,
  );
}

const IMPACTS = ['critical', 'serious', 'moderate', 'minor'];

function countByImpact(findings) {
  const counts = {};
  for (const impact of IMPACTS) {
    const n = findings.filter((f) => f.impact === impact).length;
    if (n > 0) counts[impact] = n;
  }
  return counts;
}

/** Distinct success criteria touched by a set of findings, in criterion order. */
export function affectedCriteria(findings) {
  const map = new Map();
  for (const finding of findings) {
    if (!finding.wcag?.sc) continue;
    if (!map.has(finding.wcag.sc)) {
      map.set(finding.wcag.sc, {
        sc: finding.wcag.sc,
        name: finding.wcag.name,
        level: finding.wcag.level,
        wcag22Only: finding.wcag.wcag22Only,
        count: 0,
      });
    }
    map.get(finding.wcag.sc).count += 1;
  }
  return [...map.values()].sort((a, b) => compareSc(a.sc, b.sc));
}

/** Rows per evidence tier across all three buckets, every tier always present. */
export function countByEvidence(findings) {
  const counts = { [EVIDENCE.MEASURED]: 0, [EVIDENCE.INFERRED]: 0, [EVIDENCE.NEEDS_REVIEW]: 0 };
  for (const finding of findings) {
    if (finding.evidence in counts) counts[finding.evidence] += 1;
  }
  return counts;
}

/**
 * Assemble the report.
 *
 * @param {object} input
 * @param {object} input.tool provenance: name, version, axeCoreVersion, browser, …
 * @param {{type:string, value:string}} input.target
 * @param {Array} input.findings deduped, flat
 * @param {Array} input.manualChecklist
 * @param {object} [input.facts]
 */
export function buildReport({ tool, target, findings, manualChecklist = [], facts = {} }) {
  const buckets = bucketFindings(findings);
  const violationCount = buckets.violations.length;
  const clusters = buildClusters(buckets);
  const clusteredViolations = clusters
    .filter((c) => c.severity === 'violation')
    .reduce((n, c) => n + c.count, 0);

  const summary = {
    violations: violationCount,
    needsReview: buckets.needsReview.length,
    bestPractice: buckets.bestPractice.length,
    manualChecklist: manualChecklist.length,
    byImpact: countByImpact(buckets.violations),
    criteriaAffected: affectedCriteria(buckets.violations),
    wcag22OnlyViolations: buckets.violations.filter((f) => f.wcag?.wcag22Only).length,
    verdict:
      violationCount === 0
        ? CLEAN_VERDICT
        : `${violationCount} automatically detectable failure${violationCount === 1 ? '' : 's'}`,
    target: 'WCAG 2.2 Level AA',
    coverage: COVERAGE,
    evidence: {
      violations: countByEvidence(buckets.violations),
      needsReview: countByEvidence(buckets.needsReview),
      bestPractice: countByEvidence(buckets.bestPractice),
      reducedConfidence: findings.filter((f) => f.confidence).length,
      routedToNeedsReview: buckets.needsReview.filter((f) => f.routedFrom).length,
    },
    clusters: {
      total: clusters.length,
      violations: clusters.filter((c) => c.severity === 'violation').length,
      violationRowsClustered: clusteredViolations,
    },
    colourPairs: {
      violations: colourPairSummary(buckets.violations),
      needsReview: colourPairSummary(buckets.needsReview),
    },
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    tool,
    target,
    summary,
    findings: {
      violations: buckets.violations,
      needsReview: buckets.needsReview,
      bestPractice: buckets.bestPractice,
    },
    clusters,
    manualChecklist,
    pageInventory: facts,
  };
}

/** Pretty-printed JSON with a trailing newline, for stdout or a file. */
export function serializeReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}
