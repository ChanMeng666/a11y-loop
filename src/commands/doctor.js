/**
 * `a11y-loop doctor` — report, as plain facts, whether an audit can run here
 * and what would get in its way.
 *
 * Exit codes: 0 an audit can run · 2 it cannot. Never 1 — that means findings,
 * and doctor finds nothing about any page.
 *
 * Every check reports what it saw. Where it cannot see (no Claude Code plugin
 * registry, an unreadable file), it says "could not check" instead of guessing.
 * Non-interactive: nothing here reads from stdin.
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { bundledPlaywright } from './install-browser.js';

const require = createRequire(import.meta.url);

export const STATUS = { OK: 'ok', FAIL: 'fail', WARN: 'warn', INFO: 'info' };

const INSTALL_FIX = 'a11y-loop install-browser';

/** `>=20` → 20. Only the shape package.json actually uses. */
function minimumNodeMajor(range) {
  const match = /^>=\s*(\d+)/.exec(String(range ?? '').trim());
  return match ? Number(match[1]) : null;
}

function readPackageJson() {
  return JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
}

/**
 * The package.json of `name` as `req` resolves it. Some packages leave
 * `./package.json` (or `./browsers.json`) out of their `exports` map, so fall
 * back to walking up from the resolved entry point.
 */
function packageJsonPath(req, name) {
  try {
    return req.resolve(`${name}/package.json`);
  } catch {
    let dir = dirname(req.resolve(name));
    for (;;) {
      const candidate = join(dir, 'package.json');
      if (existsSync(candidate) && JSON.parse(readFileSync(candidate, 'utf8')).name === name) {
        return candidate;
      }
      const parent = dirname(dir);
      if (parent === dir) throw new Error(`no package.json found for ${name}`);
      dir = parent;
    }
  }
}

/**
 * The browser build the bundled Playwright expects, read from the
 * browsers.json of the playwright-core that the bundled Playwright resolves.
 */
export function expectedChromium() {
  const { dir } = bundledPlaywright();
  const corePkg = packageJsonPath(createRequire(join(dir, 'package.json')), 'playwright-core');
  const { browsers } = JSON.parse(readFileSync(join(dirname(corePkg), 'browsers.json'), 'utf8'));
  return browsers.find((b) => b.name === 'chromium') ?? null;
}

/** axe-core as @axe-core/playwright resolves it — the copy injected into pages. */
function resolvedAxe() {
  const integrationPkg = packageJsonPath(require, '@axe-core/playwright');
  const axePkg = packageJsonPath(createRequire(integrationPkg), 'axe-core');
  return {
    integration: JSON.parse(readFileSync(integrationPkg, 'utf8')).version,
    axeCore: JSON.parse(readFileSync(axePkg, 'utf8')).version,
  };
}

async function defaultExecutablePath() {
  const { chromium } = await import('playwright');
  return chromium.executablePath();
}

/** Launch and close headless Chromium, exactly as the audit would. */
async function defaultLaunchProbe() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true, timeout: 30_000 });
  try {
    return browser.version();
  } finally {
    await browser.close();
  }
}

function samePath(a, b, platform) {
  const norm = (p) => resolve(p);
  return platform === 'win32'
    ? norm(a).toLowerCase() === norm(b).toLowerCase()
    : norm(a) === norm(b);
}

