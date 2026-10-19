/**
 * Pure helpers behind action.yml: turn an a11y-loop JSON report (and optionally a
 * `diff --json` result) into step outputs, a step summary and a pull request comment.
 *
 * Kept free of I/O so test/unit/action-report.test.js can run every string it produces
 * through the same red-line check the CLI's own reports are held to. No score, no badge,
 * no conformance language: a clean run is "no automatically detectable failures".
 */

export const MARKER = '<!-- a11y-loop-report -->';

export const HONESTY =
  'A clean report means no automatically detectable failures were found in the states and ' +
  'passes that ran. It is not a conformance claim and does not replace manual testing or ' +
  'testing with assistive technology.';

const TOP_ROWS = 10;

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function code(text, max = 110) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  const cut = flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
  // A code span cannot contain a backtick; use a plain-text stand-in rather than break the markdown.
  return `\`${cut.replace(/`/g, "'")}\``;
}

function counts(report) {
  const s = report?.summary ?? {};
  return {
    violations: s.violations ?? 0,
    needsReview: s.needsReview ?? 0,
    bestPractice: s.bestPractice ?? 0,
    manual: s.manualChecklist ?? report?.manualChecklist?.length ?? 0,
  };
}

/** Step outputs. Every key is always present so downstream `if:` expressions never see empty. */
export function buildOutputs({ report, diff, auditExit, reportPath, sarifPath }) {
  const c = counts(report);
  const d = diff?.summary;
  return {
    violations: c.violations,
    'needs-review': c.needsReview,
    manual: c.manual,
    new: d ? d.new : 0,
    fixed: d ? d.fixed : 0,
    remaining: d ? d.remaining : 0,
    'report-path': reportPath ?? '',
    'sarif-path': sarifPath ?? '',
    'exit-code': auditExit,
  };
}

function findingRows(report, limit = TOP_ROWS) {
  const rows = report?.findings?.violations ?? [];
  return rows.slice(0, limit).map((f) => {
    const sc = f.wcag?.sc ? `SC ${f.wcag.sc}` : 'no SC';
    return `- ${sc} · ${f.ruleId} · ${code(f.selector)}`;
  });
}

function diffLines(diff) {
  if (!diff) return [];
  const d = diff.summary;
  const lines = [
    `**Against the baseline:** ${d.fixed} fixed · ${d.new} new · ${d.remaining} remaining`,
  ];
  const added = (diff.new ?? []).slice(0, TOP_ROWS);
  if (added.length) {
    lines.push('', `New violations (${added.length} of ${d.new} shown):`);
    for (const f of added) {
      lines.push(`- SC ${f.wcag?.sc ?? '?'} · ${f.ruleId} · ${code(f.selector)}`);
    }
  }
  lines.push('', d.regression ? `Regression: ${d.new} new violation(s).` : 'No new violations against the baseline.');
  return lines;
}

function manualLines(report) {
  const items = report?.manualChecklist ?? [];
  if (!items.length) return [];
  return [
    `**${plural(items.length, 'manual check')} still need a person.** The full list is in the JSON report under \`manualChecklist\`; the first ones:`,
    ...items.slice(0, 4).map((i) => `- ${i.text}`),
  ];
}

function headline(report, auditExit) {
  if (!report) {
    return `The audit could not run (exit code ${auditExit}). Nothing was checked.`;
  }
  const c = counts(report);
  const verdict = report.summary?.verdict ?? `${plural(c.violations, 'automatically detectable failure')}`;
  return `**${verdict}** · ${c.needsReview} to review · ${c.bestPractice} best-practice · ${plural(c.manual, 'manual check')}`;
}

export function renderSummary({ report, diff, auditExit, target, baselineNote }) {
  const out = ['## a11y-loop audit', '', headline(report, auditExit)];
  if (report) {
    out.push('', `Target: ${code(target ?? report.target?.value)} · ${report.summary?.target ?? 'WCAG 2.2 Level AA'}`);
  }
  const rows = findingRows(report);
  if (rows.length) {
    const total = counts(report).violations;
    out.push('', `Violations (${rows.length} of ${total} shown, full list in the JSON report):`, ...rows);
  }
  const dl = diffLines(diff);
  if (dl.length) out.push('', ...dl);
  if (baselineNote) out.push('', `> ${baselineNote}`);
  const ml = manualLines(report);
  if (ml.length) out.push('', ...ml);
  out.push('', `> ${HONESTY}`);
  if (report?.summary?.coverage?.statement) out.push('>', `> ${report.summary.coverage.statement}`);
  return `${out.join('\n')}\n`;
}

export function renderComment({ report, diff, auditExit, target, baselineNote, runUrl }) {
  const body = renderSummary({ report, diff, auditExit, target, baselineNote })
    .replace('## a11y-loop audit', '### a11y-loop audit');
  const footer = runUrl ? `\n<sub>Updated by [this workflow run](${runUrl}). One comment, edited in place.</sub>\n` : '';
  return `${MARKER}\n${body}${footer}`;
}
