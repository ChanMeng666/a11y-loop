/**
 * A missing Chromium must end the process with exit 2, quickly, on every
 * target type — never leave it running.
 *
 * Before the fix, --file and --html started the local HTTP server and then
 * launched the browser outside the try/finally that closes both. When launch
 * threw, the server was left listening: the CLI printed its error and then
 * stayed alive indefinitely (observed at 2m27s). A URL target's close is a
 * no-op, so only that path exited. An agent following SKILL §2 ("if the CLI
 * cannot run, say so") hung until its own tool timeout instead.
 *
 * Each case spawns the real CLI with PLAYWRIGHT_BROWSERS_PATH pointing at a
 * fresh empty directory, and kills it if it is still alive after the deadline.
 * Being killed is itself the failure being tested for.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO, 'src', 'cli.js');
const DEADLINE_MS = 15_000;

/** Run the CLI; resolve with code, stderr, elapsed and whether it had to be killed. */
function runCli(args, env) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: REPO,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill();
    }, DEADLINE_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, killed, elapsed: Date.now() - started });
    });
  });
}

describe('missing Chromium — every target type exits 2 instead of hanging', () => {
  let emptyBrowsers;
  before(async () => {
    emptyBrowsers = await mkdtemp(join(tmpdir(), 'a11y-loop-no-browsers-'));
  });
  after(async () => {
    await rm(emptyBrowsers, { recursive: true, force: true });
  });

  const cases = [
    ['--html', ['audit', '--html', '<button>x</button>']],
    ['--file', ['audit', '--file', join('demo', 'after', 'index.html')]],
    // Port 9 (discard) is never served; the launch fails before any navigation.
    ['url', ['audit', 'http://127.0.0.1:9/']],
  ];

  for (const [label, args] of cases) {
    test(`${label}: exits 2 within ${DEADLINE_MS / 1000}s with the missing-browser message`, { timeout: DEADLINE_MS + 10_000 }, async () => {
      const result = await runCli(args, { PLAYWRIGHT_BROWSERS_PATH: emptyBrowsers });
      assert.equal(result.killed, false, `the CLI was still alive after ${DEADLINE_MS}ms and had to be killed`);
      assert.ok(result.elapsed < DEADLINE_MS, `took ${result.elapsed}ms`);
      assert.equal(result.code, 2, `exit code ${result.code}; stderr:\n${result.stderr}`);
      assert.match(result.stderr, /Chromium is not available to Playwright/);
    });
  }
});
