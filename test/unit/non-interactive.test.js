/**
 * The non-interactive requirement: every capability is drivable by an agent with
 * no TTY and no human. Each subcommand runs as a child process with stdin
 * closed (`'ignore'`), stdout and stderr piped, and a hard timeout. A command
 * that prompts, waits on stdin or otherwise hangs is killed and the test fails;
 * one that finishes must exit with a code it documents.
 *
 * `audit` needs Chromium. Where it is missing, exit 2 with the missing-browser
 * message is the documented outcome, and still proves the command did not hang.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeReport, cleanReport, emptyButtonFinding } from '../helpers/report-fixture.js';
import { serializeReport } from '../../src/lib/format/json.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO, 'src', 'cli.js');
const HOOK = join(REPO, 'plugin', 'hooks', 'plan-gate.mjs');
const AUDIT_HOOK = join(REPO, 'plugin', 'hooks', 'audit-gate.mjs');

const UI_PLAN = `Build a React settings page. Add a modal dialog for role changes, a
members table with per-row actions, tabs across the top and a dark mode toggle
styled with Tailwind CSS. The navbar gets a dropdown and a submit button.`;

/**
 * Run a script with no TTY anywhere. `input` (a string) is written and the pipe
 * closed; `holdOpen` keeps a stdin pipe open and never writes, the way some
 * agent harnesses spawn tools. Without either, stdin is closed outright.
 *
 * @returns {Promise<{code:number|null, signal:string|null, timedOut:boolean, stdout:string, stderr:string}>}
 */
function runNoTty(script, args, { input, holdOpen = false, timeoutMs = 20_000, env = {} } = {}) {
  return new Promise((resolve) => {
    const piped = input !== undefined || holdOpen;
    const child = spawn(process.execPath, [script, ...args], {
      stdio: [piped ? 'pipe' : 'ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
      cwd: REPO,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (holdOpen) child.stdin.destroy();
      resolve({ code, signal, timedOut, stdout, stderr });
    });
    if (input !== undefined) child.stdin.end(input);
  });
}

function assertFinished(result, allowed, label) {
  assert.equal(result.timedOut, false, `${label} hung and was killed\nstderr: ${result.stderr}`);
  assert.ok(
    allowed.includes(result.code),
    `${label} exited ${result.code}, expected one of ${allowed.join('/')}\nstderr: ${result.stderr}`,
  );
}

describe('every subcommand runs with no TTY and never hangs', () => {
  let dir;
  test.before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'a11y-loop-noninteractive-'));
    await writeFile(join(dir, 'before.json'), serializeReport(makeReport({ findings: [emptyButtonFinding()] })));
    await writeFile(join(dir, 'after.json'), serializeReport(cleanReport()));
  });
  test.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('--help exits 0', async () => {
    const r = await runNoTty(CLI, ['--help']);
    assertFinished(r, [0], '--help');
    assert.match(r.stdout, /plan-check/);
  });

  test('--version exits 0', async () => {
    const r = await runNoTty(CLI, ['--version']);
    assertFinished(r, [0], '--version');
    assert.match(r.stdout, /^\d+\.\d+\.\d+/);
  });

  test('no arguments prints usage and exits 2 rather than waiting', async () => {
    assertFinished(await runNoTty(CLI, []), [2], 'no arguments');
  });

  test('audit --html exits 0 or 1, or 2 only for a missing browser', async () => {
    const r = await runNoTty(CLI, ['audit', '--html', '<main><h1>Hi</h1><button>Save</button></main>', '--quiet'], {
      timeoutMs: 120_000,
    });
    assertFinished(r, [0, 1, 2], 'audit --html');
    if (r.code === 2) assert.match(r.stderr, /Chromium|browser/i, 'exit 2 must be the missing-browser case');
  });

  test('contrast exits 0 for a passing pair and 1 for a failing one', async () => {
    assertFinished(await runNoTty(CLI, ['contrast', '#000000', '#ffffff']), [0], 'contrast pass');
    assertFinished(await runNoTty(CLI, ['contrast', '#777777', '#ffffff', '--fix']), [1], 'contrast --fix fail');
  });

  test('diff of two tiny reports exits 0', async () => {
    const r = await runNoTty(CLI, ['diff', '--before', join(dir, 'before.json'), '--after', join(dir, 'after.json')]);
    assertFinished(r, [0], 'diff');
    assert.match(r.stdout, /Converged/);
  });

  test('doctor exits 0 or 2', async () => {
    assertFinished(await runNoTty(CLI, ['doctor', '--json'], { timeoutMs: 60_000 }), [0, 2], 'doctor');
  });

  test('install-browser --dry-run exits 0', async () => {
    assertFinished(await runNoTty(CLI, ['install-browser', '--dry-run'], { timeoutMs: 60_000 }), [0], 'install-browser --dry-run');
  });

  test('plan-check --text exits 1 for a UI plan with no accessibility content', async () => {
    assertFinished(await runNoTty(CLI, ['plan-check', '--text', UI_PLAN]), [1], 'plan-check --text');
  });

  test('plan-check reads a piped stdin', async () => {
    const r = await runNoTty(CLI, ['plan-check', '--json'], { input: UI_PLAN });
    assertFinished(r, [1], 'plan-check < stdin');
    assert.equal(JSON.parse(r.stdout).source, 'stdin');
  });

  test('plan-check with closed stdin and no input exits 2', async () => {
    const r = await runNoTty(CLI, ['plan-check']);
    assertFinished(r, [2], 'plan-check, closed stdin');
  });

  test('plan-check with a stdin pipe held open and silent gives up with exit 2', async () => {
    const r = await runNoTty(CLI, ['plan-check'], {
      holdOpen: true,
      timeoutMs: 10_000,
      env: { A11Y_LOOP_STDIN_IDLE_MS: '300' },
    });
    assertFinished(r, [2], 'plan-check, open silent stdin');
    assert.match(r.stderr, /stayed open with no data/);
  });

  test('mcp with closed stdin exits 0 and writes nothing to stdout', async () => {
    const r = await runNoTty(CLI, ['mcp']);
    assertFinished(r, [0], 'mcp, closed stdin');
    assert.equal(r.stdout, '', 'stdout is the protocol channel and must stay empty with no client');
  });

  test('mcp with a stdin pipe that closes after one request answers it and exits 0', async () => {
    const init = `${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } },
    })}\n`;
    const r = await runNoTty(CLI, ['mcp'], { input: init });
    assertFinished(r, [0], 'mcp, piped stdin');
    assert.equal(JSON.parse(r.stdout.trim().split('\n')[0]).result.serverInfo.name, 'a11y-loop');
  });

  test('the plan-gate hook with an empty stdin exits 0 and emits nothing', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'a11y-gate-'));
    try {
      const r = await runNoTty(HOOK, [], { env: { CLAUDE_PLUGIN_DATA: dataDir, A11Y_LOOP_PLAN_GATE: '' } });
      assertFinished(r, [0], 'plugin/hooks/plan-gate.mjs');
      assert.equal(r.stdout.trim(), '');
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  test('the audit-gate Stop hook with an empty stdin exits 0 and emits nothing', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'a11y-audit-gate-'));
    try {
      const r = await runNoTty(AUDIT_HOOK, [], { env: { CLAUDE_PLUGIN_DATA: dataDir, A11Y_LOOP_AUDIT_GATE: '' } });
      assertFinished(r, [0], 'plugin/hooks/audit-gate.mjs');
      assert.equal(r.stdout.trim(), '');
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
