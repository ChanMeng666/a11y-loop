import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseCli, resolveAuditTarget, main, EXIT, isEntryPoint, missingMcpDependency } from '../../src/cli.js';
import { ToolError } from '../../src/lib/axe-runner.js';
import { loadStates } from '../../src/commands/audit.js';
import { contrastResult, formatContrastHuman } from '../../src/commands/contrast.js';
import { makeReport, cleanReport, emptyButtonFinding } from '../helpers/report-fixture.js';
import { serializeReport } from '../../src/lib/format/json.js';
import { MISSING_BROWSER_HINT } from '../../src/lib/axe-runner.js';
import {
  bundledPlaywright,
  installBrowserArgs,
  playwrightFlags,
  runInstallBrowserCommand,
} from '../../src/commands/install-browser.js';
import {
  collectDoctorReport,
  formatDoctorHuman,
  runDoctorCommand,
  STATUS,
} from '../../src/commands/doctor.js';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI_PATH = join(REPO, 'src', 'cli.js');

/** Capture stdout/stderr instead of writing to the terminal. */
function captureIo() {
  const out = [];
  const err = [];
  return {
    io: { write: (t) => out.push(t), writeError: (t) => err.push(t) },
    stdout: () => out.join(''),
    stderr: () => err.join(''),
  };
}

describe('parseCli', () => {
  test('parses a command with positionals', () => {
    const parsed = parseCli(['audit', 'http://localhost:3000']);
    assert.equal(parsed.command, 'audit');
    assert.deepEqual(parsed.positionals, ['http://localhost:3000']);
  });

  test('parses audit flags', () => {
    const { flags } = parseCli([
      'audit',
      '--html',
      '<button></button>',
      '--json',
      '--out',
      'r.json',
      '--sarif',
      'r.sarif',
      '--headed',
      '--quiet',
      '--interact',
      'states.mjs',
    ]);
    assert.equal(flags.html, '<button></button>');
    assert.equal(flags.json, true);
    assert.equal(flags.out, 'r.json');
    assert.equal(flags.sarif, 'r.sarif');
    assert.equal(flags.headed, true);
    assert.equal(flags.quiet, true);
    assert.equal(flags.interact, 'states.mjs');
  });

  test('best-practice defaults on and --no-best-practice turns it off', () => {
    assert.equal(parseCli(['audit', 'u']).flags.bestPractice, true);
    assert.equal(parseCli(['audit', 'u', '--no-best-practice']).flags.bestPractice, false);
  });

  test('parses contrast flags', () => {
    const { command, positionals, flags } = parseCli([
      'contrast',
      '#777',
      '#fff',
      '--large',
      '--ui',
      '--fix',
    ]);
    assert.equal(command, 'contrast');
    assert.deepEqual(positionals, ['#777', '#fff']);
    assert.equal(flags.large, true);
    assert.equal(flags.ui, true);
    assert.equal(flags.fix, true);
  });

  test('parses diff flags', () => {
    const { flags } = parseCli(['diff', '--before', 'a.json', '--after', 'b.json']);
    assert.equal(flags.before, 'a.json');
    assert.equal(flags.after, 'b.json');
  });

  test('rejects unknown options rather than ignoring them', () => {
    assert.throws(() => parseCli(['audit', '--nonsense']));
  });
});

