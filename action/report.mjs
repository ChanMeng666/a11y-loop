#!/usr/bin/env node
/**
 * Called by action.yml after the audit. Reads the JSON report (and the diff, if any) and writes
 * the step summary, the PR comment body and the step outputs. Never decides pass or fail; the
 * last step of the action does that from `fail-on`.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { buildOutputs, renderComment, renderSummary } from './lib.mjs';

const { values: v } = parseArgs({
  options: {
    report: { type: 'string' },
    diff: { type: 'string' },
    'audit-exit': { type: 'string', default: '2' },
    target: { type: 'string', default: '' },
    'baseline-note': { type: 'string', default: '' },
    'sarif-path': { type: 'string', default: '' },
    'run-url': { type: 'string', default: '' },
    'summary-out': { type: 'string' },
    'comment-out': { type: 'string' },
    'outputs-out': { type: 'string' },
  },
});

const readJson = (p) => (p && existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

const report = readJson(v.report);
const diff = readJson(v.diff);
const auditExit = Number(v['audit-exit']);
const ctx = { report, diff, auditExit, target: v.target, baselineNote: v['baseline-note'], runUrl: v['run-url'] };

if (v['summary-out']) appendFileSync(v['summary-out'], `${renderSummary(ctx)}\n`);
if (v['comment-out']) writeFileSync(v['comment-out'], JSON.stringify({ body: renderComment(ctx) }));
if (v['outputs-out']) {
  const outputs = buildOutputs({
    report,
    diff,
    auditExit,
    reportPath: report ? v.report : '',
    sarifPath: v['sarif-path'] && existsSync(v['sarif-path']) ? v['sarif-path'] : '',
  });
  appendFileSync(v['outputs-out'], `${Object.entries(outputs).map(([k, val]) => `${k}=${val}`).join('\n')}\n`);
}
