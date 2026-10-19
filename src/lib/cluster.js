/**
 * Root-cause clustering: many rows, one cause.
 *
 * A page with one wrong grey in its design tokens reports a contrast failure
 * on every element that uses it, and an agent reading 104 rows fixes 104
 * elements instead of one token. Clusters name the shared cause once, with
 * the fix once, and leave every row where it was: `findings` is unchanged and
 * each cluster lists its members by fingerprint.
 *
 * Two keys, both deliberately narrow:
 *
 *  - colour pair, for contrast rules: (rule, foreground, background, required
 *    ratio), from the values axe measured. The pass is not part of the key: the
 *    same pair failing in the default and the reflow pass is the same pair of
 *    declarations, and splitting it by pass would only fragment one cause.
 *    The cluster still lists every pass its members appeared in.
 *  - selector pattern, for everything else (and for contrast rows axe could not
 *    measure): (rule, selector with every :nth-child / :nth-of-type index
 *    replaced). Six empty social links in one list are one template.
 *
 * Rows are clustered within their own bucket and state, so a cluster never
 * mixes a blocking row with a non-blocking one, and a cluster needs at least
 * two members. A finding belongs to at most one cluster.
 */

import { createHash } from 'node:crypto';

import { SEVERITY } from './finding.js';

export const MIN_CLUSTER_SIZE = 2;

const CONTRAST_RULES = new Set(['color-contrast', 'color-contrast-enhanced']);

/** `div:nth-child(3) > span:nth-of-type(2)` → `div:nth-child(n) > span:nth-of-type(n)` */
export function selectorPattern(selector) {
  return String(selector ?? '').replace(/:(nth-child|nth-of-type|nth-last-child|nth-last-of-type)\(\s*[^)]*\)/g, ':$1(n)');
}

const normHex = (value) => String(value ?? '').trim().toLowerCase();

/** The colour-pair cause of a contrast row, or null when axe did not measure one. */
export function contrastCause(finding) {
  if (!CONTRAST_RULES.has(finding.ruleId)) return null;
  const c = finding.data?.contrast;
  if (!c?.fgColor || !c?.bgColor) return null;
  return {
    foreground: normHex(c.fgColor),
    background: normHex(c.bgColor),
    contrastRatio: c.contrastRatio ?? null,
    expectedContrastRatio: c.expectedContrastRatio ?? null,
  };
}

function clusterKey(finding) {
  const cause = contrastCause(finding);
  if (cause) {
    return {
      kind: 'colour-pair',
      key: [cause.foreground, cause.background, cause.expectedContrastRatio ?? ''].join('|'),
      cause,
    };
  }
  const pattern = selectorPattern(finding.selector);
  return { kind: 'selector-pattern', key: pattern, cause: { selectorPattern: pattern } };
}

const ratioText = (r) => (r === null || r === undefined ? '?' : `${r}`.replace(/:1$/, ''));

/** One plain sentence naming the shared cause. */
export function describeCause(cluster) {
  if (cluster.kind === 'colour-pair') {
    const { foreground, background, contrastRatio, expectedContrastRatio } = cluster.cause;
    return (
      `${foreground} text on ${background}: ${ratioText(contrastRatio)}:1 ` +
      `against ${ratioText(expectedContrastRatio)}:1 required`
    );
  }
  return `the same rule on elements matching ${cluster.cause.selectorPattern}`;
}

/** The `a11y-loop contrast` command that reproduces a colour-pair cluster's fix. */
export function contrastCommand(cause) {
  const expected = Number.parseFloat(String(cause.expectedContrastRatio ?? ''));
  const large = Number.isFinite(expected) && expected < 4.5 ? ' --large' : '';
  return `a11y-loop contrast "${cause.foreground}" "${cause.background}"${large} --fix`;
}

function clusterId(bucket, ruleId, state, kind, key) {
  const hash = createHash('sha256')
    .update([bucket, ruleId, state ?? '', kind, key].join('\u0000'), 'utf8')
    .digest('hex')
    .slice(0, 10);
  return `cl-${hash}`;
}

/**
 * @param {{violations:Array, needsReview:Array, bestPractice:Array}} buckets
 * @returns {Array<object>} clusters, largest first, then by first appearance
 */
export function buildClusters(buckets) {
  const clusters = [];
  const order = [
    ['violations', SEVERITY.VIOLATION],
    ['needsReview', SEVERITY.NEEDS_REVIEW],
    ['bestPractice', SEVERITY.BEST_PRACTICE],
  ];
  let seq = 0;
  for (const [bucket, severity] of order) {
    const groups = new Map();
    for (const finding of buckets[bucket] ?? []) {
      const { kind, key, cause } = clusterKey(finding);
      const groupKey = [finding.ruleId, finding.state ?? '', kind, key].join('\u0000');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { kind, key, cause, ruleId: finding.ruleId, state: finding.state ?? null, members: [], seq: seq++ });
      }
      groups.get(groupKey).members.push(finding);
    }

    for (const group of groups.values()) {
      if (group.members.length < MIN_CLUSTER_SIZE) continue;
      const [first] = group.members;
      const passes = [];
      for (const member of group.members) {
        for (const pass of member.passes ?? []) if (!passes.includes(pass)) passes.push(pass);
      }
      const cluster = {
        id: clusterId(bucket, group.ruleId, group.state, group.kind, group.key),
        ruleId: group.ruleId,
        severity,
        // One rule in one bucket has one evidence tier; the first member's is all of them.
        evidence: first.evidence ?? null,
        wcag: first.wcag ?? null,
        state: group.state,
        kind: group.kind,
        cause: group.cause,
        count: group.members.length,
        passes,
        representative: { fingerprint: first.fingerprint, selector: first.selector, html: first.html },
        fingerprints: group.members.map((m) => m.fingerprint),
        seq: group.seq,
      };
      cluster.causeText = describeCause(cluster);
      const suggestions = group.members.find((m) => m.suggestions?.length)?.suggestions;
      if (suggestions) cluster.suggestions = suggestions;
      if (group.kind === 'colour-pair' && suggestions) cluster.fixCommand = contrastCommand(group.cause);
      const note = group.members.find((m) => m.note);
      if (note) {
        cluster.note = note.note;
        if (note.noteUrl) cluster.noteUrl = note.noteUrl;
      }
      clusters.push(cluster);
    }
  }
  clusters.sort((a, b) => b.count - a.count || a.seq - b.seq);
  return clusters.map(({ seq: _seq, ...cluster }) => cluster);
}

/** Distinct colour pairs behind a bucket's contrast rows, and how many rows they cover. */
export function colourPairSummary(findings = []) {
  const pairs = new Set();
  let rows = 0;
  for (const finding of findings) {
    const cause = contrastCause(finding);
    if (!cause) continue;
    rows += 1;
    pairs.add([finding.ruleId, cause.foreground, cause.background, cause.expectedContrastRatio ?? ''].join('|'));
  }
  return { pairs: pairs.size, rows };
}