describe('resolveAuditTarget', () => {
  test('a positional http url becomes a url target', () => {
    assert.deepEqual(resolveAuditTarget(['http://localhost:3000'], {}), {
      type: 'url',
      value: 'http://localhost:3000',
    });
  });

  test('--file and --html become their own target types', () => {
    assert.deepEqual(resolveAuditTarget([], { file: 'p.html' }), { type: 'file', value: 'p.html' });
    assert.deepEqual(resolveAuditTarget([], { html: '<b>x</b>' }), {
      type: 'html',
      value: '<b>x</b>',
    });
  });

  test('an empty --html is still a valid target', () => {
    assert.deepEqual(resolveAuditTarget([], { html: '' }), { type: 'html', value: '' });
  });

  test('no target is an error with usage guidance', () => {
    assert.throws(() => resolveAuditTarget([], {}), (error) => {
      assert.ok(error instanceof ToolError);
      assert.match(error.message, /needs a target/);
      assert.match(error.hint, /--file/);
      return true;
    });
  });

  test('two targets at once is an error', () => {
    assert.throws(
      () => resolveAuditTarget(['http://x.test'], { file: 'p.html' }),
      /exactly one target/,
    );
  });

  test('file:// is rejected with the reason and the alternative', () => {
    assert.throws(() => resolveAuditTarget(['file:///c:/page.html'], {}), (error) => {
      assert.match(error.message, /file:\/\/ URLs are not supported/);
      assert.match(error.hint, /null origin/);
      assert.match(error.hint, /--file/);
      return true;
    });
  });

  test('a bare path as a positional is rejected with a hint', () => {
    assert.throws(() => resolveAuditTarget(['page.html'], {}), /not an http\(s\) URL/);
  });
});

describe('main — argument handling', () => {
  test('no command prints usage and exits 2', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main([], io), EXIT.ERROR);
    assert.match(stdout(), /USAGE/);
  });

  test('--help prints usage and exits 0', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['--help'], io), EXIT.OK);
    assert.match(stdout(), /a11y-loop audit/);
    assert.match(stdout(), /EXIT CODES/);
  });

  test('usage documents the five passes and the coverage caveat', async () => {
    const { io, stdout } = captureIo();
    await main(['--help'], io);
    assert.match(stdout(), /Five rendering passes/);
    assert.match(stdout(), /not an audit or conformance claim/);
  });

  test('--version prints the package version', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['--version'], io), EXIT.OK);
    assert.match(stdout(), /^\d+\.\d+\.\d+/);
  });

  test('an unknown command exits 2 with usage', async () => {
    const { io, stderr } = captureIo();
    assert.equal(await main(['frobnicate'], io), EXIT.ERROR);
    assert.match(stderr(), /unknown command "frobnicate"/);
  });

  test('a bad flag exits 2 without a stack trace', async () => {
    const { io, stderr } = captureIo();
    assert.equal(await main(['audit', '--bogus'], io), EXIT.ERROR);
    assert.match(stderr(), /a11y-loop: /);
    assert.equal(/ {4}at /.test(stderr()), false, 'no stack trace should leak');
  });

  test('audit with no target exits 2 with a hint, not a stack trace', async () => {
    const { io, stderr } = captureIo();
    assert.equal(await main(['audit'], io), EXIT.ERROR);
    assert.match(stderr(), /needs a target/);
    assert.equal(/ {4}at /.test(stderr()), false);
  });
});

