/**
 * Terse human output, summary first.
 *
 * The order is the order a reader needs it in: what was audited and what the
 * exit code means, then the root causes (clusters: many rows, one cause, one
 * fix), then the rows no cluster explains, then what automation cannot judge.
 * A cluster prints one representative row and "+N more like this"; --verbose
 * lists every member. Nothing is dropped from the JSON either way.
 *
 * Findings are grouped by rule so a page with 34 contrast failures does not
 * produce 34 identical citation lines, and every group leads with the success
 * criterion, because the criterion is the source of the obligation — the ACT id
 * and the axe rule id are secondary identifiers.
 */

import { formatCitation } from '../wcag-map.js';
import { EVIDENCE } from '../finding.js';
import { buildClusters } from '../cluster.js';
import { CLEAN_VERDICT, COVERAGE } from './json.js';

const BULLET = '·';

/**
 * A one-line description of what was audited. An inline fragment is summarised
 * rather than printed, because agents pass whole components on the command line.
 */
export function describeTarget(target) {
  if (target.type === 'url') return target.value;
  if (target.type === 'file') {
    return `${target.value}${target.servedAt ? ` (served at ${target.servedAt})` : ''}`;
  }
  const size = String(target.value ?? '').length;
  return `inline HTML fragment, ${size} chars${target.servedAt ? ` (served at ${target.servedAt})` : ''}`;
}

/** `SC 4.1.2 Name, Role, Value (Level A) · ACT 97a4e1 · axe: button-name` */
export function findingHeadline(finding) {
  const parts = [];
  const citation = formatCitation(finding.wcag);
  parts.push(citation ?? `${finding.source}: ${finding.ruleId}`);
  if (finding.act?.length) parts.push(`ACT ${finding.act.join(', ')}`);
  if (citation) {
    parts.push(finding.source === 'axe' ? `axe: ${finding.ruleId}` : `a11y-loop: ${finding.ruleId}`);
  }
  if (finding.wcag?.wcag22Only) parts.push('WCAG 2.2 only');
  return parts.join(` ${BULLET} `);
}

/** Group findings that share a headline, preserving first-seen order. */
export function groupFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    const key = `${finding.ruleId}::${finding.state ?? ''}`;
    if (!groups.has(key)) {
      groups.set(key, { headline: findingHeadline(finding), state: finding.state, items: [] });
    }
    groups.get(key).items.push(finding);
  }
  return [...groups.values()];
}

function formatSuggestionLines(finding, indent) {
  if (!finding.suggestions?.length) return [];
  return finding.suggestions.map((s) => {
    const what = s.role === 'background' ? 'background' : 'text';
    return `${indent}fix: ${what} ${s.direction} → ${s.hex} (ratio ${s.newRatioDisplay ?? s.newRatio}:1)`;
  });
}

function formatPassNote(finding) {
  const passes = finding.passes ?? [];
  if (passes.length === 0 || passes.includes('default')) return '';
  return `  [only under: ${passes.join(', ')}]`;
}

/** ` [inferred]` on a violation concluded from a driven probe; nothing for measured. */
function evidenceTag(finding) {
  return finding?.evidence === EVIDENCE.INFERRED ? ' [inferred]' : '';
}

function formatNoteLines(finding, indent) {
  const lines = [];
  if (finding.confidence) {
    lines.push(`${indent}confidence: ${finding.confidence.level}. ${finding.confidence.reason}`);
  }
  if (finding.note) lines.push(`${indent}note: ${finding.note}`);
  if (finding.noteUrl) lines.push(`${indent}see: ${finding.noteUrl}`);
  return lines;
}

function formatGroup(group, { indent = '  ' } = {}) {
  const lines = [];
  const inner = `${indent}  `;
  const count = group.items.length;
  const stateNote = group.state ? ` ${BULLET} state: ${group.state}` : '';
  lines.push(
    `${indent}${group.headline}${evidenceTag(group.items[0])}${stateNote}` +
      `${count > 1 ? ` (${count} elements)` : ''}`,
  );

  const messages = new Set(group.items.map((f) => f.message));
  const shared = messages.size === 1 && count > 1;
  if (shared) lines.push(`${inner}${group.items[0].message}`);

  for (const finding of group.items) {
    lines.push(`${inner}${BULLET} ${finding.selector || '(document)'}${formatPassNote(finding)}`);
    if (!shared) lines.push(`${inner}  ${finding.message}`);
    lines.push(...formatSuggestionLines(finding, `${inner}  `));
    lines.push(...formatNoteLines(finding, `${inner}  `));
  }

  const helpUrl = group.items.find((f) => f.helpUrl)?.helpUrl;
  if (helpUrl) lines.push(`${inner}${helpUrl}`);
  return lines;
}

const memberKey = (fingerprint, state) => `${fingerprint}::${state ?? ''}`;

