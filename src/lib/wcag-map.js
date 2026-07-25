/**
 * WCAG success-criterion metadata, and the mapping from axe-core tags to it.
 *
 * Why a table rather than deriving everything from tags: axe tags tell you the
 * SC number and (redundantly) a level, but not the criterion's NAME, and the
 * name is what makes a finding triageable by a human. The table below is the
 * authority for name / level / first version; tags supply the SC number.
 *
 * Counts, per the WCAG 2.2 Recommendation: 31 Level A + 24 Level AA = 55
 * criteria in the AA conformance set, 86 in total. 4.1.1 Parsing was REMOVED in
 * WCAG 2.2 and is deliberately absent — a tool still reporting "duplicate id"
 * as a WCAG failure is citing a criterion that no longer exists.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {Record<string, {name:string, level:'A'|'AA'|'AAA', minVersion:'2.0'|'2.1'|'2.2'}>} */
export const SC_TABLE = {
  // ---- Principle 1: Perceivable ----
  '1.1.1': { name: 'Non-text Content', level: 'A', minVersion: '2.0' },
  '1.2.1': { name: 'Audio-only and Video-only (Prerecorded)', level: 'A', minVersion: '2.0' },
  '1.2.2': { name: 'Captions (Prerecorded)', level: 'A', minVersion: '2.0' },
  '1.2.3': {
    name: 'Audio Description or Media Alternative (Prerecorded)',
    level: 'A',
    minVersion: '2.0',
  },
  '1.2.4': { name: 'Captions (Live)', level: 'AA', minVersion: '2.0' },
  '1.2.5': { name: 'Audio Description (Prerecorded)', level: 'AA', minVersion: '2.0' },
  '1.2.6': { name: 'Sign Language (Prerecorded)', level: 'AAA', minVersion: '2.0' },
  '1.2.7': {
    name: 'Extended Audio Description (Prerecorded)',
    level: 'AAA',
    minVersion: '2.0',
  },
  '1.2.8': { name: 'Media Alternative (Prerecorded)', level: 'AAA', minVersion: '2.0' },
  '1.2.9': { name: 'Audio-only (Live)', level: 'AAA', minVersion: '2.0' },
  '1.3.1': { name: 'Info and Relationships', level: 'A', minVersion: '2.0' },
  '1.3.2': { name: 'Meaningful Sequence', level: 'A', minVersion: '2.0' },
  '1.3.3': { name: 'Sensory Characteristics', level: 'A', minVersion: '2.0' },
  '1.3.4': { name: 'Orientation', level: 'AA', minVersion: '2.1' },
  '1.3.5': { name: 'Identify Input Purpose', level: 'AA', minVersion: '2.1' },
  '1.3.6': { name: 'Identify Purpose', level: 'AAA', minVersion: '2.1' },
  '1.4.1': { name: 'Use of Color', level: 'A', minVersion: '2.0' },
  '1.4.2': { name: 'Audio Control', level: 'A', minVersion: '2.0' },
  '1.4.3': { name: 'Contrast (Minimum)', level: 'AA', minVersion: '2.0' },
  '1.4.4': { name: 'Resize Text', level: 'AA', minVersion: '2.0' },
  '1.4.5': { name: 'Images of Text', level: 'AA', minVersion: '2.0' },
  '1.4.6': { name: 'Contrast (Enhanced)', level: 'AAA', minVersion: '2.0' },
  '1.4.7': { name: 'Low or No Background Audio', level: 'AAA', minVersion: '2.0' },
  '1.4.8': { name: 'Visual Presentation', level: 'AAA', minVersion: '2.0' },
  '1.4.9': { name: 'Images of Text (No Exception)', level: 'AAA', minVersion: '2.0' },
  '1.4.10': { name: 'Reflow', level: 'AA', minVersion: '2.1' },
  '1.4.11': { name: 'Non-text Contrast', level: 'AA', minVersion: '2.1' },
  '1.4.12': { name: 'Text Spacing', level: 'AA', minVersion: '2.1' },
  '1.4.13': { name: 'Content on Hover or Focus', level: 'AA', minVersion: '2.1' },

  // ---- Principle 2: Operable ----
  '2.1.1': { name: 'Keyboard', level: 'A', minVersion: '2.0' },
  '2.1.2': { name: 'No Keyboard Trap', level: 'A', minVersion: '2.0' },
  '2.1.3': { name: 'Keyboard (No Exception)', level: 'AAA', minVersion: '2.0' },
  '2.1.4': { name: 'Character Key Shortcuts', level: 'A', minVersion: '2.1' },
  '2.2.1': { name: 'Timing Adjustable', level: 'A', minVersion: '2.0' },
  '2.2.2': { name: 'Pause, Stop, Hide', level: 'A', minVersion: '2.0' },
  '2.2.3': { name: 'No Timing', level: 'AAA', minVersion: '2.0' },
  '2.2.4': { name: 'Interruptions', level: 'AAA', minVersion: '2.0' },
  '2.2.5': { name: 'Re-authenticating', level: 'AAA', minVersion: '2.0' },
  '2.2.6': { name: 'Timeouts', level: 'AAA', minVersion: '2.1' },
  '2.3.1': { name: 'Three Flashes or Below Threshold', level: 'A', minVersion: '2.0' },
  '2.3.2': { name: 'Three Flashes', level: 'AAA', minVersion: '2.0' },
  '2.3.3': { name: 'Animation from Interactions', level: 'AAA', minVersion: '2.1' },
  '2.4.1': { name: 'Bypass Blocks', level: 'A', minVersion: '2.0' },
  '2.4.2': { name: 'Page Titled', level: 'A', minVersion: '2.0' },
  '2.4.3': { name: 'Focus Order', level: 'A', minVersion: '2.0' },
  '2.4.4': { name: 'Link Purpose (In Context)', level: 'A', minVersion: '2.0' },
  '2.4.5': { name: 'Multiple Ways', level: 'AA', minVersion: '2.0' },
  '2.4.6': { name: 'Headings and Labels', level: 'AA', minVersion: '2.0' },
  '2.4.7': { name: 'Focus Visible', level: 'AA', minVersion: '2.0' },
  '2.4.8': { name: 'Location', level: 'AAA', minVersion: '2.0' },
  '2.4.9': { name: 'Link Purpose (Link Only)', level: 'AAA', minVersion: '2.0' },
  '2.4.10': { name: 'Section Headings', level: 'AAA', minVersion: '2.0' },
  '2.4.11': { name: 'Focus Not Obscured (Minimum)', level: 'AA', minVersion: '2.2' },
  '2.4.12': { name: 'Focus Not Obscured (Enhanced)', level: 'AAA', minVersion: '2.2' },
  '2.4.13': { name: 'Focus Appearance', level: 'AAA', minVersion: '2.2' },
  '2.5.1': { name: 'Pointer Gestures', level: 'A', minVersion: '2.1' },
  '2.5.2': { name: 'Pointer Cancellation', level: 'A', minVersion: '2.1' },
  '2.5.3': { name: 'Label in Name', level: 'A', minVersion: '2.1' },
  '2.5.4': { name: 'Motion Actuation', level: 'A', minVersion: '2.1' },
  '2.5.5': { name: 'Target Size (Enhanced)', level: 'AAA', minVersion: '2.1' },
  '2.5.6': { name: 'Concurrent Input Mechanisms', level: 'AAA', minVersion: '2.1' },
  '2.5.7': { name: 'Dragging Movements', level: 'AA', minVersion: '2.2' },
  '2.5.8': { name: 'Target Size (Minimum)', level: 'AA', minVersion: '2.2' },

  // ---- Principle 3: Understandable ----
  '3.1.1': { name: 'Language of Page', level: 'A', minVersion: '2.0' },
  '3.1.2': { name: 'Language of Parts', level: 'AA', minVersion: '2.0' },
  '3.1.3': { name: 'Unusual Words', level: 'AAA', minVersion: '2.0' },
  '3.1.4': { name: 'Abbreviations', level: 'AAA', minVersion: '2.0' },
  '3.1.5': { name: 'Reading Level', level: 'AAA', minVersion: '2.0' },
  '3.1.6': { name: 'Pronunciation', level: 'AAA', minVersion: '2.0' },
  '3.2.1': { name: 'On Focus', level: 'A', minVersion: '2.0' },
  '3.2.2': { name: 'On Input', level: 'A', minVersion: '2.0' },
  '3.2.3': { name: 'Consistent Navigation', level: 'AA', minVersion: '2.0' },
  '3.2.4': { name: 'Consistent Identification', level: 'AA', minVersion: '2.0' },
  '3.2.5': { name: 'Change on Request', level: 'AAA', minVersion: '2.0' },
  '3.2.6': { name: 'Consistent Help', level: 'A', minVersion: '2.2' },
  '3.3.1': { name: 'Error Identification', level: 'A', minVersion: '2.0' },
  '3.3.2': { name: 'Labels or Instructions', level: 'A', minVersion: '2.0' },
  '3.3.3': { name: 'Error Suggestion', level: 'AA', minVersion: '2.0' },
  '3.3.4': { name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', minVersion: '2.0' },
  '3.3.5': { name: 'Help', level: 'AAA', minVersion: '2.0' },
  '3.3.6': { name: 'Error Prevention (All)', level: 'AAA', minVersion: '2.0' },
  '3.3.7': { name: 'Redundant Entry', level: 'A', minVersion: '2.2' },
  '3.3.8': { name: 'Accessible Authentication (Minimum)', level: 'AA', minVersion: '2.2' },
  '3.3.9': { name: 'Accessible Authentication (Enhanced)', level: 'AAA', minVersion: '2.2' },

  // ---- Principle 4: Robust ----
  // 4.1.1 Parsing was removed in WCAG 2.2 and is intentionally not listed.
  '4.1.2': { name: 'Name, Role, Value', level: 'A', minVersion: '2.0' },
  '4.1.3': { name: 'Status Messages', level: 'AA', minVersion: '2.1' },
};

/** WCAG 2.2 A/AA conformance-set size, for honest denominators in reports. */
export const CONFORMANCE_SET = Object.freeze({
  total: 86,
  levelA: 31,
  levelAA: 24,
  aaSet: 55,
});

/**
 * Turn an axe `wcagNNN` tag into a dotted SC number.
 * The first two digits are principle and guideline; everything after is the
 * criterion, so `wcag2410` is 2.4.10 rather than 2.41.0.
 *
 * @param {string} tag
 * @returns {string|null}
 */
export function scFromTag(tag) {
  const m = /^wcag(\d{3,})$/.exec(tag);
  if (!m) return null;
  const digits = m[1];
  return `${digits[0]}.${digits[1]}.${digits.slice(2)}`;
}

/** Level implied by axe's `wcag2a` / `wcag21aa` / `wcag22aa` style tags. */
export function levelFromTags(tags = []) {
  if (tags.some((t) => /^wcag2\d?aaa$/.test(t))) return 'AAA';
  if (tags.some((t) => /^wcag2\d?aa$/.test(t))) return 'AA';
  if (tags.some((t) => /^wcag2\d?a$/.test(t))) return 'A';
  return null;
}

/** First WCAG version containing the criterion, implied by axe's version tags. */
export function versionFromTags(tags = []) {
  if (tags.some((t) => /^wcag22a{1,3}$/.test(t))) return '2.2';
  if (tags.some((t) => /^wcag21a{1,3}$/.test(t))) return '2.1';
  if (tags.some((t) => /^wcag2a{1,3}$/.test(t))) return '2.0';
  return null;
}

/**
 * Metadata for a known SC number.
 * @param {string} sc e.g. '4.1.2'
 * @returns {{sc:string,name:string,level:string,minVersion:string,wcag22Only:boolean}|null}
 */
export function wcagForSc(sc) {
  const entry = SC_TABLE[sc];
  if (!entry) return null;
  return {
    sc,
    name: entry.name,
    level: entry.level,
    minVersion: entry.minVersion,
    wcag22Only: entry.minVersion === '2.2',
  };
}

/**
 * Derive WCAG metadata from an axe rule's tags.
 * Returns null for best-practice rules, which have no success criterion behind
 * them — that distinction is why best-practice findings are never blocking.
 *
 * @param {string[]} tags
 */
export function wcagFromTags(tags = []) {
  const scs = tags.map(scFromTag).filter(Boolean);
  if (scs.length === 0) return null;
  // A rule can map to several criteria (e.g. link-name → 2.4.4 + 4.1.2).
  // Report the lowest-numbered as primary and keep the rest.
  const sorted = scs.sort(compareSc);
  const primary = sorted[0];
  const known = wcagForSc(primary);
  if (known) {
    return { ...known, alsoSc: sorted.slice(1) };
  }
  // Unknown criterion (a future axe release): fall back to the tags.
  return {
    sc: primary,
    name: null,
    level: levelFromTags(tags),
    minVersion: versionFromTags(tags),
    wcag22Only: versionFromTags(tags) === '2.2',
    alsoSc: sorted.slice(1),
  };
}

/** Numeric sort for dotted SC numbers, so 2.4.9 comes before 2.4.10. */
export function compareSc(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/** True if a rule is best-practice only (no success criterion behind it). */
export function isBestPractice(tags = []) {
  return tags.includes('best-practice') && !tags.some((t) => scFromTag(t));
}

let ruleIndex = null;

/**
 * Rule metadata straight from the installed axe-core, keyed by rule id.
 * axe-core carries ACT rule ids inline in `actIds`, so the ACT mapping is free
 * and, unlike the W3C implementation report, is never stale relative to the
 * version we actually run.
 */
export function axeRuleIndex() {
  if (ruleIndex) return ruleIndex;
  ruleIndex = new Map();
  try {
    const axe = require('axe-core');
    for (const rule of axe.getRules()) {
      ruleIndex.set(rule.ruleId, rule);
    }
  } catch {
    // axe-core metadata unavailable: findings still carry SC data from tags.
  }
  return ruleIndex;
}

/** ACT rule ids for an axe rule, e.g. `button-name` → `['97a4e1','m6b1q3']`. */
export function actIdsForRule(ruleId) {
  return axeRuleIndex().get(ruleId)?.actIds ?? [];
}

/** The installed axe-core version, recorded in every report's provenance. */
export function axeCoreVersion() {
  try {
    return require('axe-core/package.json').version;
  } catch {
    return null;
  }
}

/**
 * `SC 4.1.2 Name, Role, Value (Level A)` — the citation format used in output.
 * The SC is always the source of the obligation; ACT ids are secondary
 * identifiers (ACT rules are informative, not normative).
 */
export function formatCitation(wcag) {
  if (!wcag?.sc) return null;
  const name = wcag.name ? ` ${wcag.name}` : '';
  const level = wcag.level ? ` (Level ${wcag.level})` : '';
  return `SC ${wcag.sc}${name}${level}`;
}
