/**
 * `a11y-loop mcp` — the same commands, served as Model Context Protocol tools
 * over stdio, for clients that only speak MCP.
 *
 * Thin by design. Every tool calls the function its CLI command calls
 * (`buildAuditReport`, `diffReports`, `checkedContrastResult`, `planCheck`,
 * `collectDoctorReport`), so a tool result and the matching `--json` output
 * are the same report. Nothing here decides what counts as a violation.
 *
 * Reports from this session are kept in memory under a run id, so an agent can
 * audit, fix, re-audit and diff by id without writing files. They are lost when
 * the client closes the connection; pass `out` to keep one.
 *
 * stdout carries the protocol and nothing else. Diagnostics go to stderr.
 * The process exits 0 when the client closes stdin.
 */

import { readFileSync } from 'node:fs';

import { McpServer, ResourceTemplate, ResourceNotFoundError } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

import { buildAuditReport, resolveAuditTarget, writeOutputFile } from './audit.js';
import { checkedContrastResult } from './contrast.js';
import { readReport, validateReport } from './diff.js';
import { collectDoctorReport } from './doctor.js';
import { planCheck } from './plan-check.js';
import { diffReports } from '../lib/diff.js';
import { COVERAGE, serializeReport } from '../lib/format/json.js';
import { ToolError, PASSES } from '../lib/axe-runner.js';

const VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

/** Findings listed per bucket in a tool result; the full report has them all. */
export const MAX_FINDINGS_PER_BUCKET = 50;
/** Reports kept in memory per server process, oldest dropped first. */
export const MAX_RUNS = 20;

export const DEFAULT_AUDIT_TIMEOUT_MS = 180_000;

const INSTRUCTIONS = `a11y-loop runs a real-browser accessibility audit (axe-core plus its own keyboard, focus, dialog, reflow, motion and target-size checks) across five rendering passes and any interaction states you script, and lists what it could not check.

The loop: a11y_loop_plan_check on the plan before building UI; a11y_loop_audit on what you built; fix; a11y_loop_audit again; a11y_loop_diff with the two run ids until it reports converged. a11y_loop_contrast_fix gives passing colour candidates for a failing pair. a11y_loop_doctor says why an audit cannot run.

${COVERAGE.statement} Every audit result carries a manual checklist of what a person still has to verify; report it alongside the findings, never instead of them.`;

/* ---------- session store ---------- */

const runs = new Map();
let runCounter = 0;

function storeRun(report) {
  runCounter += 1;
  const runId = `run-${runCounter}`;
  runs.set(runId, report);
  while (runs.size > MAX_RUNS) runs.delete(runs.keys().next().value);
  return runId;
}

function latestRunId() {
  return [...runs.keys()].at(-1) ?? null;
}

function runOrThrow(runId) {
  const id = runId ?? latestRunId();
  if (!id) {
    throw new ToolError('No audit has run in this session yet.', {
      hint: 'Call a11y_loop_audit first; its result carries a runId.',
    });
  }
  const report = runs.get(id);
  if (!report) {
    throw new ToolError(`No run "${id}" in this session.`, {
      hint: `Known runs: ${[...runs.keys()].join(', ') || 'none'}. Only the last ${MAX_RUNS} are kept, and none survive a restart; pass "out" to a11y_loop_audit to keep a report on disk.`,
    });
  }
  return { runId: id, report };
}

/** Exported for tests. */
export function resetRunsForTests() {
  runs.clear();
  runCounter = 0;
}

/* ---------- result shaping ---------- */

/** The fields an agent acts on. The full finding is in the stored report. */
export function trimFinding(f) {
  return {
    fingerprint: f.fingerprint,
    ruleId: f.ruleId,
    severity: f.severity,
    impact: f.impact ?? null,
    sc: f.wcag?.sc ?? null,
    scName: f.wcag?.name ?? null,
    level: f.wcag?.level ?? null,
    passes: f.passes ?? [],
    state: f.state ?? null,
    selector: f.selector,
    message: f.message,
    helpUrl: f.helpUrl ?? null,
    evidence: f.evidence ?? null,
    ...(f.confidence ? { confidence: f.confidence } : {}),
    ...(f.routedFrom ? { routedFrom: f.routedFrom } : {}),
    ...(f.note ? { note: f.note } : {}),
    ...(f.noteUrl ? { noteUrl: f.noteUrl } : {}),
    ...(f.suggestions?.length ? { suggestions: f.suggestions } : {}),
  };
}

