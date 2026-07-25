/**
 * The finding record — the unit of everything downstream (dedupe, diff, JSON,
 * human output, SARIF).
 *
 * Three severities, and the split matters:
 *  - `violation`   — a success criterion is failed. Blocking; exit code 1.
 *  - `needsReview` — axe `incomplete`, or one of our own checks that found
 *                    something real but cannot judge it. Never merged into
 *                    passes, never blocking.
 *  - `bestPractice`— an axe best-practice rule with no criterion behind it.
 *                    Never blocking, never counted as a violation.
 */

import { fingerprint } from './fingerprint.js';
import { wcagFromTags, wcagForSc, actIdsForRule } from './wcag-map.js';

export const SEVERITY = {
  VIOLATION: 'violation',
  NEEDS_REVIEW: 'needsReview',
  BEST_PRACTICE: 'bestPractice',
};

export const HTML_TRUNCATE_AT = 200;

/** Collapse whitespace and cap length, so reports stay readable and small. */
export function truncateHtml(html, limit = HTML_TRUNCATE_AT) {
  if (typeof html !== 'string') return '';
  const flat = html.replace(/\s+/g, ' ').trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`;
}

/**
 * @param {object} spec
 * @param {string} spec.ruleId
 * @param {'axe'|'a11y-loop'} spec.source
 * @param {string} spec.severity  one of SEVERITY
 * @param {string} [spec.impact]  minor | moderate | serious | critical
 * @param {string} [spec.sc]      success criterion number, for own checks
 * @param {string[]} [spec.tags]  axe tags, for axe findings
 * @param {string[]} [spec.act]   ACT rule ids (looked up from axe when omitted)
 * @param {string|Array} spec.selector
 * @param {string} [spec.html]
 * @param {string} spec.message
 * @param {string} [spec.helpUrl]
 * @param {Array} [spec.suggestions]
 * @param {string[]} [spec.passes] which emulation passes it appeared in
 * @param {string|null} [spec.state] interaction state name, if any
 * @param {object} [spec.data] extra check-specific detail
 */
export function makeFinding(spec) {
  const {
    ruleId,
    source,
    severity,
    impact = null,
    sc = null,
    tags = [],
    act,
    selector,
    html = '',
    message,
    helpUrl = null,
    suggestions,
    passes = [],
    state = null,
    data,
  } = spec;

  const wcag = sc ? wcagForSc(sc) : wcagFromTags(tags);

  const finding = {
    fingerprint: fingerprint({ ruleId, selector, html }),
    ruleId,
    source,
    severity,
    impact,
    wcag: wcag ?? null,
    act: act ?? (source === 'axe' ? actIdsForRule(ruleId) : []),
    passes: [...passes],
    state,
    selector: Array.isArray(selector) ? selector.flat(Infinity).join(', ') : String(selector ?? ''),
    html: truncateHtml(html),
    message,
    helpUrl,
  };

  if (suggestions?.length) finding.suggestions = suggestions;
  if (data) finding.data = data;
  return finding;
}

/**
 * Merge findings that the five emulation passes reported more than once,
 * recording every pass a finding appeared in. Same fingerprint + same state is
 * the same finding.
 *
 * @param {Array} findings
 * @returns {Array}
 */
export function dedupeFindings(findings) {
  const byKey = new Map();
  for (const finding of findings) {
    const key = `${finding.fingerprint}::${finding.state ?? ''}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...finding, passes: [...finding.passes] });
      continue;
    }
    for (const pass of finding.passes) {
      if (!existing.passes.includes(pass)) existing.passes.push(pass);
    }
    // A violation seen in any pass outranks a needs-review sighting of the same
    // thing, and richer data (suggestions) should survive the merge.
    if (
      existing.severity !== SEVERITY.VIOLATION &&
      finding.severity === SEVERITY.VIOLATION
    ) {
      existing.severity = SEVERITY.VIOLATION;
      existing.message = finding.message;
    }
    if (!existing.suggestions && finding.suggestions) existing.suggestions = finding.suggestions;
  }
  return [...byKey.values()];
}

/** Split a flat finding list into the three report buckets. */
export function bucketFindings(findings) {
  return {
    violations: findings.filter((f) => f.severity === SEVERITY.VIOLATION),
    needsReview: findings.filter((f) => f.severity === SEVERITY.NEEDS_REVIEW),
    bestPractice: findings.filter((f) => f.severity === SEVERITY.BEST_PRACTICE),
  };
}
