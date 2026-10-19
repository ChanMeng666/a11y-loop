/**
 * `a11y-loop mcp`, driven the way an MCP client drives it: the real CLI as a
 * child process, newline-delimited JSON-RPC on stdin/stdout, nothing mocked.
 *
 * The audit cases need Chromium. Where it is missing they are skipped with the
 * reason, and the missing-browser case below proves the error path instead.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeReport, cleanReport, emptyButtonFinding } from '../helpers/report-fixture.js';
import { serializeReport, findRedLineLanguage, COVERAGE } from '../../src/lib/format/json.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO, 'src', 'cli.js');

const TOOLS = [
  'a11y_loop_audit',
  'a11y_loop_contrast_fix',
  'a11y_loop_diff',
  'a11y_loop_doctor',
  'a11y_loop_manual_checklist',
  'a11y_loop_plan_check',
];

const UI_PLAN = `Build a React settings page. Add a modal dialog for role changes, a
members table with per-row actions, tabs across the top and a dark mode toggle
styled with Tailwind CSS. The navbar gets a dropdown and a submit button.`;

/** A minimal MCP client over a child process's stdio. */
function startServer(env = {}) {
  const child = spawn(process.execPath, [CLI, 'mcp'], {
    cwd: REPO,
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const pending = new Map();
  const notifications = [];
  let stdout = '';
  let stderr = '';
  let nextId = 0;
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
    let i;
    while ((i = stdout.indexOf('\n')) >= 0) {
      const line = stdout.slice(0, i).trim();
      stdout = stdout.slice(i + 1);
      if (!line) continue;
      const message = JSON.parse(line); // anything that is not JSON-RPC on stdout fails the test here
      if (message.id !== undefined && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      } else {
        notifications.push(message);
      }
    }
  });
  child.stderr.on('data', (chunk) => (stderr += chunk));
  const exited = new Promise((resolve) => child.on('close', (code, signal) => resolve({ code, signal })));

  const request = (method, params = {}, timeoutMs = 30_000) =>
    new Promise((resolve, reject) => {
      nextId += 1;
      const id = nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} got no response in ${timeoutMs} ms\nstderr: ${stderr}`));
      }, timeoutMs);
      pending.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });

  const call = async (name, args = {}, { timeoutMs, meta } = {}) => {
    const response = await request('tools/call', { name, arguments: args, ...(meta ? { _meta: meta } : {}) }, timeoutMs);
    assert.equal(response.error, undefined, `tools/call ${name} was a protocol error: ${JSON.stringify(response.error)}`);
    return response.result;
  };

  const initialize = async () => {
    const response = await request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'a11y-loop-test', version: '0.0.0' },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    return response;
  };

  const close = async () => {
    child.stdin.end();
    const timer = setTimeout(() => child.kill(), 10_000);
    const result = await exited;
    clearTimeout(timer);
    return result;
  };

  return { child, request, call, initialize, close, notifications, stderr: () => stderr };
}

const json = (result) => JSON.parse(result.content[0].text);
const isMissingBrowser = (result) => result.isError && /Chromium is not available/.test(result.content[0].text);

describe('a11y-loop mcp over stdio', () => {
  let server;
  let dir;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'a11y-loop-mcp-'));
    await writeFile(join(dir, 'before.json'), serializeReport(makeReport({ findings: [emptyButtonFinding()] })));
    await writeFile(join(dir, 'after.json'), serializeReport(cleanReport()));
    server = startServer();
  });
  after(async () => {
    await server?.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('initialize names the server and advertises tools and resources', async () => {
    const response = await server.initialize();
    assert.equal(response.result.serverInfo.name, 'a11y-loop');
    const pkg = JSON.parse(await readFile(join(REPO, 'package.json'), 'utf8'));
    assert.equal(response.result.serverInfo.version, pkg.version);
    assert.ok(response.result.capabilities.tools);
    assert.ok(response.result.capabilities.resources);
    assert.match(response.result.instructions, /manual checklist/);
    assert.deepEqual(findRedLineLanguage(response.result.instructions), []);
  });

  test('tools/list has exactly the six tools, each described and annotated, with no red-line language', async () => {
    const { result } = await server.request('tools/list');
    assert.deepEqual(result.tools.map((t) => t.name).sort(), TOOLS);
    for (const tool of result.tools) {
      assert.ok(tool.description.length > 80, `${tool.name} has a thin description`);
      assert.ok(tool.title, `${tool.name} has no title`);
      assert.equal(typeof tool.annotations?.readOnlyHint, 'boolean', `${tool.name} has no readOnlyHint`);
      assert.deepEqual(findRedLineLanguage(`${tool.title} ${tool.description}`), [], tool.name);
      assert.doesNotMatch(tool.description, /\bscore\b/i, tool.name);
    }
  });

  test('unknown arguments are rejected as a tool error, not passed through', async () => {
    const result = await server.call('a11y_loop_contrast_fix', { foreground: '#000', background: '#fff', bogus: 1 });
    assert.equal(result.isError, true);
  });

  test('plan_check denies a UI plan with no accessibility content', async () => {
    const result = await server.call('a11y_loop_plan_check', { text: UI_PLAN });
    assert.notEqual(result.isError, true);
    const body = json(result);
    assert.equal(body.verdict, 'fail');
    assert.equal(body.why, 'ui-without-accessibility');
    assert.ok(body.missing.length > 0);
    assert.ok(body.template);
    assert.deepEqual(result.structuredContent, body);
  });

  test('plan_check with no plan is a tool error that says how to give one', async () => {
    const result = await server.call('a11y_loop_plan_check', {});
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /"text"/);
  });

  test('contrast_fix fails #777 on white and suggests passing colours', async () => {
    const body = json(await server.call('a11y_loop_contrast_fix', { foreground: '#777777', background: '#ffffff' }));
    assert.equal(body.ratio, 4.47);
    assert.equal(body.passes.AA, false);
    assert.ok(body.fix.suggestions.length > 0);
    for (const s of body.fix.suggestions) assert.ok(s.newRatio >= 4.5, JSON.stringify(s));
  });

  test('contrast_fix with an unparseable colour is a tool error listing the accepted formats', async () => {
    const result = await server.call('a11y_loop_contrast_fix', { foreground: 'not-a-colour', background: '#fff' });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Accepted formats/);
  });

  test('diff of two report files reports convergence', async () => {
    const body = json(
      await server.call('a11y_loop_diff', { before: join(dir, 'before.json'), after: join(dir, 'after.json') }),
    );
    assert.equal(body.converged, true);
    assert.equal(body.regression, false);
    assert.equal(body.fixed.length, 1);
    assert.match(body.verdict, /Converged/);
  });

  test('diff with an unknown run id or a missing file is a tool error', async () => {
    const result = await server.call('a11y_loop_diff', { before: 'run-999', after: join(dir, 'after.json') });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Could not read --before report/);
  });

  test('manual_checklist before any audit is a tool error that says to audit first', async () => {
    const result = await server.call('a11y_loop_manual_checklist', {});
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /a11y_loop_audit/);
  });

  test('doctor returns the environment facts', async () => {
    const body = json(await server.call('a11y_loop_doctor', {}, { timeoutMs: 60_000 }));
    assert.equal(typeof body.canAudit, 'boolean');
    assert.ok(body.checks.some((c) => c.id === 'node'));
  });

  test('audit --html finds the nameless button, then re-audit, diff by run id, checklist and resources', { timeout: 240_000 }, async (t) => {
    const first = await server.call(
      'a11y_loop_audit',
      { html: '<main><h1>Settings</h1><button></button></main>', out: join(dir, 'run1.json') },
      { timeoutMs: 120_000, meta: { progressToken: 'audit-1' } },
    );
    if (isMissingBrowser(first)) return t.skip('Chromium is not installed here');
    assert.notEqual(first.isError, true, first.content[0].text);

    const body = json(first);
    assert.equal(body.runId, 'run-1');
    assert.deepEqual(body.passesRun, ['default', 'dark', 'forced-colors', 'reduced-motion', 'reflow']);
    const buttonName = body.findings.violations.find((f) => f.ruleId === 'button-name');
    assert.ok(buttonName, 'button-name violation expected');
    assert.ok(buttonName.fingerprint && buttonName.selector && buttonName.helpUrl && buttonName.sc);
    assert.ok(body.manualChecklist.length > 0);
    assert.equal(body.coverage, COVERAGE.statement);
    assert.deepEqual(findRedLineLanguage(first.content[0].text), []);

    // The file written with `out` is the CLI's full report.
    const written = JSON.parse(await readFile(join(dir, 'run1.json'), 'utf8'));
    assert.equal(written.summary.violations, body.summary.violations);

    // Progress was reported per pass against the client's token.
    const progress = server.notifications.filter(
      (n) => n.method === 'notifications/progress' && n.params.progressToken === 'audit-1',
    );
    assert.equal(progress.length, 5);
    assert.equal(progress.at(-1).params.progress, 5);

    const second = json(
      await server.call('a11y_loop_audit', { html: '<main><h1>Settings</h1><button>Save</button></main>' }, { timeoutMs: 120_000 }),
    );
    assert.equal(second.runId, 'run-2');

    const diff = json(await server.call('a11y_loop_diff', { before: 'run-1', after: 'run-2' }));
    assert.ok(diff.fixed.some((f) => f.ruleId === 'button-name'));
    assert.equal(diff.regression, false);

    const checklist = json(await server.call('a11y_loop_manual_checklist', { runId: 'run-1' }));
    assert.deepEqual(checklist.manualChecklist, body.manualChecklist);

    const listed = await server.request('resources/list');
    const uris = listed.result.resources.map((r) => r.uri);
    assert.ok(uris.includes('a11y-loop://runs/run-1/report'));
    assert.ok(uris.includes('a11y-loop://runs/run-2/checklist'));
    const read = await server.request('resources/read', { uri: 'a11y-loop://runs/run-1/report' });
    assert.equal(JSON.parse(read.result.contents[0].text).summary.violations, body.summary.violations);
  });

  test('an audit that outlives timeoutMs comes back as a tool error, and the server stays usable', { timeout: 60_000 }, async (t) => {
    // A server that accepts the request and never answers it.
    const held = [];
    const hang = createServer((req, res) => held.push(res));
    await new Promise((resolve) => hang.listen(0, '127.0.0.1', resolve));
    try {
      const started = Date.now();
      const result = await server.call(
        'a11y_loop_audit',
        { url: `http://127.0.0.1:${hang.address().port}/`, timeoutMs: 1_000 },
        { timeoutMs: 30_000 },
      );
      if (isMissingBrowser(result)) return t.skip('Chromium is not installed here');
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /did not finish within 1000 ms/);
      assert.ok(Date.now() - started < 15_000, `took ${Date.now() - started} ms`);
      const { result: tools } = await server.request('tools/list');
      assert.equal(tools.tools.length, TOOLS.length);
    } finally {
      for (const res of held) res.destroy();
      hang.closeAllConnections?.();
      await new Promise((resolve) => hang.close(resolve));
    }
  });

  test('closing stdin ends the process with exit 0', async () => {
    const { code } = await server.close();
    server = null;
    assert.equal(code, 0);
  });
});

describe('a11y-loop mcp with no browser installed', () => {
  let emptyBrowsers;
  before(async () => {
    emptyBrowsers = await mkdtemp(join(tmpdir(), 'a11y-loop-mcp-no-browsers-'));
  });
  after(async () => {
    await rm(emptyBrowsers, { recursive: true, force: true });
  });

  test('audit returns the missing-browser tool error with the install-browser hint within seconds', { timeout: 30_000 }, async () => {
    const server = startServer({ PLAYWRIGHT_BROWSERS_PATH: emptyBrowsers });
    try {
      await server.initialize();
      const started = Date.now();
      const result = await server.call('a11y_loop_audit', { html: '<button>x</button>' }, { timeoutMs: 15_000 });
      const elapsed = Date.now() - started;
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /Chromium is not available to Playwright/);
      assert.match(result.content[0].text, /a11y-loop install-browser/);
      assert.doesNotMatch(result.content[0].text, /npx playwright/);
      assert.ok(elapsed < 15_000, `took ${elapsed} ms`);
    } finally {
      const { code } = await server.close();
      assert.equal(code, 0);
    }
  });
});
