/**
 * The upgrade case, through the real engine: a report made the 0.3.2 way
 * (forced-colors contrast rows counted as violations) diffed against a report
 * made now (the same rows routed to needs-review). Nothing on the page
 * changed, so diff must not say anything was fixed.
 *
 * The 0.3.2 report is synthesised from the current one by moving every routed
 * row back into violations and stripping what the routing added — which is
 * exactly what 0.3.2 produced for this fixture (1 violation, exit 1; measured
 * 2026-10-20 at axe-core 4.14.0 before the routing landed).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAudit } from '../../src/lib/axe-runner.js';
import { buildReport } from '../../src/lib/format/json.js';
import { diffReports } from '../../src/lib/diff.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, '..', 'fixtures', 'fixture-forced-colors-dark-surface.html');
const TOOL = { name: 'a11y-loop', version: 'test', passesRun: [], statesRun: [] };

test('a 0.3.2 report of the dark-surface fixture diffs as RECLASSIFIED, not Converged-by-fixing', { timeout: 60_000 }, async () => {
  const result = await runAudit({ target: { type: 'file', value: FIXTURE } });
  const after = buildReport({ tool: TOOL, target: { type: 'file', value: FIXTURE }, findings: result.findings });
  const routed = after.findings.needsReview.filter((f) => f.routedFrom);
  assert.equal(routed.length, 1, 'the fixture reproduces one routed row');
  assert.equal(after.summary.violations, 0);

  const legacyFindings = result.findings.map((f) => {
    if (!f.routedFrom) return f;
    const { routedFrom: _r, note: _n, noteUrl: _u, ...rest } = f;
    return { ...rest, severity: 'violation', evidence: 'measured' };
  });
  const before = buildReport({ tool: TOOL, target: { type: 'file', value: FIXTURE }, findings: legacyFindings });
  assert.equal(before.summary.violations, 1);

  const diff = diffReports(before, after);
  assert.equal(diff.summary.fixed, 0);
  assert.equal(diff.summary.reclassified, 1);
  assert.equal(diff.reclassified[0].fingerprint, routed[0].fingerprint);
  assert.equal(diff.summary.verdict, 'Converged: no violations fixed, 1 reclassified to needs-review, none introduced');
});