/** A root-cause cluster without its full member list, which the report keeps. */
export function trimCluster(c) {
  const { fingerprints, seq, ...rest } = c;
  return rest;
}

function capped(findings = []) {
  return {
    items: findings.slice(0, MAX_FINDINGS_PER_BUCKET).map(trimFinding),
    omitted: Math.max(0, findings.length - MAX_FINDINGS_PER_BUCKET),
  };
}

/** The audit tool's result: the JSON report, trimmed for a model's context. */
export function auditToolResult(report, { runId, reportPath = null }) {
  const { coverage, ...summary } = report.summary;
  const violations = capped(report.findings.violations);
  const needsReview = capped(report.findings.needsReview);
  const bestPractice = capped(report.findings.bestPractice);
  const omitted = violations.omitted + needsReview.omitted + bestPractice.omitted;

  const clusters = report.clusters ?? [];
  return {
    runId,
    schemaVersion: report.schemaVersion ?? 1,
    target: { type: report.target.type, value: report.target.type === 'html' ? '(inline html)' : report.target.value },
    verdict: summary.verdict,
    summary,
    passesRun: report.tool.passesRun,
    statesRun: report.tool.statesRun,
    findings: {
      violations: violations.items,
      needsReview: needsReview.items,
      bestPractice: bestPractice.items,
    },
    clusters: clusters.slice(0, MAX_FINDINGS_PER_BUCKET).map(trimCluster),
    ...(omitted
      ? {
          omitted: {
            violations: violations.omitted,
            needsReview: needsReview.omitted,
            bestPractice: bestPractice.omitted,
            note: `Each list shows at most ${MAX_FINDINGS_PER_BUCKET}. The full report is the resource a11y-loop://runs/${runId}/report, or pass "out" to write it to disk.`,
          },
        }
      : {}),
    manualChecklist: report.manualChecklist,
    coverage: coverage?.statement ?? COVERAGE.statement,
    ...(reportPath ? { reportPath } : {}),
    tool: { name: report.tool.name, version: report.tool.version, axeCoreVersion: report.tool.axeCoreVersion },
  };
}

export function diffToolResult(diff, { before, after }) {
  const list = (items) => capped(items);
  const fixed = list(diff.fixed);
  const added = list(diff.new);
  const remaining = list(diff.remaining);
  const reclassified = list(diff.reclassified ?? []);
  return {
    before,
    after,
    converged: diff.summary.converged,
    regression: diff.summary.regression,
    verdict: diff.summary.verdict,
    summary: diff.summary,
    fixed: fixed.items,
    new: added.items,
    remaining: remaining.items,
    reclassified: reclassified.items,
    ...(fixed.omitted + added.omitted + remaining.omitted + reclassified.omitted
      ? {
          omitted: {
            fixed: fixed.omitted,
            new: added.omitted,
            remaining: remaining.omitted,
            reclassified: reclassified.omitted,
          },
        }
      : {}),
    coverage: COVERAGE.statement,
  };
}

function jsonResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

/** A tool failure the model can read and act on: the CLI's message and hint. */
export function toolErrorResult(error) {
  const text =
    error instanceof ToolError
      ? `a11y-loop: ${error.message}${error.hint ? `\n\n${error.hint}` : ''}`
      : `a11y-loop: unexpected error: ${error?.message ?? error}`;
  return { content: [{ type: 'text', text }], isError: true };
}

function guarded(handler) {
  return async (args, ctx) => {
    try {
      return await handler(args, ctx);
    } catch (error) {
      return toolErrorResult(error);
    }
  };
}

