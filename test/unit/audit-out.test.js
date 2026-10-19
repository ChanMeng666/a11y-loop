import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeOutputFile } from '../../src/commands/audit.js';
import { buildReason } from '../../src/lib/audit-gate.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO, 'src', 'cli.js');

describe('audit output files create their parent directories', () => {
  test('writeOutputFile writes to <tmp>/.a11y/nested/report.json when none of it exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'a11y-out-'));
    try {
      const file = join(dir, '.a11y', 'nested', 'report.json');
      const written = await writeOutputFile(file, '{"ok":true}\n');
      assert.equal(written, file);
      assert.equal(await readFile(file, 'utf8'), '{"ok":true}\n');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('writeOutputFile overwrites into a directory that already exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'a11y-out-'));
    try {
      const file = join(dir, 'report.json');
      await writeOutputFile(file, 'one');
      await writeOutputFile(file, 'two');
      assert.equal(await readFile(file, 'utf8'), 'two');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('the audit gate\'s suggested --out path works in a project with no .a11y/', async (t) => {
    const outPath = /--out (\S+)/.exec(buildReason({ files: ['index.html'] }))?.[1];
    assert.equal(outPath, '.a11y/run-1.json');

    const dir = await mkdtemp(join(tmpdir(), 'a11y-out-cwd-'));
    try {
      const r = spawnSync(process.execPath, [CLI, 'audit', '--html', '<main><h1>Hi</h1><button>Save</button></main>', '--out', outPath, '--quiet'], {
        cwd: dir,
        encoding: 'utf8',
        timeout: 120_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (r.status === 2 && /Chromium|browser/i.test(r.stderr)) return t.skip('Chromium is not installed here');
      assert.ok([0, 1].includes(r.status), `audit exited ${r.status}\n${r.stderr}`);
      assert.ok((await stat(join(dir, '.a11y', 'run-1.json'))).isFile());
      assert.equal(JSON.parse(await readFile(join(dir, '.a11y', 'run-1.json'), 'utf8')).tool.name, 'a11y-loop');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
