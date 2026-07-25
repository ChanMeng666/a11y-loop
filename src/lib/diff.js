/**
 * Cross-iteration diff — the convergence and oscillation detector.
 *
 * Matching is by fingerprint, which is why fingerprints exist. Without it a loop
 * cannot tell "fixed" from "moved", cannot detect a regression, and cannot see
 * the classic oscillation: fix A, break B, fix B, break A, forever.
 *
 * NEW violations are a regression and fail the command, even when the total
 * count went down. A run that fixes six things and breaks one has broken one.
 */

const byFingerprint = (findings = []) => new Map(findings.map((f) => [f.fingerprint, f]));

function diffBucket(before = [], after = []) {
  const beforeMap = byFingerprint(before);
  const afterMap = byFingerprint(after);
  return {
    fixed: [...beforeMap.values()].filter((f) => !afterMap.has(f.fingerprint)),
    new: [...afterMap.values()].filter((f) => !beforeMap.has(f.fingerprint)),
    remaining: [...afterMap.values()].filter((f) => beforeMap.has(f.fingerprint)),
  };
}

/**
 * @param {object} before an a11y-loop JSON report
 * @param {object} after
 * @returns {{
 *   fixed:Array, new:Array, remaining:Array,
 *   needsReview:{fixed:Array,new:Array,remaining:Array},
 *   summary:{fixed:number,new:number,remaining:number,regression:boolean,converged:boolean,verdict:string}
 * }}
 */
export function diffReports(before, after) {
  const violations = diffBucket(before?.findings?.violations, after?.findings?.violations);
  const needsReview = diffBucket(before?.findings?.needsReview, after?.findings?.needsReview);

  const regression = violations.new.length > 0;
  const converged = !regression && violations.remaining.length === 0;

  let verdict;
  if (regression) {
    verdict =
      `REGRESSION: ${violations.new.length} new violation${violations.new.length === 1 ? '' : 's'} ` +
      `introduced (${violations.fixed.length} fixed, ${violations.remaining.length} still present)`;
  } else if (converged) {
    verdict =
      violations.fixed.length > 0
        ? `Converged: all ${violations.fixed.length} violation${violations.fixed.length === 1 ? '' : 's'} fixed, none introduced`
        : 'No violations in either report';
  } else {
    verdict =
      `Progress: ${violations.fixed.length} fixed, ${violations.remaining.length} still present, ` +
      'none introduced';
  }

  return {
    ...violations,
    needsReview,
    summary: {
      fixed: violations.fixed.length,
      new: violations.new.length,
      remaining: violations.remaining.length,
      needsReviewFixed: needsReview.fixed.length,
      needsReviewNew: needsReview.new.length,
      regression,
      converged,
      verdict,
    },
  };
}

const label = (finding) => {
  const sc = finding.wcag?.sc ? `SC ${finding.wcag.sc}` : '—';
  return { sc, rule: finding.ruleId, selector: finding.selector || '(document)' };
};

/** Compact fixed-width table plus the one-line verdict. */
export function formatDiffHuman(diff, { beforePath, afterPath } = {}) {
  const lines = [];
  lines.push(`a11y-loop diff · before: ${beforePath ?? 'before'} · after: ${afterPath ?? 'after'}`);

  const rows = [
    ...diff.fixed.map((f) => ({ status: 'FIXED', ...label(f) })),
    ...diff.new.map((f) => ({ status: 'NEW', ...label(f) })),
    ...diff.remaining.map((f) => ({ status: 'REMAINING', ...label(f) })),
  ];

  if (rows.length === 0) {
    lines.push('', 'No violations in either report.');
  } else {
    const width = (key, min) => Math.max(min, ...rows.map((r) => r[key].length));
    const statusWidth = width('status', 9);
    const scWidth = width('sc', 8);
    const ruleWidth = Math.min(28, width('rule', 4));
    lines.push('');
    for (const row of rows) {
      lines.push(
        [
          row.status.padEnd(statusWidth),
          row.sc.padEnd(scWidth),
          row.rule.slice(0, ruleWidth).padEnd(ruleWidth),
          row.selector,
        ].join('  '),
      );
    }
  }

  if (diff.summary.needsReviewNew > 0) {
    lines.push(
      '',
      `${diff.summary.needsReviewNew} new needs-review finding(s) — not blocking, but new.`,
    );
  }

  lines.push('', diff.summary.verdict);
  lines.push('');
  return lines.join('\n');
}
