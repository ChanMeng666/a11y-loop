import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import { REPO, drift, copyPlan } from '../../scripts/sync-plugin.mjs';

const PLUGIN = path.join(REPO, 'plugin');

/** Every file under `dir`, relative to the repo, with forward slashes. */
function filesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else out.push(path.relative(REPO, full).split(path.sep).join('/'));
  }
  return out;
}

const TEXT = /\.(md|mjs|js|json)$|(^|\/)LICENSE$/;

describe('plugin/ copies of canonical sources', () => {
  test('every copy matches its source', () => {
    const problems = drift();
    assert.deepEqual(
      problems,
      [],
      `plugin/ is out of date with its sources. Run \`npm run sync-plugin\` and commit the result.\n${problems.join('\n')}`,
    );
  });

  test('the copy plan covers the skill and the hook lib', () => {
    const targets = copyPlan().pairs.map((p) => p.to);
    assert.ok(targets.includes('plugin/skills/a11y-loop/SKILL.md'));
    assert.ok(targets.includes('plugin/hooks/lib/plan-gate.mjs'));
    assert.ok(!targets.some((t) => t.startsWith('plugin/skills/a11y-loop/evals/')), 'skill evals stay out of the plugin');
  });
});

describe('plugin/ is self-contained', () => {
  const files = filesUnder(PLUGIN);

  test('no package.json or lockfile, so installing the plugin runs no dependency install', () => {
    for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'bun.lock', 'bun.lockb', 'yarn.lock', 'pnpm-lock.yaml', '.npmrc']) {
      assert.ok(!existsSync(path.join(PLUGIN, name)), `plugin/${name} must not exist`);
    }
  });

  test('no text file climbs out of the plugin folder or names a skill-dir variable', () => {
    for (const f of files.filter((f) => TEXT.test(f))) {
      const text = readFileSync(path.join(REPO, f), 'utf8');
      assert.ok(!text.includes('${CLAUDE_SKILL_DIR}'), `${f} names \${CLAUDE_SKILL_DIR}`);
      assert.ok(!/(^|[\s'"`(/])\.\.\//m.test(text), `${f} contains a ../ path`);
    }
  });

  test('hook commands point inside the plugin root', () => {
    const hooks = JSON.parse(readFileSync(path.join(PLUGIN, 'hooks', 'hooks.json'), 'utf8'));
    const commands = Object.values(hooks.hooks).flat().flatMap((m) => m.hooks);
    assert.ok(commands.length > 0);
    for (const h of commands) {
      for (const arg of h.args ?? []) {
        assert.match(arg, /^\$\{CLAUDE_PLUGIN_ROOT\}\/[\w./-]+$/, `hook arg ${arg} is a plain path under the plugin root`);
        assert.ok(existsSync(path.join(PLUGIN, arg.replace('${CLAUDE_PLUGIN_ROOT}/', ''))), `${arg} exists`);
      }
    }
  });

  test('the marketplace entry ships plugin/, and there is no manifest at the repo root', () => {
    const market = JSON.parse(readFileSync(path.join(REPO, '.claude-plugin', 'marketplace.json'), 'utf8'));
    assert.equal(market.plugins[0].source, './plugin');
    assert.ok(!existsSync(path.join(REPO, '.claude-plugin', 'plugin.json')), 'the root plugin.json is gone');
    assert.ok(existsSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json')));
  });

  test('plugin.json names no component keys that would duplicate the default folders', () => {
    const manifest = JSON.parse(readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
    for (const key of ['hooks', 'commands', 'skills']) assert.ok(!(key in manifest), `plugin.json must not declare "${key}"`);
  });

  test('the version agrees across all four files', () => {
    const pkg = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8')).version;
    const plugin = JSON.parse(readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8')).version;
    const market = JSON.parse(readFileSync(path.join(REPO, '.claude-plugin', 'marketplace.json'), 'utf8'));
    const skill = /"a11y-loop\/version":\s*"([^"]+)"/.exec(readFileSync(path.join(REPO, 'skills', 'a11y-loop', 'SKILL.md'), 'utf8'))?.[1];
    assert.deepEqual([plugin, market.metadata.version, market.plugins[0].version, skill], [pkg, pkg, pkg, pkg]);
  });
});
