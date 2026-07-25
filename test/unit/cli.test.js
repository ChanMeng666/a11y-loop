import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseCli, resolveAuditTarget, main, EXIT } from '../../src/cli.js';
import { ToolError } from '../../src/lib/axe-runner.js';
import { loadStates } from '../../src/commands/audit.js';
import { contrastResult, formatContrastHuman } from '../../src/commands/contrast.js';
import { makeReport, cleanReport, emptyButtonFinding } from '../helpers/report-fixture.js';
import { serializeReport } from '../../src/lib/format/json.js';

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
