/**
 * Terse human output.
 *
 * Findings are grouped by rule so a page with 34 contrast failures does not
 * produce 34 identical citation lines, and every group leads with the success
 * criterion, because the criterion is the source of the obligation — the ACT id
 * and the axe rule id are secondary identifiers.
 */

import { formatCitation } from '../wcag-map.js';
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

function formatGroup(group, { indent = '  ' } = {}) {
  const lines = [];
  const inner = `${indent}  `;
  const count = group.items.length;
  const stateNote = group.state ? ` ${BULLET} state: ${group.state}` : '';
  lines.push(`${indent}${group.headline}${stateNote}${count > 1 ? ` (${count} elements)` : ''}`);

  const messages = new Set(group.items.map((f) => f.message));
  const shared = messages.size === 1 && count > 1;
  if (shared) lines.push(`${inner}${group.items[0].message}`);

  for (const finding of group.items) {
    lines.push(`${inner}${BULLET} ${finding.selector || '(document)'}${formatPassNote(finding)}`);
    if (!shared) lines.push(`${inner}  ${finding.message}`);
    lines.push(...formatSuggestionLines(finding, `${inner}  `));
  }

  const helpUrl = group.items.find((f) => f.helpUrl)?.helpUrl;
  if (helpUrl) lines.push(`${inner}${helpUrl}`);
  return lines;
}

function section(title, findings, note) {
  if (findings.length === 0) return [];
  const lines = ['', `${title} (${findings.length})${note ? ` — ${note}` : ''}`];
  for (const group of groupFindings(findings)) {
    lines.push(...formatGroup(group));
  }
  return lines;
}

/**
 * @param {object} report the JSON report
 * @param {{quiet?:boolean}} [opts]
 * @returns {string}
 */
export function formatHuman(report, opts = {}) {
  const { quiet = false } = opts;
  const { summary, findings, tool, target, manualChecklist = [] } = report;

  if (quiet) {
    return [
      `${summary.verdict} ${BULLET} ${summary.needsReview} to review ${BULLET} ` +
        `${summary.bestPractice} best-practice ${BULLET} ${manualChecklist.length} manual checks`,
      '',
    ].join('\n');
  }

  const lines = [];
  lines.push(`a11y-loop audit ${BULLET} ${describeTarget(target)}`);
  lines.push(`Target standard: ${summary.target}`);

  lines.push(...section('VIOLATIONS', findings.violations));
  lines.push(
    ...section(
      'NEEDS REVIEW',
      findings.needsReview,
      'axe reported these as incomplete, or a11y-loop found something it cannot judge alone',
    ),
  );
  lines.push(...section('BEST PRACTICE', findings.bestPractice, 'no success criterion, non-blocking'));

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