describe('main — contrast command', () => {
  test('a failing pair exits 1 and reports the ratio', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['contrast', '#777777', '#ffffff'], io), EXIT.FINDINGS);
    assert.match(stdout(), /4\.47:1/);
    assert.match(stdout(), /FAIL AA \(4\.5:1\)/);
    assert.match(stdout(), /SC 1\.4\.3 Contrast \(Minimum\) \(Level AA\)/);
  });

  test('a passing pair exits 0', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['contrast', '#000000', '#ffffff'], io), EXIT.OK);
    assert.match(stdout(), /21:1/);
    assert.match(stdout(), /PASS AA/);
  });

  test('--large lowers the threshold to 3:1 and can flip the verdict', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['contrast', '#777777', '#ffffff', '--large'], io), EXIT.OK);
    assert.match(stdout(), /large-scale text/);
    assert.match(stdout(), /PASS AA \(3:1\)/);
  });

  test('--ui uses SC 1.4.11 at 3:1', async () => {
    const { io, stdout } = captureIo();
    await main(['contrast', '#949494', '#ffffff', '--ui'], io);
    assert.match(stdout(), /non-text \/ UI component/);
    assert.match(stdout(), /SC 1\.4\.11 Non-text Contrast/);
  });

  test('--fix suggests a passing colour with before and after ratios', async () => {
    const { io, stdout } = captureIo();
    await main(['contrast', '#777777', '#ffffff', '--fix'], io);
    assert.match(stdout(), /Candidates that reach 4\.5:1/);
    assert.match(stdout(), /#777777 → #767676/);
    assert.match(stdout(), /\(4\.47:1 → 4\.54:1\)/);
  });

  test('--fix offers both directions when both are reachable', async () => {
    const { io, stdout } = captureIo();
    await main(['contrast', '#787878', '#767676', '--fix'], io);
    assert.match(stdout(), /text lighter:/);
    assert.match(stdout(), /text darker:/);
  });

  test('--json emits the machine shape', async () => {
    const { io, stdout } = captureIo();
    await main(['contrast', '#777777', '#ffffff', '--fix', '--json'], io);
    const result = JSON.parse(stdout());
    assert.equal(result.ratio, 4.47);
    assert.equal(result.ratioDisplay, '4.47');
    assert.equal(result.passes.AA, false);
    assert.equal(result.wcag.sc, '1.4.3');
    assert.equal(result.wcag.required, 4.5);
    assert.ok(result.fix.suggestions.length > 0);
    assert.match(result.fix.suggestions[0].hex, /^#[0-9a-f]{6}$/);
  });

  test('alpha is composited and reported', async () => {
    const { io, stdout } = captureIo();
    await main(['contrast', 'rgba(0,0,0,0.5)', '#ffffff', '--json'], io);
    const result = JSON.parse(stdout());
    assert.equal(result.composited.foreground, '#808080');
    assert.equal(result.ratioDisplay, '3.94');
  });

  test('one colour missing exits 2 with usage', async () => {
    const { io, stderr } = captureIo();
    assert.equal(await main(['contrast', '#777777'], io), EXIT.ERROR);
    assert.match(stderr(), /needs two colours/);
  });

  test('an unparseable colour exits 2 and lists accepted formats', async () => {
    const { io, stderr } = captureIo();
    assert.equal(await main(['contrast', 'chartroose', '#fff'], io), EXIT.ERROR);
    assert.match(stderr(), /Could not parse color/);
    assert.match(stderr(), /named colours/);
  });

  test('contrastResult and its human rendering agree', () => {
    const result = contrastResult('#777777', '#ffffff', { fix: true });
    const text = formatContrastHuman(result);
    assert.match(text, new RegExp(result.ratioDisplay.replace('.', '\\.')));
  });
});