function formatCluster(cluster, members, { verbose, indent }) {
  const inner = `${indent}  `;
  const [first] = members;
  const stateNote = cluster.state ? ` ${BULLET} state: ${cluster.state}` : '';
  const lines = [
    `${indent}${findingHeadline(first)}${evidenceTag(first)}${stateNote} (${cluster.count} rows, one cause)`,
    `${inner}cause: ${cluster.causeText}`,
    `${inner}passes: ${cluster.passes.join(', ')}`,
  ];
  if (verbose) {
    for (const member of members) {
      lines.push(`${inner}${BULLET} ${member.selector || '(document)'}${formatPassNote(member)}`);
    }
  } else {
    lines.push(`${inner}e.g. ${first.selector || '(document)'}`);
  }
  lines.push(...formatSuggestionLines({ suggestions: cluster.suggestions }, inner));
  if (cluster.fixCommand) lines.push(`${inner}or run: ${cluster.fixCommand}`);
  const reduced = members.filter((m) => m.confidence);
  if (reduced.length) {
    lines.push(
      `${inner}confidence: reduced on ${reduced.length} of ${cluster.count}. ${reduced[0].confidence.reason}`,
    );
  }
  if (cluster.note) lines.push(`${inner}note: ${cluster.note}`);
  if (cluster.noteUrl) lines.push(`${inner}see: ${cluster.noteUrl}`);
  if (!verbose) {
    lines.push(`${inner}+${cluster.count - 1} more like this (--verbose lists them; --json has every row)`);
  }
  if (first.helpUrl) lines.push(`${inner}${first.helpUrl}`);
  return lines;
}

