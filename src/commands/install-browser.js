/**
 * `a11y-loop install-browser` — install the Chromium build that a11y-loop's
 * OWN Playwright expects.
 *
 * Why not `npx playwright install chromium`: npx resolves whichever Playwright
 * comes first (a project-local or global one), which can be a different version
 * from the one bundled with a11y-loop. It then installs a browser build this
 * copy cannot launch, and the audit fails with the same "Chromium is not
 * available" message as before. Running the bundled package's own cli.js with
 * the current Node binary removes PATH from the question entirely.
 *
 * Extra arguments are passed straight through (`--with-deps`, `--dry-run`,
 * `--force`, …). stdio and the environment are inherited, so
 * PLAYWRIGHT_BROWSERS_PATH is honoured exactly as it is for the audit.
 * Non-interactive: nothing here reads from stdin.
 *
 * Exit codes: 0 the installer succeeded · 2 it did not. Never 1 — that means
 * findings.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

import { ToolError } from '../lib/axe-runner.js';

const require = createRequire(import.meta.url);

/** The Playwright package a11y-loop itself imports, never one found on PATH. */
export function bundledPlaywright() {
  const packageJsonPath = require.resolve('playwright/package.json');
  const dir = dirname(packageJsonPath);
  return {
    dir,
    version: require(packageJsonPath).version,
    cliPath: join(dir, 'cli.js'),
  };
}

/** The exact argv handed to `process.execPath`. Exported for tests. */
export function installBrowserArgs(extraArgs = []) {
  return [bundledPlaywright().cliPath, 'install', 'chromium', ...extraArgs];
}

/**
 * @param {{args?: string[]}} input
 * @param {{write:Function, writeError:Function}} io
 * @param {{spawnImpl?: typeof spawn}} [deps]
 * @returns {Promise<number>} exit code
 */
export async function runInstallBrowserCommand({ args = [] } = {}, io, { spawnImpl = spawn } = {}) {
  const { version, cliPath } = bundledPlaywright();
  io.writeError(
    `a11y-loop: installing Chromium for a11y-loop's bundled Playwright ${version}\n` +
      `  ${process.execPath} ${cliPath} install chromium${args.length ? ` ${args.join(' ')}` : ''}\n` +
      `  PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set; Playwright default location)'}\n\n`,
  );

  const code = await new Promise((resolve, reject) => {
    const child = spawnImpl(process.execPath, installBrowserArgs(args), {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', (exitCode, signal) => resolve(signal ? 1 : exitCode ?? 1));
  }).catch((error) => {
    throw new ToolError(`could not start the bundled Playwright installer: ${error.message}`);
  });

  if (code !== 0) {
    throw new ToolError(`the bundled Playwright installer exited with code ${code}.`, {
      hint:
        'Its own output above says why. Re-run with --dry-run to see the build and the\n' +
        'install location without downloading anything.',
    });
  }
  return 0;
}
