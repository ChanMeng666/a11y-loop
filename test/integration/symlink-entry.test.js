/**
 * The CLI must run when started through a symlink or junction.
 *
 * `npm i -g` and `npx` on Linux and macOS install the bin as a symlink
 * (`<prefix>/bin/a11y-loop -> ../lib/node_modules/a11y-loop/src/cli.js`).
 * Node resolves the entry module's `import.meta.url` to the real path, while
 * `process.argv[1]` keeps the link path, so the old entry guard compared two
 * different strings and the CLI exited 0 with no output: a silent "pass".
 *
 * Two shapes are tested:
 *  - a FILE symlink to src/cli.js, the shape npm creates. Creating one on
 *    Windows without Developer Mode throws EPERM; only then is it skipped. It
 *    runs on Linux CI, the platform that matters for this bug.
 *  - a DIRECTORY link to the repo (`junction` on Windows, which needs no
 *    privilege; a plain directory symlink elsewhere), the shape of a Windows
 *    worktree whose node_modules or checkout is reached through a junction.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO, 'src', 'cli.js');
const VERSION = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).version;

function run(entry, args) {
  return spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', timeout: 60_000 });
}

/** Create a link, or return the reason it could not be created on this OS. */
function tryLink(target, path, type) {
  try {
    symlinkSync(target, path, type);
    return null;
  } catch (error) {
    if (error.code === 'EPERM') return `symlink creation is not permitted here (${error.code})`;
    throw error;
  }
}

function assertRunsThrough(entry) {
  const version = run(entry, ['--version']);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), VERSION, 'printed nothing: the entry guard no-opped');

  const audit = run(entry, ['audit', '--html', '<button>hi</button>', '--quiet']);
  assert.equal(audit.status, 0, audit.stdout + audit.stderr);
  assert.match(audit.stdout, /No automatically detectable failures/);
}

describe('the CLI runs when started through a link', () => {
  let dir;
  const links = [];
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'a11y-loop-link-'));
  });
  after(() => {
    // Remove each link itself, never recursively: a recursive delete that
    // followed the checkout link would delete the repository. A Windows
    // junction is removed with rmdir, a symlink with unlink.
    let allRemoved = true;
    for (const link of links) {
      try {
        unlinkSync(link);
      } catch {
        try {
          rmdirSync(link);
        } catch {
          allRemoved = false;
        }
      }
    }
    if (allRemoved) rmSync(dir, { recursive: true, force: true });
  });

  test('a file symlink to src/cli.js, the shape npm creates for a bin', { timeout: 120_000 }, (t) => {
    const link = join(dir, 'a11y-loop');
    const reason = tryLink(CLI, link, 'file');
    if (reason) return t.skip(reason);
    links.push(link);
    assertRunsThrough(link);
  });

  test('a directory junction or symlink to the checkout', { timeout: 120_000 }, (t) => {
    const link = join(dir, 'checkout');
    const reason = tryLink(REPO, link, 'junction');
    if (reason) return t.skip(reason);
    links.push(link);
    assertRunsThrough(join(link, 'src', 'cli.js'));
  });
});