/** Sends MCP progress notifications when the client asked for them. */
function progressReporter(ctx, log) {
  const token = ctx?.mcpReq?._meta?.progressToken;
  return (step) => {
    const message = `${step.kind} "${step.name}" done (${step.done}/${step.total})`;
    log(`a11y-loop mcp: audit ${message}\n`);
    if (token === undefined) return;
    ctx.mcpReq
      .notify({
        method: 'notifications/progress',
        params: { progressToken: token, progress: step.done, total: step.total, message },
      })
      .catch(() => {});
  };
}

/**
 * Run the audit with a deadline. On timeout or client cancellation the browser
 * is closed and a ToolError comes back at once, without waiting for teardown.
 */
async function auditWithDeadline({ target, flags, timeoutMs, clientSignal, onProgress }) {
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new ToolError(`The audit did not finish within ${timeoutMs} ms, so it was stopped and no report was produced.`, {
          hint:
            'Raise timeoutMs, audit a smaller target, or check that the page finishes loading. ' +
            'a11y_loop_doctor shows whether a browser can launch here at all.',
        }),
      ),
    timeoutMs,
  );
  const signal = clientSignal ? AbortSignal.any([controller.signal, clientSignal]) : controller.signal;
  const aborted = new Promise((_, reject) => {
    const fail = () =>
      reject(signal.reason instanceof ToolError ? signal.reason : new ToolError('The audit was cancelled by the client.'));
    if (signal.aborted) fail();
    else signal.addEventListener('abort', fail, { once: true });
  });
  const audit = buildAuditReport({ target, flags, signal, onProgress });
  audit.catch(() => {});
  aborted.catch(() => {});
  try {
    return await Promise.race([audit, aborted]);
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- server ---------- */

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/**
 * A fresh server with every tool and resource registered.
 * @param {{log?:(s:string)=>void}} [options]
 */
export function createServer({ log = () => {} } = {}) {
  const server = new McpServer({ name: 'a11y-loop', version: VERSION }, { instructions: INSTRUCTIONS });

  server.registerTool(
    'a11y_loop_audit',
    {
      title: 'Audit a page in a real browser',
      description: `Audit one page in headless Chromium with axe-core and a11y-loop's own checks (keyboard reachability, focus visibility, dialog focus trap, div-as-button, link text, reduced motion, reflow, target size), across five rendering passes: ${PASSES.map((p) => p.name).join(', ')}. Give exactly one of url, file or html. Files and html are served over http on 127.0.0.1, never file://.

Returns the same report \`a11y-loop audit --json\` writes, trimmed: a runId, the verdict, summary counts, violations / needsReview / bestPractice findings (each with fingerprint, ruleId, WCAG criterion, selector, passes, message, helpUrl, evidence tier, and colour suggestions for contrast failures), root-cause clusters (one cause behind many rows, so the fix is planned once), the manual checklist of what a person must still verify, and the coverage statement. Only violations are failures; best-practice findings never are.

Fix, audit again, then call a11y_loop_diff with both runIds. If the browser is missing the result is an error naming the fix; a11y_loop_doctor explains more.

Example: {"html": "<main><h1>Settings</h1><button></button></main>"}`,
      inputSchema: z.strictObject({
        url: z.string().optional().describe('An http(s) URL of a running page, e.g. "http://localhost:3000/settings"'),
        file: z.string().optional().describe('Path to an HTML file. Use an absolute path: relative paths resolve against the server process directory'),
        html: z.string().optional().describe('An HTML fragment or document to audit, e.g. "<button>Save</button>"'),
        interact: z
          .string()
          .optional()
          .describe('Absolute path to an ESM module exporting `states = { "modal-open": async (page) => { ... } }`, to audit interaction states. The module runs in this process with your permissions, exactly as `--interact` does'),
        bestPractice: z.boolean().default(true).describe('Include axe best-practice rules. They are listed separately and never count as violations'),
        out: z.string().optional().describe('Also write the full JSON report to this path, for a11y_loop_diff or CI'),
        timeoutMs: z
          .number()
          .int()
          .min(1_000)
          .max(900_000)
          .default(DEFAULT_AUDIT_TIMEOUT_MS)
          .describe('Stop the audit and return an error after this many milliseconds'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guarded(async ({ url, file, html, interact, bestPractice, out, timeoutMs }, ctx) => {
      const target = resolveAuditTarget(url ? [url] : [], { file, html });
      const report = await auditWithDeadline({
        target,
        flags: { interact, bestPractice },
        timeoutMs,
        clientSignal: ctx?.mcpReq?.signal,
        onProgress: progressReporter(ctx, log),
      });
      let reportPath = null;
      if (out) {
        reportPath = await writeOutputFile(out, serializeReport(report));
      }
      const runId = storeRun(report);
      return jsonResult(auditToolResult(report, { runId, reportPath }));
    }),
  );

  server.registerTool(
    'a11y_loop_diff',
    {
      title: 'Compare two audits',
      description: `Compare two audit reports by finding fingerprint and classify every violation as FIXED, NEW or REMAINING, and list as RECLASSIFIED a violation that now appears under needs-review (moved, not fixed). The same logic as \`a11y-loop diff --json\`.

converged is true when nothing is new and nothing remains. regression is true when anything is new, even if the total went down: a run that fixes six things and breaks one has broken one.

Each of before and after is a runId from a11y_loop_audit in this session, or a path to a JSON report written by \`a11y-loop audit --out\`.

Example: {"before": "run-1", "after": "run-2"}`,
      inputSchema: z.strictObject({
        before: z.string().min(1).describe('runId (e.g. "run-1") or path to the earlier JSON report'),
        after: z.string().min(1).describe('runId (e.g. "run-2") or path to the later JSON report'),
      }),
      annotations: READ_ONLY,
    },
    guarded(async ({ before, after }) => {
      const load = async (ref, label) =>
        runs.has(ref) ? validateReport(runs.get(ref), label, ref) : readReport(ref, label);
      const diff = diffReports(await load(before, 'before'), await load(after, 'after'));
      return jsonResult(diffToolResult(diff, { before, after }));
    }),
  );

  server.registerTool(
    'a11y_loop_contrast_fix',
    {
      title: 'Check a colour pair and suggest fixes',
      description: `Measure a foreground/background pair with the WCAG 2.x contrast algorithm (truncated to two decimals, as axe-core does) and, when it falls short, suggest lighter and darker candidates that reach the threshold with hue and chroma kept (OKLCh). The same result as \`a11y-loop contrast <fg> <bg> --fix --json\`.

Accepts #rgb, #rrggbb, #rrggbbaa, rgb()/rgba(), hsl()/hsla(), oklch() and CSS named colours. Set large for large-scale text (>=24px, or >=18.5px bold) and ui for non-text components (3:1, SC 1.4.11).

Example: {"foreground": "#777777", "background": "#ffffff"}`,
      inputSchema: z.strictObject({
        foreground: z.string().min(1).describe('Text or component colour, e.g. "#777777"'),
        background: z.string().min(1).describe('Background colour, e.g. "#ffffff"'),
        large: z.boolean().default(false).describe('Large-scale text thresholds'),
        ui: z.boolean().default(false).describe('Non-text / UI component threshold (3:1)'),
        fix: z.boolean().default(true).describe('Include passing colour suggestions'),
      }),
      annotations: READ_ONLY,
    },
    guarded(async ({ foreground, background, large, ui, fix }) =>
      jsonResult(checkedContrastResult(foreground, background, { large, ui, fix })),
    ),
  );

  server.registerTool(
    'a11y_loop_plan_check',
    {
      title: 'Check a plan names its accessibility decisions',
      description: `Before building UI, check that a plan answers the accessibility questions that are hard to change later: the conformance target, per-component criteria, decisions that foreclose options, colour tokens, structure, how it will be verified, and the manual-testing budget. The same decision as \`a11y-loop plan-check --json\` and the Claude Code plan gate.

verdict "fail" means a UI plan with thin or absent accessibility content; the result lists what is missing, the plan rule behind each item, and a template section to fill in. verdict "pass" covers plans with that content, plans that are not UI work, and plans too short to assess (see "why"). It checks that the questions were asked, not that the answers are good, and says nothing about anything built from the plan.

Give exactly one of text or file. Example: {"text": "Build a settings page with a modal dialog and tabs..."}`,
      inputSchema: z.strictObject({
        text: z.string().optional().describe('The plan text'),
        file: z.string().optional().describe('Absolute path to a plan file (Markdown or text)'),
      }),
      annotations: READ_ONLY,
    },
    guarded(async ({ text, file }) => {
      if (text === undefined && file === undefined) {
        throw new ToolError('a11y_loop_plan_check needs a plan.', { hint: 'Pass "text" with the plan, or "file" with a path to it.' });
      }
      return jsonResult(await planCheck({ text, file }, null));
    }),
  );

  server.registerTool(
    'a11y_loop_doctor',
    {
      title: 'Check whether an audit can run here',
      description: `Report, as facts, whether an audit can run in this environment: Node version, the bundled Playwright, whether headless Chromium actually launches, PLAYWRIGHT_BROWSERS_PATH, axe-core, and installed skill or plugin copies. Each failing check names its fix (usually \`a11y-loop install-browser\`). The same report as \`a11y-loop doctor --json\`. Call it when a11y_loop_audit returns an error.`,
      inputSchema: z.strictObject({}),
      annotations: { ...READ_ONLY, idempotentHint: true },
    },
    guarded(async () => {
      const report = await collectDoctorReport();
      return jsonResult({ canAudit: report.canAudit, checks: report.checks });
    }),
  );

  server.registerTool(
    'a11y_loop_manual_checklist',
    {
      title: 'What a person must still check',
      description: `Return the manual checklist for an audit run in this session: the items automated checks cannot verify for this page (built from what the page contains, which engine results were inconclusive, and whether interaction states were audited), each with its WCAG criterion and why it needs a person. The same list as the report's manualChecklist. Defaults to the latest run.`,
      inputSchema: z.strictObject({
        runId: z.string().optional().describe('runId from a11y_loop_audit, e.g. "run-1". Defaults to the latest run'),
      }),
      annotations: READ_ONLY,
    },
    guarded(async ({ runId }) => {
      const run = runOrThrow(runId);
      return jsonResult({ runId: run.runId, manualChecklist: run.report.manualChecklist, coverage: COVERAGE.statement });
    }),
  );

  const listRuns = (suffix, label) => async () => ({
    resources: [...runs.keys()].map((id) => ({
      uri: `a11y-loop://runs/${id}/${suffix}`,
      name: `${id} ${label}`,
      mimeType: 'application/json',
    })),
  });

  const readRun = (pick) => async (uri, { runId }) => {
    const report = runs.get(String(runId));
    if (!report) throw new ResourceNotFoundError(uri.href);
    return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(pick(report), null, 2) }] };
  };

  server.registerResource(
    'audit-report',
    new ResourceTemplate('a11y-loop://runs/{runId}/report', { list: listRuns('report', 'full report') }),
    {
      title: 'Full audit report',
      description: 'The complete JSON report of an audit run in this session, exactly as `a11y-loop audit --json` writes it.',
      mimeType: 'application/json',
    },
    readRun((report) => report),
  );

  server.registerResource(
    'manual-checklist',
    new ResourceTemplate('a11y-loop://runs/{runId}/checklist', { list: listRuns('checklist', 'manual checklist') }),
    {
      title: 'Manual checklist',
      description: 'What a person must still verify for an audit run in this session.',
      mimeType: 'application/json',
    },
    readRun((report) => report.manualChecklist),
  );

  return server;
}

/**
 * @param {{flags?:object}} _input
 * @param {{write:Function, writeError:Function}} io
 * @param {{stdin?:NodeJS.ReadableStream}} [deps]
 * @returns {Promise<number>} 0 once the client closes stdin
 */
export async function runMcpCommand(_input, io, { stdin = process.stdin } = {}) {
  const log = (text) => io.writeError(text);
  const handle = serveStdio(() => createServer({ log }), {
    onerror: (error) => log(`a11y-loop mcp: ${error?.message ?? error}\n`),
  });
  log(`a11y-loop mcp ${VERSION}: serving on stdio\n`);

  await new Promise((done) => {
    if (stdin.readableEnded || stdin.destroyed) return done();
    stdin.once('end', done);
    stdin.once('close', done);
  });
  await handle.close().catch(() => {});
  return 0;
}
