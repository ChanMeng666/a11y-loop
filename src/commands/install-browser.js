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
 * By default only Chromium's headless shell is installed (`--only-shell`,
 * about 280 MB on disk): every audit launches headless, and Playwright runs the
 * shell for that. `--full` (alias `--headed`) installs the full Chromium as well
 * (about 715 MB in all), which only `audit --headed` needs.
 *
 * Other extra arguments are passed straight through (`--with-deps`, `--dry-run`,
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
  return [bundledPlaywright().cliPath, 'install', 'chromium', ...playwrightFlags(extraArgs)];
}

/** Flags that a11y-loop itself understands and Playwright's installer does not. */
export const FULL_FLAGS = ['--full', '--headed'];

/**
 * Translate a11y-loop's flags into Playwright's: the default adds `--only-shell`;
 * `--full`/`--headed` drops it (full Chromium plus the shell). An explicit
 * `--only-shell` or `--no-shell` from the caller is respected and never doubled.
 */
export function playwrightFlags(extraArgs = []) {
  const full = extraArgs.some((a) => FULL_FLAGS.includes(a));
  const rest = extraArgs.filter((a) => !FULL_FLAGS.includes(a));
  const explicit = rest.includes('--only-shell') || rest.includes('--no-shell');
  return full || explicit ? rest : ['--only-shell', ...rest];
}

/**
 * @param {{args?: string[]}} input
 * @param {{write:Function, writeError:Function}} io
 * @param {{spawnImpl?: typeof spawn}} [deps]
 * @returns {Promise<number>} exit code
 */
export async function runInstallBrowserCommand({ args = [] } = {}, io, { spawnImpl = spawn } = {}) {
  const { version, cliPath } = bundledPlaywright();
  const flags = playwrightFlags(args);
  const full = args.some((a) => FULL_FLAGS.includes(a));
  io.writeError(
    `a11y-loop: installing ${full ? 'the full Chromium plus the headless shell' : 'the Chromium headless shell'} for a11y-loop's bundled Playwright ${version}\n` +
      `  ${process.execPath} ${cliPath} install chromium${flags.length ? ` ${flags.join(' ')}` : ''}\n` +
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
