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

/**
 * How a finding's verdict was established. Orthogonal to severity: severity
 * says whether a row blocks (the exit code), evidence says how much weight the
 * row itself can carry.
 *
 *  - `measured`     — a value was read off the rendered page and compared with
 *                     a threshold or a required attribute: every axe violation
 *                     (contrast ratios, missing names, invalid ARIA), and our
 *                     own static checks (positive tabindex, focus indicator
 *                     style diff, reflow scroll width, animation under reduced
 *                     motion).
 *  - `inferred`     — the failure is concluded from what a driven, bounded
 *                     probe did or did not observe: focus never arrived during
 *                     a Tab walk, a dialog let focus out, Escape did not close
 *                     it, Enter did not activate a role=button, or a click
 *                     handler with no role and no tabindex implies no keyboard
 *                     path. Still a real, blocking violation, but the verdict
 *                     rests on the probe having been representative — which is
 *                     why a row whose probe ran out of budget also carries
 *                     `confidence`.
 *  - `needs-review` — every needsReview row: axe `incomplete`, the rules we
 *                     always downgrade (target-size, forced-colors contrast),
 *                     and our own checks that find something real but cannot
 *                     judge it.
 */
export const EVIDENCE = {
  MEASURED: 'measured',
  INFERRED: 'inferred',
  NEEDS_REVIEW: 'needs-review',
};

/** Rule ids whose violations are behavioural inferences from a driven probe. */
export const INFERRED_RULES = new Set([
  'keyboard-unreachable',
  'dialog-initial-focus',
  'dialog-focus-not-trapped',
  'dialog-escape-does-not-close',
  'dialog-focus-not-returned',
  'role-button-keyboard-activation',
  'div-button',
]);

/** The evidence tier a finding gets when its producer does not say. */
export function defaultEvidence({ ruleId, severity }) {
  if (severity === SEVERITY.NEEDS_REVIEW) return EVIDENCE.NEEDS_REVIEW;
  if (INFERRED_RULES.has(ruleId)) return EVIDENCE.INFERRED;
  return EVIDENCE.MEASURED;
}

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
 * @param {string} [spec.evidence] one of EVIDENCE; derived when omitted
 * @param {{level:'reduced', reason:string}} [spec.confidence] set only when the
 *   probe behind the row hit a budget, so the verdict is weaker than usual
 * @param {string} [spec.note] why a row is not what it looks like
 * @param {string} [spec.noteUrl] where that explanation is written up
 * @param {string} [spec.routedFrom] the severity the engine reported before a
 *   documented rule moved the row (only 'violation' today)
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
    evidence,
    confidence,
    note,
    noteUrl,
    routedFrom,
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
    evidence: evidence ?? defaultEvidence({ ruleId, severity }),
  };

  if (suggestions?.length) finding.suggestions = suggestions;
  if (data) finding.data = data;
  if (confidence) finding.confidence = confidence;
  if (note) finding.note = note;
  if (noteUrl) finding.noteUrl = noteUrl;
  if (routedFrom) finding.routedFrom = routedFrom;
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
    //
    // Up to 0.3.2 this had one exception: a lone forced-colors color-contrast
    // violation could not override needs-review verdicts from the other passes
    // (the gradient case in test/integration/forced-colors-gradient.test.js).
    // reviewRouting() in axe-runner.js now routes every contrast-rule
    // violation from that pass to needs-review before it gets here, so no
    // audit can reach the exception any more, and it was removed. The gradient
    // test still holds, through the routing.
    if (existing.severity !== SEVERITY.VIOLATION && finding.severity === SEVERITY.VIOLATION) {
      existing.severity = SEVERITY.VIOLATION;
      existing.message = finding.message;
      // The row is now the violating sighting's verdict, so it carries that
      // sighting's evidence, and drops anything that only explained why an
      // earlier sighting had been routed to needs-review.
      existing.evidence = finding.evidence;
      if (finding.confidence) existing.confidence = finding.confidence;
      else delete existing.confidence;
      delete existing.note;
      delete existing.noteUrl;
      delete existing.routedFrom;
      if (!existing.data && finding.data) existing.data = finding.data;
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