describe('main — diff command', () => {
  const dirs = [];
  const withReports = async (before, after) => {
    const dir = await mkdtemp(join(tmpdir(), 'a11y-loop-diff-'));
    dirs.push(dir);
    const beforePath = join(dir, 'before.json');
    const afterPath = join(dir, 'after.json');
    await writeFile(beforePath, serializeReport(before));
    await writeFile(afterPath, serializeReport(after));
    return { beforePath, afterPath, dir };
  };
  test.after(async () => {
    for (const dir of dirs) await rm(dir, { recursive: true, force: true });
  });

  test('a converged pair exits 0 and lists FIXED rows', async () => {
    const { beforePath, afterPath } = await withReports(
      makeReport({ findings: [emptyButtonFinding()] }),
      cleanReport(),
    );
    const { io, stdout } = captureIo();
    assert.equal(await main(['diff', '--before', beforePath, '--after', afterPath], io), EXIT.OK);
    assert.match(stdout(), /FIXED\s+SC 4\.1\.2/);
    assert.match(stdout(), /Converged/);
  });

  test('a regression exits 1', async () => {
    const { beforePath, afterPath } = await withReports(
      cleanReport(),
      makeReport({ findings: [emptyButtonFinding()] }),
    );
    const { io, stdout } = captureIo();
    assert.equal(
      await main(['diff', '--before', beforePath, '--after', afterPath], io),
      EXIT.FINDINGS,
    );
    assert.match(stdout(), /REGRESSION/);
  });

  test('--json emits the diff arrays', async () => {
    const { beforePath, afterPath } = await withReports(
      makeReport({ findings: [emptyButtonFinding()] }),
      cleanReport(),
    );
    const { io, stdout } = captureIo();
    await main(['diff', '--before', beforePath, '--after', afterPath, '--json'], io);
    const diff = JSON.parse(stdout());
    assert.equal(diff.fixed.length, 1);
    assert.deepEqual(diff.new, []);
    assert.equal(diff.summary.converged, true);
  });

  test('a missing --after exits 2', async () => {
    const { io, stderr } = captureIo();
    assert.equal(await main(['diff', '--before', 'a.json'], io), EXIT.ERROR);
    assert.match(stderr(), /requires both --before/);
  });

  test('an unreadable report exits 2 with the path and a how-to', async () => {
    const { io, stderr } = captureIo();
    assert.equal(
      await main(['diff', '--before', 'missing-a.json', '--after', 'missing-b.json'], io),
      EXIT.ERROR,
    );
    assert.match(stderr(), /Could not read --before report/);
    assert.match(stderr(), /a11y-loop audit <target> --out report\.json/);
  });

  test('a JSON file that is not an a11y-loop report exits 2', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'a11y-loop-diff-'));
    dirs.push(dir);
    const path = join(dir, 'other.json');
    await writeFile(path, '{"hello":"world"}');
    const { io, stderr } = captureIo();
    assert.equal(await main(['diff', '--before', path, '--after', path], io), EXIT.ERROR);
    assert.match(stderr(), /is not an a11y-loop report/);
  });

  test('malformed JSON exits 2', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'a11y-loop-diff-'));
    dirs.push(dir);
    const path = join(dir, 'bad.json');
    await writeFile(path, '{not json');
    const { io, stderr } = captureIo();
    assert.equal(await main(['diff', '--before', path, '--after', path], io), EXIT.ERROR);
    assert.match(stderr(), /is not valid JSON/);
  });
});

describe('loadStates', () => {
  const dirs = [];
  test.after(async () => {
    for (const dir of dirs) await rm(dir, { recursive: true, force: true });
  });
  const writeModule = async (source, name = 'states.mjs') => {
    const dir = await mkdtemp(join(tmpdir(), 'a11y-loop-states-'));
    dirs.push(dir);
    const path = join(dir, name);
    await writeFile(path, source);
    return path;
  };

  test('loads a named states export', async () => {
    const path = await writeModule(
      'export const states = { "modal-open": async (page) => page.click("#x") };',
    );
    const states = await loadStates(path);
    assert.deepEqual(Object.keys(states), ['modal-open']);
    assert.equal(typeof states['modal-open'], 'function');
  });

  test('accepts a default export of the states object', async () => {
    const path = await writeModule('export default { "a": async () => {} };');
    assert.deepEqual(Object.keys(await loadStates(path)), ['a']);
  });

  test('rejects a module with no states export, showing the expected shape', async () => {
    const path = await writeModule('export const nope = 1;');
    await assert.rejects(() => loadStates(path), (error) => {
      assert.ok(error instanceof ToolError);
      assert.match(error.message, /does not export "states"/);
      assert.match(error.hint, /export const states/);
      return true;
    });
  });

  test('rejects a non-function state', async () => {
    const path = await writeModule('export const states = { bad: 42 };');
    await assert.rejects(() => loadStates(path), /state "bad" is not a function/);
  });

  test('reports a module that cannot be imported at all', async () => {
    await assert.rejects(
      () => loadStates(join(tmpdir(), 'definitely-missing-states.mjs')),
      /Could not load --interact module/,
    );
  });

  test('surfaces a syntax error in the module with guidance', async () => {
    const path = await writeModule('export const states = {');
    await assert.rejects(() => loadStates(path), (error) => {
      assert.match(error.message, /Could not load --interact module/);
      assert.match(error.hint, /must be ESM/);
      return true;
    });
  });
});