/** Skill version from the `a11y-loop/version` metadata line, if readable. */
function skillVersion(skillMd) {
  try {
    const match = /a11y-loop\/version["']?\s*:\s*["']?([\w.-]+)/.exec(readFileSync(skillMd, 'utf8'));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Look for a11y-loop in Claude Code's plugin registry.
 * @returns {{state:'installed'|'absent'|'unknown', detail:string}}
 */
function detectPlugin(claudeDir) {
  const registry = join(claudeDir, 'plugins', 'installed_plugins.json');
  if (!existsSync(registry)) {
    return { state: 'unknown', detail: `could not check: ${registry} does not exist` };
  }
  try {
    const parsed = JSON.parse(readFileSync(registry, 'utf8'));
    const plugins = parsed?.plugins;
    if (!plugins || typeof plugins !== 'object') {
      return { state: 'unknown', detail: `could not check: ${registry} has no "plugins" object` };
    }
    const ids = Object.keys(plugins).filter((id) => id.startsWith('a11y-loop@'));
    if (ids.length === 0) return { state: 'absent', detail: `not installed (per ${registry})` };
    const versions = ids.map((id) => {
      const entry = Array.isArray(plugins[id]) ? plugins[id][0] : plugins[id];
      return entry?.version ? `${id} ${entry.version}` : id;
    });
    return { state: 'installed', detail: `installed: ${versions.join(', ')} (per ${registry})` };
  } catch (error) {
    return { state: 'unknown', detail: `could not check: ${registry} is unreadable (${error.message})` };
  }
}

/**
 * Gather every check. All side effects are injectable so tests can drive each
 * branch without a browser or a real home directory.
 *
 * @param {object} [deps]
 * @returns {Promise<{canAudit:boolean, checks:Array<{id:string,status:string,detail:string,fix?:string}>}>}
 */
export async function collectDoctorReport({
  env = process.env,
  home = homedir(),
  argv1 = process.argv[1],
  platform = process.platform,
  nodeVersion = process.versions.node,
  realpath = realpathSync,
  executablePath = defaultExecutablePath,
  launchProbe = defaultLaunchProbe,
} = {}) {
  const checks = [];
  const add = (id, status, detail, fix) => checks.push({ id, status, detail, ...(fix ? { fix } : {}) });

  // Node against engines.
  const pkg = readPackageJson();
  const required = pkg.engines?.node ?? '>=20';
  const major = Number(String(nodeVersion).split('.')[0]);
  const minMajor = minimumNodeMajor(required);
  const nodeOk = minMajor === null || major >= minMajor;
  add(
    'node',
    nodeOk ? STATUS.OK : STATUS.FAIL,
    `Node ${nodeVersion} (a11y-loop ${pkg.version} needs ${required})`,
    nodeOk ? undefined : `install Node ${required}`,
  );

  // Bundled Playwright and the Chromium build it expects.
  let browserOk = false;
  try {
    const playwright = bundledPlaywright();
    add('playwright', STATUS.INFO, `Playwright ${playwright.version} (bundled, ${playwright.dir})`);

    const expected = expectedChromium();
    const build = expected ? `chromium build ${expected.revision} (${expected.browserVersion})` : 'chromium';
    // The verdict comes from the launch, never from the file check alone. A
    // headless audit runs on Playwright's separate headless-shell build, so
    // `install --only-shell chromium` (as CI does) gives a working audit with
    // no full `chrome` at executablePath(), and a full `chrome` alone does
    // not. The file check only adds context to the report.
    const exe = await executablePath();
    const where = existsSync(exe) ? `full browser at ${exe}` : `no full browser at ${exe}`;
    try {
      const version = await launchProbe();
      browserOk = true;
      add('chromium', STATUS.OK, `${build}: headless launch succeeded (${version}); ${where}`);
    } catch (error) {
      const firstLine = String(error?.message ?? error).split('\n')[0];
      add('chromium', STATUS.FAIL, `${build}: headless launch failed (${firstLine}); ${where}`, INSTALL_FIX);
    }
  } catch (error) {
    add('playwright', STATUS.FAIL, `could not resolve the bundled Playwright: ${error.message}`, 'reinstall a11y-loop');
  }

  add(
    'browsers-path',
    STATUS.INFO,
    env.PLAYWRIGHT_BROWSERS_PATH
      ? `PLAYWRIGHT_BROWSERS_PATH=${env.PLAYWRIGHT_BROWSERS_PATH}`
      : 'PLAYWRIGHT_BROWSERS_PATH is not set (Playwright default location)',
  );

  try {
    const axe = resolvedAxe();
    add('axe-core', STATUS.INFO, `axe-core ${axe.axeCore} (via @axe-core/playwright ${axe.integration})`);
  } catch (error) {
    add('axe-core', STATUS.FAIL, `could not resolve axe-core: ${error.message}`, 'reinstall a11y-loop');
  }

  // Skill copies.
  const skillDirs = [join(home, '.claude', 'skills', 'a11y-loop'), join(home, '.agents', 'skills', 'a11y-loop')];
  for (const dir of skillDirs) {
    const skillMd = join(dir, 'SKILL.md');
    if (existsSync(skillMd)) {
      const version = skillVersion(skillMd);
      add('skill-copy', STATUS.INFO, `skill copy at ${dir}${version ? ` (version ${version})` : ''}`);
    } else {
      add('skill-copy', STATUS.INFO, `no skill copy at ${dir}`);
    }
  }

  // Claude Code plugin, and double registration. Claude Code loads skills from
  // ~/.claude/skills, so only that copy can collide with the plugin's own.
  const claudeDir = env.CLAUDE_CONFIG_DIR || join(home, '.claude');
  const plugin = detectPlugin(claudeDir);
  add('plugin', STATUS.INFO, `Claude Code plugin: ${plugin.detail}`);

  const claudeSkill = join(claudeDir, 'skills', 'a11y-loop');
  const claudeSkillPresent = existsSync(join(claudeSkill, 'SKILL.md'));
  if (claudeSkillPresent && plugin.state === 'installed') {
    add(
      'double-registration',
      STATUS.WARN,
      `both the skill copy at ${claudeSkill} and the plugin are installed; Claude Code registers the skill twice`,
      `delete ${claudeSkill} and keep the plugin`,
    );
  } else if (claudeSkillPresent && plugin.state === 'unknown') {
    add('double-registration', STATUS.INFO, 'double registration: could not check (plugin state unknown)');
  }

  // Junction / symlink entry: the CLI's entry guard no-ops through one.
  if (argv1) {
    let real = null;
    try {
      real = realpath(argv1);
    } catch {
      add('entry-path', STATUS.INFO, `entry path: could not check (${argv1} did not resolve)`);
    }
    if (real && !samePath(real, argv1, platform)) {
      add(
        'entry-path',
        STATUS.WARN,
        `the CLI was started through a junction or symlink (${argv1} resolves to ${real}); ` +
          'run directly through a link like this, the CLI can exit 0 with no output',
        `run it by its real path: node ${real}`,
      );
    }
  }

  return { canAudit: nodeOk && browserOk, checks };
}

export function formatDoctorHuman(report) {
  const width = Math.max(...report.checks.map((c) => c.status.length));
  const lines = ['a11y-loop doctor', ''];
  for (const check of report.checks) {
    lines.push(`  ${check.status.padEnd(width)}  ${check.detail}`);
    if (check.fix) lines.push(`  ${' '.repeat(width)}  fix: ${check.fix}`);
  }
  lines.push('');
  if (report.canAudit) {
    lines.push('An audit can run here.');
  } else {
    const fixes = [...new Set(report.checks.filter((c) => c.status === STATUS.FAIL && c.fix).map((c) => c.fix))];
    lines.push('An audit cannot run here.');
    for (const fix of fixes) lines.push(`Fix: ${fix}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {{flags:{json?:boolean}}} input
 * @param {{write:Function, writeError:Function}} io
 * @param {object} [deps] passed to collectDoctorReport
 * @returns {Promise<number>} 0 when an audit can run, 2 when it cannot
 */
export async function runDoctorCommand({ flags = {} } = {}, io, deps) {
  const report = await collectDoctorReport(deps);
  if (flags.json) io.write(`${JSON.stringify({ canAudit: report.canAudit, checks: report.checks }, null, 2)}\n`);
  else io.write(formatDoctorHuman(report));
  return report.canAudit ? 0 : 2;
}