/** One bucket: its clusters first, then the rows no cluster explains. */
function section(title, findings, note, { clusters = [], verbose = false } = {}) {
  if (findings.length === 0) return [];
  const lines = ['', `${title} (${findings.length})${note ? ` — ${note}` : ''}`];

  const byKey = new Map(findings.map((f) => [memberKey(f.fingerprint, f.state), f]));
  const own = clusters.filter((c) =>
    c.fingerprints.every((fp) => byKey.has(memberKey(fp, c.state))),
  );
  const clustered = new Set();

  if (own.length) {
    const rows = own.reduce((n, c) => n + c.count, 0);
    lines.push(`  Root causes: ${plural(own.length, 'cluster')} ${verb(own.length, 'cover')} ${rows} of ${findings.length} rows`);
    for (const cluster of own) {
      const members = cluster.fingerprints.map((fp) => byKey.get(memberKey(fp, cluster.state)));
      for (const fp of cluster.fingerprints) clustered.add(memberKey(fp, cluster.state));
      lines.push(...formatCluster(cluster, members, { verbose, indent: '    ' }));
    }
  }

  const rest = findings.filter((f) => !clustered.has(memberKey(f.fingerprint, f.state)));
  if (rest.length) {
    if (own.length) lines.push(`  Other rows (${rest.length})`);
    for (const group of groupFindings(rest)) {
      lines.push(...formatGroup(group, { indent: own.length ? '    ' : '  ' }));
    }
  }
  return lines;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const verb = (n, base) => (n === 1 ? `${base}s` : base);

/** "132 measured, 27 inferred": only the tiers that are present. */
function tierBreakdown(counts = {}) {
  return [EVIDENCE.MEASURED, EVIDENCE.INFERRED, EVIDENCE.NEEDS_REVIEW]
    .filter((tier) => counts[tier] > 0)
    .map((tier) => `${counts[tier]} ${tier}`)
    .join(', ');
}

/**
 * The header block: what the exit code means, totals by evidence tier, the
 * clusters, and how much is left for a person, in that order.
 */
export function summaryBlock(report, clusters) {
  const { summary, manualChecklist = [] } = report;
  const lines = ['', 'SUMMARY'];
  lines.push(
    summary.violations > 0
      ? `  Exit 1: ${summary.verdict}. Needs-review rows and best-practice notes never change the exit code.`
      : `  Exit 0: ${CLEAN_VERDICT.toLowerCase()} in the passes and states run. That is not a conformance claim.`,
  );

  const evidence = summary.evidence ?? {};
  if (summary.violations > 0) {
    const reduced = report.findings.violations.filter((f) => f.confidence).length;
    const tiers = tierBreakdown(evidence.violations);
    lines.push(
      `  ${plural(summary.violations, 'violation')}${tiers ? `: ${tiers}` : ''}` +
        (reduced ? `, ${reduced} of them with reduced confidence` : ''),
    );
  }
  if (summary.needsReview > 0) {
    const routed = evidence.routedToNeedsReview ?? 0;
    lines.push(
      `  ${summary.needsReview} needs review: ` +
        (summary.needsReview === 1 ? 'not a pass, a person has to judge it' : 'not passes, a person has to judge each one') +
        (routed
          ? `. ${plural(routed, 'forced-colors contrast row')} moved here from violations; read the note on each`
          : ''),
    );
  }
  if (summary.bestPractice > 0) {
    lines.push(`  ${plural(summary.bestPractice, 'best-practice note')}: no success criterion, non-blocking`);
  }

  const pairs = summary.colourPairs?.violations;
  if (pairs && pairs.rows > pairs.pairs) {
    lines.push(
      `  ${plural(pairs.pairs, 'colour pair')} ${verb(pairs.pairs, 'account')} for ${pairs.rows} contrast violation rows`,
    );
  }
  const violationClusters = clusters.filter((c) => c.severity === 'violation');
  if (violationClusters.length) {
    const rows = violationClusters.reduce((n, c) => n + c.count, 0);
    lines.push(
      `  ${plural(violationClusters.length, 'cluster')} ${verb(violationClusters.length, 'cover')} ${rows} of ` +
        `${summary.violations} violations; ` +
        `the other ${summary.violations - rows} are listed after them`,
    );
  }
  lines.push(`  ${plural(manualChecklist.length, 'manual check')}: automation cannot judge these`);
  return lines;
}

/** A report written before version 2 has no clusters; derive them. */
function clustersOf(report) {
  return Array.isArray(report.clusters) ? report.clusters : buildClusters(report.findings);
}

/**
 * @param {object} report the JSON report
 * @param {{quiet?:boolean, verbose?:boolean}} [opts]
 * @returns {string}
 */
export function formatHuman(report, opts = {}) {
  const { quiet = false, verbose = false } = opts;
  const { summary, findings, tool, target, manualChecklist = [] } = report;

  if (quiet) {
    return [
      `${summary.verdict} ${BULLET} ${summary.needsReview} to review ${BULLET} ` +
        `${summary.bestPractice} best-practice ${BULLET} ${manualChecklist.length} manual checks`,
      '',
    ].join('\n');
  }

  const clusters = clustersOf(report);
  const lines = [];
  lines.push(`a11y-loop audit ${BULLET} ${describeTarget(target)}`);
  lines.push(`Target standard: ${summary.target}`);
  lines.push(
    `Passes: ${(tool.passesRun ?? []).join(', ')} ${BULLET} states: ` +
      `${tool.statesRun?.length ? tool.statesRun.join(', ') : 'none'}`,
  );
  lines.push(...summaryBlock(report, clusters));

  const sectionOpts = { clusters, verbose };
  lines.push(...section('VIOLATIONS', findings.violations, null, sectionOpts));
  lines.push(
    ...section(
      'NEEDS REVIEW',
      findings.needsReview,
      'axe reported these as incomplete, or a11y-loop found something it cannot judge alone',
      sectionOpts,
    ),
  );
  lines.push(
    ...section('BEST PRACTICE', findings.bestPractice, 'no success criterion, non-blocking', sectionOpts),
  );

  if (manualChecklist.length > 0) {
    lines.push('', `MANUAL CHECKS (${manualChecklist.length}) — automation cannot judge these`);
    for (const item of manualChecklist) {
      const sc = item.sc ? `SC ${item.sc}: ` : '';
      lines.push(`  ${BULLET} ${sc}${item.text}`);
      lines.push(`    why: ${item.why}`);
    }
  }

  lines.push('');
  if (summary.violations === 0) {
    lines.push(`${CLEAN_VERDICT} across ${tool.passesRun.length} rendering passes.`);
  } else {
    lines.push(
      `${summary.verdict}, ${summary.needsReview} finding(s) needing review, ` +
        `${summary.bestPractice} best-practice note(s).`,
    );
  }
  if (summary.needsReview > 0) {
    lines.push(
      `The ${summary.needsReview} needs-review finding(s) are not passes — see the NEEDS REVIEW ` +
        'section above, or the needsReview array in --json output.',
    );
  }

  lines.push('');
  lines.push(provenanceLine(tool));
  lines.push(COVERAGE.statement);
  lines.push('');
  return lines.join('\n');
}

/** Per-report provenance: everything needed to reproduce or date the result. */
export function provenanceLine(tool) {
  const parts = [
    `${tool.name} ${tool.version}`,
    `axe-core ${tool.axeCoreVersion}`,
    `${tool.browser} ${tool.browserVersion}`,
    `viewport ${tool.viewport.width}×${tool.viewport.height}`,
    `passes: ${tool.passesRun.join(', ')}`,
  ];
  if (tool.statesRun?.length) parts.push(`states: ${tool.statesRun.join(', ')}`);
  else parts.push('states: none (use --interact to audit modal/error/route states)');
  parts.push(tool.timestamp);
  return `Provenance: ${parts.join(` ${BULLET} `)}`;
}