describe('main — audit output plumbing', () => {
  test('writes JSON and SARIF files without printing JSON to stdout', async () => {
    // Exercises the file-writing path through a report fixture rather than a
    // browser run; the browser path is covered by the integration suite.
    const dir = await mkdtemp(join(tmpdir(), 'a11y-loop-out-'));
    try {
      const outPath = join(dir, 'r.json');
      await writeFile(outPath, serializeReport(makeReport()));
      const written = JSON.parse(await readFile(outPath, 'utf8'));
      assert.equal(written.summary.violations, 2);
      assert.ok(written.tool.passesRun.includes('reflow'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('missing-browser hint', () => {
  test('names a11y-loop install-browser and never a bare npx playwright', () => {
    assert.match(MISSING_BROWSER_HINT, /a11y-loop install-browser/);
    assert.doesNotMatch(MISSING_BROWSER_HINT, /npx playwright/);
    assert.match(MISSING_BROWSER_HINT, /PLAYWRIGHT_BROWSERS_PATH/);
  });

  test('usage lists doctor and install-browser', async () => {
    const { io, stdout } = captureIo();
    await main(['--help'], io);
    assert.match(stdout(), /a11y-loop doctor/);
    assert.match(stdout(), /a11y-loop install-browser/);
  });
});

describe('install-browser', () => {
  test('runs the bundled Playwright cli.js, headless shell only, and passes extra arguments through', () => {
    const args = installBrowserArgs(['--with-deps', '--dry-run']);
    assert.equal(args[0], join(bundledPlaywright().dir, 'cli.js'));
    assert.deepEqual(args.slice(1), ['install', 'chromium', '--only-shell', '--with-deps', '--dry-run']);
  });

  test('installs only the headless shell by default', () => {
    assert.deepEqual(installBrowserArgs().slice(1), ['install', 'chromium', '--only-shell']);
  });

  test('--full and --headed install the full Chromium: no --only-shell, and the flag is not forwarded', () => {
    for (const flag of ['--full', '--headed']) {
      assert.deepEqual(installBrowserArgs([flag]).slice(1), ['install', 'chromium']);
      assert.deepEqual(installBrowserArgs([flag, '--dry-run']).slice(1), ['install', 'chromium', '--dry-run']);
    }
  });

  test('an explicit --only-shell or --no-shell is respected and never doubled', () => {
    assert.deepEqual(playwrightFlags(['--only-shell']), ['--only-shell']);
    assert.deepEqual(playwrightFlags(['--no-shell']), ['--no-shell']);
    assert.deepEqual(playwrightFlags(['--full', '--only-shell']), ['--only-shell']);
  });

  test('the Playwright installer accepts --only-shell (--dry-run names only the headless shell)', () => {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install-browser', '--dry-run'], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /chromium-headless-shell/);
    assert.doesNotMatch(result.stdout, /Chrome for Testing/);
    assert.match(result.stderr, /headless shell/);
  });

  test('--full --dry-run names the full Chromium as well', () => {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install-browser', '--full', '--dry-run'], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Chrome for Testing/);
    assert.match(result.stdout, /chromium-headless-shell/);
  });

  test('--dry-run prints the build the bundled Playwright expects, even with another playwright first on PATH', () => {
    // The revision a11y-loop's own tree expects. playwright-core does not
    // export browsers.json, so read it from the package directory that the
    // bundled playwright resolves.
    const fromPlaywright = createRequire(join(bundledPlaywright().dir, 'package.json'));
    const coreDir = dirname(fromPlaywright.resolve('playwright-core/package.json'));
    const browsers = JSON.parse(readFileSync(join(coreDir, 'browsers.json'), 'utf8')).browsers;
    const { revision } = browsers.find((b) => b.name === 'chromium');

    // A decoy `playwright` and `npx` first on PATH. If either were used, its
    // marker would show up and the exit code would be 3.
    const decoyDir = join(tmpdir(), `a11y-loop-decoy-${process.pid}`);
    mkdirSync(decoyDir, { recursive: true });
    for (const name of ['playwright', 'npx']) {
      writeFileSync(join(decoyDir, name), '#!/bin/sh\necho DECOY-PLAYWRIGHT\nexit 3\n', { mode: 0o755 });
      writeFileSync(join(decoyDir, `${name}.cmd`), '@echo DECOY-PLAYWRIGHT\r\n@exit /b 3\r\n');
    }
    const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
    const sep = process.platform === 'win32' ? ';' : ':';
    try {
      const result = spawnSync(process.execPath, [CLI_PATH, 'install-browser', '--full', '--dry-run'], {
        encoding: 'utf8',
        env: { ...process.env, [pathKey]: `${decoyDir}${sep}${process.env[pathKey]}` },
        timeout: 60_000,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, new RegExp(`playwright chromium v${revision}\\b`));
      assert.doesNotMatch(result.stdout + result.stderr, /DECOY-PLAYWRIGHT/);
    } finally {
      rmSync(decoyDir, { recursive: true, force: true });
    }
  });

  function fakeSpawn(exitCode) {
    const calls = [];
    const impl = (command, args, options) => {
      calls.push({ command, args, options });
      const child = new EventEmitter();
      setImmediate(() => child.emit('close', exitCode, null));
      return child;
    };
    return { impl, calls };
  }

  test('a successful installer returns 0, inherits the environment and never waits on stdin', async () => {
    const { io } = captureIo();
    const { impl, calls } = fakeSpawn(0);
    assert.equal(await runInstallBrowserCommand({ args: ['--dry-run'] }, io, { spawnImpl: impl }), EXIT.OK);
    assert.equal(calls[0].command, process.execPath);
    assert.equal(calls[0].options.env, process.env);
    assert.equal(calls[0].options.stdio[0], 'ignore');
  });

  test('a failing installer is a tool error (exit 2), never 1', async () => {
    const { io } = captureIo();
    const { impl } = fakeSpawn(1);
    await assert.rejects(
      runInstallBrowserCommand({}, io, { spawnImpl: impl }),
      (error) => error instanceof ToolError && /exited with code 1/.test(error.message),
    );
  });
});

describe('--headed without the full Chromium', () => {
  test('launchBrowser fails with the install-browser --full hint before launching', async () => {
    const { chromium } = await import('playwright');
    const { launchBrowser, MISSING_FULL_BROWSER_HINT } = await import('../../src/lib/axe-runner.js');
    const original = chromium.executablePath;
    chromium.executablePath = () => join(tmpdir(), 'a11y-loop-no-such-dir', 'chrome');
    try {
      await assert.rejects(
        launchBrowser({ headed: true }),
        (error) =>
          error instanceof ToolError &&
          /full Chromium/.test(error.message) &&
          /a11y-loop install-browser --full/.test(error.hint),
      );
      assert.match(MISSING_FULL_BROWSER_HINT, /install-browser --full/);
    } finally {
      chromium.executablePath = original;
    }
  });

  test('usage says --headed needs install-browser --full', async () => {
    const { io, stdout } = captureIo();
    await main(['--help'], io);
    assert.match(stdout(), /--headed .*install-browser --full/);
  });
});

describe('mcp optional dependencies', () => {
  const notFound = (name) =>
    Object.assign(new Error(`Cannot find package '${name}' imported from /x/mcp.js`), { code: 'ERR_MODULE_NOT_FOUND' });

  test('a missing MCP SDK or zod becomes a tool error naming the install command', () => {
    for (const name of ['@modelcontextprotocol/server', 'zod']) {
      const error = missingMcpDependency(notFound(name));
      assert.ok(error instanceof ToolError);
      assert.ok(error.message.includes(name));
      assert.match(error.hint, /npm i -g @modelcontextprotocol\/server@\S+ zod@\S+/);
      assert.match(error.hint, /npx -y -p a11y-loop -p @modelcontextprotocol\/server@\S+ -p zod@\S+ a11y-loop mcp/);
    }
  });

  test('any other import failure is not swallowed', () => {
    assert.equal(missingMcpDependency(notFound('culori')), null);
    assert.equal(missingMcpDependency(new Error("Cannot find package 'zod'")), null);
    assert.equal(missingMcpDependency(null), null);
  });
});

describe('doctor', () => {
  let home;
  test.before(async () => {
    home = await mkdtemp(join(tmpdir(), 'a11y-loop-doctor-'));
  });
  test.after(async () => {
    await rm(home, { recursive: true, force: true });
  });

  /** Deps for a machine where an audit can run, with nothing else installed. */
  function healthy(overrides = {}) {
    return {
      env: {},
      home,
      executablePath: async () => CLI_PATH, // any file that exists
      launchProbe: async () => '151.0.0.0',
      ...overrides,
    };
  }
  const byId = (report, id) => report.checks.filter((c) => c.id === id);

  test('a launchable browser means an audit can run (exit 0)', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await runDoctorCommand({ flags: {} }, io, healthy()), EXIT.OK);
    assert.match(stdout(), /An audit can run here\./);
    assert.match(stdout(), /axe-core \d+\.\d+\.\d+/);
    assert.match(stdout(), /Playwright \d+\.\d+\.\d+ \(bundled/);
  });

  test('a missing browser means it cannot (exit 2) and names install-browser', async () => {
    const { io, stdout } = captureIo();
    const deps = healthy({
      executablePath: async () => join(home, 'no', 'chrome.exe'),
      launchProbe: async () => {
        throw new Error("browserType.launch: Executable doesn't exist at /x/chrome-headless-shell");
      },
    });
    assert.equal(await runDoctorCommand({ flags: {} }, io, deps), EXIT.ERROR);
    assert.match(stdout(), /headless launch failed \(browserType\.launch: Executable doesn't exist/);
    assert.match(stdout(), /chrome\.exe does not exist/);
    assert.match(stdout(), /Fix: a11y-loop install-browser/);
  });

  test('a headless-shell-only install (no full chrome) can still run an audit', async () => {
    // `playwright install --only-shell chromium`, as CI does: executablePath()
    // names a full chrome that is absent, yet the headless audit launches.
    const report = await collectDoctorReport(
      healthy({ executablePath: async () => join(home, 'no', 'chrome') }),
    );
    assert.equal(report.canAudit, true);
    const [chromium] = byId(report, 'chromium');
    assert.equal(chromium.status, STATUS.OK);
    assert.match(chromium.detail, /headless launch succeeded \(151\.0\.0\.0\)$/);
    assert.doesNotMatch(chromium.detail, /does not exist|not installed/);
  });

  test('an executable that will not launch is a failure, not a pass', async () => {
    const report = await collectDoctorReport(
      healthy({
        launchProbe: async () => {
          throw new Error('Host system is missing dependencies\nmore detail');
        },
      }),
    );
    assert.equal(report.canAudit, false);
    const [chromium] = byId(report, 'chromium');
    assert.equal(chromium.status, STATUS.FAIL);
    assert.match(chromium.detail, /headless launch failed \(Host system is missing dependencies\)$/);
  });

  test('a Node below engines is a failure', async () => {
    const report = await collectDoctorReport(healthy({ nodeVersion: '18.19.0' }));
    assert.equal(report.canAudit, false);
    assert.equal(byId(report, 'node')[0].status, STATUS.FAIL);
  });

  test('--json emits canAudit and the checks', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await runDoctorCommand({ flags: { json: true } }, io, healthy()), EXIT.OK);
    const parsed = JSON.parse(stdout());
    assert.equal(parsed.canAudit, true);
    assert.ok(parsed.checks.some((c) => c.id === 'chromium' && c.status === 'ok'));
  });

  test('reports PLAYWRIGHT_BROWSERS_PATH, set or not', async () => {
    const unset = await collectDoctorReport(healthy());
    assert.match(byId(unset, 'browsers-path')[0].detail, /is not set/);
    const set = await collectDoctorReport(healthy({ env: { PLAYWRIGHT_BROWSERS_PATH: '/srv/pw' } }));
    assert.match(byId(set, 'browsers-path')[0].detail, /PLAYWRIGHT_BROWSERS_PATH=\/srv\/pw/);
  });

  test('without a plugin registry, the plugin and double registration are "could not check"', async () => {
    mkdirSync(join(home, '.claude', 'skills', 'a11y-loop'), { recursive: true });
    writeFileSync(join(home, '.claude', 'skills', 'a11y-loop', 'SKILL.md'), '  a11y-loop/version: "0.2.6"\n');
    const report = await collectDoctorReport(healthy());
    assert.match(byId(report, 'skill-copy')[0].detail, /^skill copy at .*\(version 0\.2\.6\)$/);
    assert.match(byId(report, 'skill-copy')[1].detail, /^no skill copy at .*\.agents/);
    assert.match(byId(report, 'plugin')[0].detail, /could not check/);
    assert.match(byId(report, 'double-registration')[0].detail, /could not check/);
  });

  test('a skill copy plus the installed plugin is a double-registration warning', async () => {
    mkdirSync(join(home, '.claude', 'plugins'), { recursive: true });
    writeFileSync(
      join(home, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: { 'a11y-loop@chanmeng-a11y-loop': [{ version: '0.2.6' }] } }),
    );
    const report = await collectDoctorReport(healthy());
    assert.match(byId(report, 'plugin')[0].detail, /installed: a11y-loop@chanmeng-a11y-loop 0\.2\.6/);
    const [warning] = byId(report, 'double-registration');
    assert.equal(warning.status, STATUS.WARN);
    assert.match(warning.fix, /^delete .*a11y-loop and keep the plugin$/);
    assert.equal(report.canAudit, true, 'a warning does not stop an audit');
  });

  test('a registry without a11y-loop says not installed, and raises no warning', async () => {
    writeFileSync(
      join(home, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: { 'other@market': [{ version: '1.0.0' }] } }),
    );
    const report = await collectDoctorReport(healthy());
    assert.match(byId(report, 'plugin')[0].detail, /not installed/);
    assert.equal(byId(report, 'double-registration').length, 0);
  });

  test('the human format lists each distinct fix once', () => {
    const text = formatDoctorHuman({
      canAudit: false,
      checks: [
        { id: 'chromium', status: 'fail', detail: 'x', fix: 'a11y-loop install-browser' },
        { id: 'chromium', status: 'fail', detail: 'y', fix: 'a11y-loop install-browser' },
      ],
    });
    assert.equal(text.match(/^Fix: a11y-loop install-browser$/gm).length, 1);
  });
});

describe('isEntryPoint', () => {
  test('matches when argv[1] is the module itself', () => {
    assert.equal(isEntryPoint(pathToFileURL(CLI_PATH).href, CLI_PATH), true);
  });

  test('is false with no argv[1] (imported, not run)', () => {
    assert.equal(isEntryPoint(pathToFileURL(CLI_PATH).href, undefined), false);
  });

  test('is false for a different script', () => {
    assert.equal(isEntryPoint(pathToFileURL(CLI_PATH).href, join(REPO, 'package.json')), false);
  });

  test('an unresolvable argv[1] is compared as given rather than throwing', () => {
    const missing = join(tmpdir(), 'a11y-loop-does-not-exist', 'cli.js');
    assert.equal(isEntryPoint(pathToFileURL(missing).href, missing), true);
  });

  test('install-browser help says stdin is ignored, so --with-deps cannot answer sudo', async () => {
    const { io, stdout } = captureIo();
    await main(['--help'], io);
    assert.match(stdout(), /stdin is ignored, so --with-deps cannot answer a sudo password prompt/);
  });
});
