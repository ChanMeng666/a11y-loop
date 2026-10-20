import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  looksLikeUiScript,
  isUiFile,
  uiEditPath,
  isAuditCommand,
  isAuditCall,
  toolUsesFrom,
  scanTranscript,
  displayPath,
  buildReason,
  evaluate,
} from '../../src/lib/audit-gate.js';
import { isEntryPoint } from '../../plugin/hooks/audit-gate.mjs';

const GATE = fileURLToPath(new URL('../../plugin/hooks/audit-gate.mjs', import.meta.url));
const CWD = 'D:\\work\\app';

// ---------------------------------------------------------------------------
// Synthetic transcripts in Claude Code's session JSONL shape: one object per
// line; assistant lines carry message.content[] with tool_use blocks, and the
// tool's result comes back on a user line as a tool_result block.
// ---------------------------------------------------------------------------

let seq = 0;
function assistantToolUse(name, input) {
  seq++;
  return {
    parentUuid: `p-${seq}`,
    isSidechain: false,
    type: 'assistant',
    uuid: `a-${seq}`,
    timestamp: new Date(Date.UTC(2026, 9, 20, 10, 0, seq)).toISOString(),
    sessionId: 'session-1',
    cwd: CWD,
    message: {
      id: `msg_${seq}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'tool_use', id: `toolu_${seq}`, name, input }],
    },
  };
}
function toolResult(text = 'ok') {
  seq++;
  return {
    parentUuid: `a-${seq - 1}`,
    isSidechain: false,
    type: 'user',
    uuid: `u-${seq}`,
    timestamp: new Date(Date.UTC(2026, 9, 20, 10, 0, seq)).toISOString(),
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: `toolu_${seq - 1}`, content: text }] },
  };
}
const userPrompt = (text) => ({ type: 'user', uuid: 'u-0', message: { role: 'user', content: text } });
const assistantText = (text) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } });

const writeHtml = (file = 'D:\\work\\app\\index.html') =>
  assistantToolUse('Write', { file_path: file, content: '<main><h1>Hi</h1><button>Save</button></main>' });
const editTsx = (file = 'D:\\work\\app\\src\\Dialog.tsx') =>
  assistantToolUse('Edit', { file_path: file, old_string: 'a', new_string: '<Dialog open />' });
const writeServerTs = () =>
  assistantToolUse('Write', { file_path: 'D:\\work\\app\\server\\db.ts', content: 'export const pool: Map<string, number> = new Map();' });
const bash = (command) => assistantToolUse('Bash', { command, description: 'run' });
const audit = (cmd = 'npx a11y-loop audit --file index.html --out .a11y/run-1.json --quiet') => bash(cmd);

const jsonl = (...entries) => `${entries.map((e) => JSON.stringify(e)).join('\n')}\n`;

const UI_THEN_AUDIT = jsonl(userPrompt('build a page'), writeHtml(), toolResult(), audit(), toolResult('0 violations'), assistantText('Done.'));
const UI_NO_AUDIT = jsonl(userPrompt('build a page'), writeHtml(), toolResult(), editTsx(), toolResult(), assistantText('Done.'));
const AUDIT_THEN_UI = jsonl(writeHtml(), toolResult(), audit(), toolResult(), editTsx(), toolResult(), assistantText('Done.'));
const NON_UI = jsonl(userPrompt('fix the db'), writeServerTs(), toolResult(), bash('npm test'), toolResult(), assistantText('Done.'));

// ---------------------------------------------------------------------------

describe('isUiFile', () => {
  test('UI extensions count whatever they contain', () => {
    for (const f of ['a.html', 'b.HTM', 'c.jsx', 'd.tsx', 'e.vue', 'f.svelte', 'g.astro', 'h.css', 'i.scss', 'j.mdx']) {
      assert.equal(isUiFile(`src/${f}`, ''), true, f);
    }
  });

  test('non-UI extensions never count', () => {
    for (const f of ['a.md', 'b.json', 'c.py', 'd.go', 'e.yml', 'Makefile', '.htmlrc', 'x.html.bak']) {
      assert.equal(isUiFile(f, '<div></div>'), false, f);
    }
  });

  test('.js and .ts count only when the content looks like UI', () => {
    assert.equal(isUiFile('src/app.js', 'document.querySelector("#x").focus()'), true);
    assert.equal(isUiFile('src/App.ts', 'return <div className="x">hi</div>;'), true);
    assert.equal(isUiFile('src/util.ts', 'export const add = (a: number, b: number) => a + b;'), false);
    assert.equal(isUiFile('src/util.mjs', undefined), false);
  });

  test('bad input is not a UI file', () => {
    assert.equal(isUiFile(undefined, 'x'), false);
    assert.equal(isUiFile(42, 'x'), false);
    assert.equal(isUiFile('', 'x'), false);
  });
});

describe('looksLikeUiScript', () => {
  test('recognises JSX, DOM access, createElement and templates', () => {
    for (const src of [
      'return <Button onClick={go}>Save</Button>;',
      'return <Icon name="x" />;',
      'return <><A /></>;',
      'const el = document.getElementById("x");',
      'React.createElement("div", null)',
      'const t = `<template><slot></slot></template>`;',
    ]) {
      assert.equal(looksLikeUiScript(src), true, src);
    }
  });

  test('does not mistake TypeScript generics or comparisons for markup', () => {
    for (const src of [
      'const m: Map<string, Array<number>> = new Map();',
      'function f<T extends object>(x: T): Promise<void> {}',
      'if (a < b && c > d) return;',
      'const documentation = "see docs";',
      'export default { port: 3000 };',
    ]) {
      assert.equal(looksLikeUiScript(src), false, src);
    }
  });
});

describe('uiEditPath', () => {
  test('reads each write tool from its own input shape', () => {
    assert.equal(uiEditPath({ name: 'Write', input: { file_path: 'a.html', content: '' } }), 'a.html');
    assert.equal(uiEditPath({ name: 'Edit', input: { file_path: 'b.css', old_string: 'x', new_string: 'y' } }), 'b.css');
    assert.equal(
      uiEditPath({ name: 'MultiEdit', input: { file_path: 'c.js', edits: [{ old_string: 'a', new_string: 'b' }, { old_string: 'c', new_string: 'document.body' }] } }),
      'c.js',
    );
    assert.equal(uiEditPath({ name: 'NotebookEdit', input: { notebook_path: 'n.ipynb', new_source: '<div></div>' } }), null);
  });

  test('ignores tools that do not write files, and malformed inputs', () => {
    assert.equal(uiEditPath({ name: 'Read', input: { file_path: 'a.html' } }), null);
    assert.equal(uiEditPath({ name: 'Write', input: null }), null);
    assert.equal(uiEditPath({ name: 'Write', input: 'a.html' }), null);
    assert.equal(uiEditPath({ name: 'MultiEdit', input: { file_path: 'c.js', edits: 'nope' } }), null);
    assert.equal(uiEditPath(undefined), null);
  });
});

describe('isAuditCommand', () => {
  test('accepts every form the skill resolves the CLI to', () => {
    for (const cmd of [
      'a11y-loop audit http://localhost:5173 --out .a11y/run-1.json --quiet',
      'npx a11y-loop audit --file index.html',
      'npx a11y-loop@latest audit --html "<button>x</button>"',
      'npx --yes a11y-loop@0.3.2 audit http://localhost:3000',
      'node src/cli.js audit --html "<b>x</b>"',
      'node D:\\github_repository\\a11y-loop\\src\\cli.js audit --file x.html',
      'cd app && npx a11y-loop audit http://localhost:5173 --interact .a11y/states.mjs',
      'mkdir -p .a11y; a11y-loop audit http://localhost:5173',
      '"C:\\npm\\a11y-loop.cmd" audit x',
    ]) {
      assert.equal(isAuditCommand(cmd), true, cmd);
    }
  });

  test('rejects other a11y-loop subcommands and look-alikes', () => {
    for (const cmd of [
      'a11y-loop diff --before a.json --after b.json',
      'a11y-loop contrast #777 #fff --fix',
      'a11y-loop --version',
      'npm audit',
      'echo a11y-loop-audit',
      'my-a11y-loop audit',
      'node src/cli.js diff --before a --after b',
      'grep -r "a11y-loop audit" docs',
    ]) {
      assert.equal(isAuditCommand(cmd), false, cmd);
    }
    assert.equal(isAuditCommand(undefined), false);
  });

  test('counts audits run through Bash or PowerShell only', () => {
    const command = 'npx a11y-loop audit --file x.html';
    assert.equal(isAuditCall({ name: 'Bash', input: { command } }), true);
    assert.equal(isAuditCall({ name: 'PowerShell', input: { command } }), true);
    assert.equal(isAuditCall({ name: 'Write', input: { command } }), false);
    assert.equal(isAuditCall({ name: 'Bash', input: {} }), false);
  });
});

describe('toolUsesFrom and scanTranscript', () => {
  test('reads tool calls in order and skips lines that do not parse', () => {
    const text = `${jsonl(writeHtml(), toolResult())}{"type":"assistant","message":{"content":[{"type":"tool_u\n${jsonl(audit())}`;
    const { toolUses, parsedLines } = toolUsesFrom(text);
    assert.deepEqual(toolUses.map((t) => t.name), ['Write', 'Bash']);
    assert.equal(parsedLines, 3);
  });

  test('tolerates CRLF line endings', () => {
    assert.equal(toolUsesFrom(UI_NO_AUDIT.replace(/\n/g, '\r\n')).toolUses.length, 2);
  });

  test('an audit clears the files edited before it; edits after it are pending again', () => {
    assert.deepEqual(scanTranscript(UI_THEN_AUDIT).unauditedFiles, []);
    assert.deepEqual(scanTranscript(AUDIT_THEN_UI).unauditedFiles, ['D:\\work\\app\\src\\Dialog.tsx']);
    assert.deepEqual(scanTranscript(UI_NO_AUDIT).unauditedFiles, ['D:\\work\\app\\index.html', 'D:\\work\\app\\src\\Dialog.tsx']);
  });

  test('a file edited twice is listed once', () => {
    assert.deepEqual(scanTranscript(jsonl(writeHtml(), writeHtml())).unauditedFiles, ['D:\\work\\app\\index.html']);
  });
});

describe('displayPath', () => {
  test('shortens paths inside cwd, case-insensitively on Windows drives', () => {
    assert.equal(displayPath('D:\\work\\app\\src\\A.tsx', 'D:\\work\\app'), 'src/A.tsx');
    assert.equal(displayPath('d:\\Work\\App\\index.html', 'D:\\work\\app\\'), 'index.html');
    assert.equal(displayPath('/home/u/app/x.css', '/home/u/app'), 'x.css');
    assert.equal(displayPath('/home/u/application/x.css', '/home/u/app'), '/home/u/application/x.css');
    assert.equal(displayPath('/home/U/app/x.css', '/home/u/app'), '/home/U/app/x.css');
    assert.equal(displayPath('x.css'), 'x.css');
  });
});

describe('buildReason', () => {
  test('names the files and the exact commands, with a --file target when a page was edited', () => {
    const reason = buildReason({ files: ['D:\\work\\app\\index.html', 'D:\\work\\app\\src\\Dialog.tsx'], cwd: CWD });
    assert.match(reason, /^a11y-loop audit gate:/);
    assert.match(reason, /^- index\.html$/m);
    assert.match(reason, /^- src\/Dialog\.tsx$/m);
    assert.match(reason, /npx a11y-loop audit --file index\.html --out \.a11y\/run-1\.json --quiet/);
    assert.match(reason, /npx a11y-loop diff --before \.a11y\/run-1\.json --after \.a11y\/run-2\.json/);
    assert.match(reason, /A11Y_LOOP_AUDIT_GATE=off/);
  });

  test('falls back to the dev server URL when no page file was edited', () => {
    assert.match(buildReason({ files: ['src/A.tsx'] }), /audit <url of the running dev server> --out/);
  });

  test('caps the file list', () => {
    const files = Array.from({ length: 30 }, (_, i) => `src/C${i}.tsx`);
    const reason = buildReason({ files });
    assert.equal((reason.match(/^- src\/C\d+\.tsx$/gm) ?? []).length, 12);
    assert.match(reason, /^- and 18 more$/m);
  });

  test('stays inside the honesty language', () => {
    const reason = buildReason({ files: ['a.html'] });
    for (const banned of [/compliant/i, /guarantee/i, /fully accessible/i, /legal risk/i, /no manual testing/i, /\bscore\b/i]) {
      assert.doesNotMatch(reason, banned);
    }
  });
});

describe('evaluate', () => {
  test('UI edit then audit: pass', () => {
    assert.deepEqual(evaluate({ transcriptText: UI_THEN_AUDIT }), { decision: 'none', files: [], why: 'audited-after-last-ui-edit' });
  });

  test('UI edit with no audit: block, then pass once already blocked', () => {
    const first = evaluate({ transcriptText: UI_NO_AUDIT, cwd: CWD });
    assert.equal(first.decision, 'block');
    assert.equal(first.why, 'ui-edited-without-audit');
    assert.match(first.reason, /index\.html/);
    const second = evaluate({ transcriptText: UI_NO_AUDIT, alreadyBlocked: true });
    assert.equal(second.decision, 'none');
    assert.equal(second.why, 'already-blocked-this-session');
  });

  test('an audit before the last UI edit does not count', () => {
    assert.equal(evaluate({ transcriptText: AUDIT_THEN_UI }).decision, 'block');
  });

  test('non-UI session: pass', () => {
    assert.equal(evaluate({ transcriptText: NON_UI }).why, 'no-ui-edits');
  });

  test('stop_hook_active: pass, whatever the transcript says', () => {
    assert.equal(evaluate({ transcriptText: UI_NO_AUDIT, stopHookActive: true }).why, 'stop-hook-active');
  });

  test('malformed or empty transcripts: pass', () => {
    for (const t of ['', 'not json\n{{{', '\n\n', undefined, 42]) {
      assert.equal(evaluate({ transcriptText: /** @type {any} */ (t) }).decision, 'none');
    }
  });

  test('never returns any decision but block or none', () => {
    for (const transcriptText of [UI_THEN_AUDIT, UI_NO_AUDIT, AUDIT_THEN_UI, NON_UI, '']) {
      for (const alreadyBlocked of [false, true]) {
        for (const stopHookActive of [false, true]) {
          assert.ok(['block', 'none'].includes(evaluate({ transcriptText, alreadyBlocked, stopHookActive }).decision));
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The hook as Claude Code runs it: a Stop payload on stdin, a real transcript
// file on disk, an isolated CLAUDE_PLUGIN_DATA.
// ---------------------------------------------------------------------------

function tempTranscript(text) {
  const dir = mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-tx-'));
  const file = path.join(dir, '00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl');
  writeFileSync(file, text, 'utf8');
  return file;
}

const stopPayload = (transcriptPath, extra = {}) => ({
  session_id: '00893aaf-19fa-41d2-8238-13269b9b3ca0',
  transcript_path: transcriptPath,
  cwd: CWD,
  permission_mode: 'default',
  hook_event_name: 'Stop',
  stop_hook_active: false,
  last_assistant_message: 'Done.',
  background_tasks: [],
  session_crons: [],
  ...extra,
});

function runGate(payload, { env = {}, dataDir, entry = GATE } = {}) {
  const r = spawnSync(process.execPath, [entry], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      CLAUDE_PLUGIN_DATA: dataDir ?? mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-')),
      A11Y_LOOP_AUDIT_GATE: '',
      ...env,
    },
  });
  assert.equal(r.status, 0, `hook exited ${r.status}\n${r.stderr}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
}

describe('the hook as Claude Code invokes it', () => {
  test('blocks a session that edited UI and never audited, with a top-level decision and reason', () => {
    const out = runGate(stopPayload(tempTranscript(UI_NO_AUDIT)));
    assert.deepEqual(Object.keys(out).sort(), ['decision', 'reason']);
    assert.equal(out.decision, 'block');
    assert.match(out.reason, /index\.html/);
    assert.match(out.reason, /src\/Dialog\.tsx/);
  });

  test('blocks once per session: the second Stop passes with no decision', () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-'));
    const tx = tempTranscript(UI_NO_AUDIT);
    assert.equal(runGate(stopPayload(tx), { dataDir })?.decision, 'block');
    assert.equal(runGate(stopPayload(tx), { dataDir }), null);
    const state = JSON.parse(readFileSync(path.join(dataDir, 'a11y-loop-audit-gate.json'), 'utf8'));
    assert.ok(state.sessions['00893aaf-19fa-41d2-8238-13269b9b3ca0']);
    // A different session is still gated.
    assert.equal(runGate(stopPayload(tx, { session_id: 'other' }), { dataDir })?.decision, 'block');
  });

  test('passes when an audit followed the last UI edit', () => {
    assert.equal(runGate(stopPayload(tempTranscript(UI_THEN_AUDIT))), null);
  });

  test('passes a session with no UI edits', () => {
    assert.equal(runGate(stopPayload(tempTranscript(NON_UI))), null);
  });

  test('passes when stop_hook_active is true', () => {
    assert.equal(runGate(stopPayload(tempTranscript(UI_NO_AUDIT), { stop_hook_active: true })), null);
  });

  test('the kill switch silences it', () => {
    assert.equal(runGate(stopPayload(tempTranscript(UI_NO_AUDIT)), { env: { A11Y_LOOP_AUDIT_GATE: 'off' } }), null);
  });

  test('every failure path is silent with exit 0', () => {
    assert.equal(runGate(''), null);
    assert.equal(runGate('not json {{{'), null);
    assert.equal(runGate('null'), null);
    assert.equal(runGate(stopPayload(path.join(tmpdir(), 'no-such-dir', 'missing.jsonl'))), null);
    assert.equal(runGate(stopPayload(undefined)), null);
    assert.equal(runGate(stopPayload(tempTranscript('garbage\n{{{\n'))), null);
    assert.equal(runGate(stopPayload(tempTranscript(UI_NO_AUDIT), { session_id: undefined })), null);
  });

  test('does not block when it cannot record the block', () => {
    // CLAUDE_PLUGIN_DATA points at a file, so the state directory cannot be created.
    const blocker = path.join(mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-')), 'file');
    writeFileSync(blocker, 'x');
    assert.equal(runGate(stopPayload(tempTranscript(UI_NO_AUDIT)), { dataDir: path.join(blocker, 'sub') }), null);
  });

  test('expands a transcript_path that starts with ~/', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-home-'));
    writeFileSync(path.join(home, 't.jsonl'), UI_NO_AUDIT);
    const out = runGate(stopPayload('~/t.jsonl'), { env: { HOME: home, USERPROFILE: home } });
    assert.equal(out?.decision, 'block');
  });

  test('never emits approve or any decision other than block', () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-'));
    for (const tx of [UI_NO_AUDIT, UI_NO_AUDIT, UI_THEN_AUDIT, NON_UI, '']) {
      const out = runGate(stopPayload(tempTranscript(tx)), { dataDir });
      assert.ok(out === null || out.decision === 'block', JSON.stringify(out));
    }
  });
});

describe('the hook runs when invoked through a link', () => {
  const PLUGIN = path.resolve(path.dirname(GATE), '..');

  function viaLink(makeLink) {
    const dir = mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-link-'));
    const link = path.join(dir, 'link');
    try {
      symlinkSync(...makeLink(link));
    } catch (error) {
      if (error.code === 'EPERM') return { skip: 'symlink creation is not permitted here (EPERM)' };
      throw error;
    }
    const cleanup = () => {
      try {
        unlinkSync(link);
      } catch {
        rmdirSync(link);
      }
      rmSync(dir, { recursive: true, force: true });
    };
    return { link, cleanup };
  }

  test('a file symlink to the hook still emits a verdict', (t) => {
    const l = viaLink((link) => [GATE, link, 'file']);
    if (l.skip) return t.skip(l.skip);
    try {
      assert.equal(runGate(stopPayload(tempTranscript(UI_NO_AUDIT)), { entry: l.link })?.decision, 'block');
    } finally {
      l.cleanup();
    }
  });

  test('a directory junction or symlink to the plugin still emits a verdict', (t) => {
    const l = viaLink((link) => [PLUGIN, link, 'junction']);
    if (l.skip) return t.skip(l.skip);
    try {
      const entry = path.join(l.link, 'hooks', 'audit-gate.mjs');
      assert.equal(runGate(stopPayload(tempTranscript(UI_NO_AUDIT)), { entry })?.decision, 'block');
    } finally {
      l.cleanup();
    }
  });

  test('isEntryPoint never throws and is false without an argv[1]', () => {
    assert.equal(isEntryPoint('file:///x.mjs', undefined), false);
    assert.equal(isEntryPoint('file:///x.mjs', '\u0000bad'), false);
  });
});

describe('the hook without its shared logic', () => {
  function runDetached(libSource) {
    const root = mkdtempSync(path.join(tmpdir(), 'a11y-audit-gate-nolib-'));
    try {
      mkdirSync(path.join(root, 'hooks', 'lib'), { recursive: true });
      copyFileSync(GATE, path.join(root, 'hooks', 'audit-gate.mjs'));
      if (libSource !== undefined) writeFileSync(path.join(root, 'hooks', 'lib', 'audit-gate.mjs'), libSource);
      return spawnSync(process.execPath, [path.join(root, 'hooks', 'audit-gate.mjs')], {
        input: JSON.stringify(stopPayload(tempTranscript(UI_NO_AUDIT))),
        encoding: 'utf8',
        timeout: 15_000,
        env: { ...process.env, CLAUDE_PLUGIN_DATA: path.join(root, 'data'), A11Y_LOOP_AUDIT_GATE: '' },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  test('a missing hooks/lib/audit-gate.mjs exits 0 with no verdict', () => {
    const r = runDetached(undefined);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '');
    assert.match(r.stderr, /did not load/);
  });

  test('a hooks/lib/audit-gate.mjs that throws at load exits 0 with no verdict', () => {
    const r = runDetached("throw new Error('broken on purpose');\n");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '');
    assert.match(r.stderr, /broken on purpose/);
  });

  test('the same session in the real layout is blocked, so the cases above are not passing by accident', () => {
    assert.equal(runGate(stopPayload(tempTranscript(UI_NO_AUDIT)))?.decision, 'block');
  });
});

// ---------------------------------------------------------------------------
// Each test below kills a mutant of src/lib/audit-gate.js that the tests above
// let survive; the comment names it. Equivalent mutants have no test here.
// ---------------------------------------------------------------------------

describe('audit gate: mutation-tested edges', () => {
  // Kills `(\s[^<>]*)?\/>` → `(\s[^<>]*)\/>`: a self-closing tag with no
  // attributes is the only UI signal in this content.
  test('a bare self-closing JSX tag is UI', () => {
    assert.equal(looksLikeUiScript('return cond ? <Spinner/> : null;'), true);
  });

  // Kills `<template[\s>]` → `[^\s>]` and → `[\S>]`. The opening tag is the
  // only signal: no closing tag, no self-closing tag.
  test('an opening <template> with attributes is UI on its own', () => {
    assert.equal(looksLikeUiScript('const row = `<template id="row">`;'), true);
  });

  // Kills `NotebookEdit: … ({ path: input.notebook_path, … })` → `({})`: the
  // path is read from notebook_path, never file_path.
  test('NotebookEdit is read from notebook_path', () => {
    assert.equal(uiEditPath({ name: 'NotebookEdit', input: { notebook_path: 'page.html', new_source: '' } }), 'page.html');
    assert.equal(uiEditPath({ name: 'NotebookEdit', input: { file_path: 'page.html', new_source: '' } }), null);
  });

  // Kills `e?.new_string` → `e.new_string`, which throws on a null edit.
  test('a MultiEdit with a null entry is read, not thrown on', () => {
    const input = { file_path: 'c.js', edits: [null, { old_string: 'a', new_string: 'document.title = x' }] };
    assert.equal(uiEditPath({ name: 'MultiEdit', input }), 'c.js');
  });

  // Kills `\bnode(\.exe)?["']?` → `[^"']?` and `cli\.js["']?` → `[^"']?`:
  // the quoted forms PowerShell users type on Windows.
  test('quoted node and script paths still count as an audit', () => {
    for (const cmd of [
      '& "C:\\Program Files\\nodejs\\node.exe" src\\cli.js audit --file x.html',
      'node "D:\\work\\a11y-loop\\src\\cli.js" audit --file x.html',
    ]) {
      assert.equal(isAuditCommand(cmd), true, cmd);
    }
  });

  // Kills `toolUse?.input?.command` → `toolUse?.input.command`: a tool_use block
  // with no input is a shape the transcript can carry.
  test('a shell tool call with no input is skipped, not thrown on', () => {
    const line = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash' }] } });
    assert.deepEqual(scanTranscript(`${line}\n${jsonl(writeHtml())}`).unauditedFiles, ['D:\\work\\app\\index.html']);
  });

  // Kills `entry?.message?.content` → `entry?.message.content` (a line that
  // mentions tool_use with no top-level message, as progress lines do) and
  // `!Array.isArray(content)` → `false` (content that is an object).
  // Kills the block guard mutants: `block && …` → `true` (null block),
  // `block.type === 'tool_use'` dropped or `||`-ed (server_tool_use is not a
  // tool call this gate reads), `typeof block.name === 'string'` → `true`.
  test('only tool_use blocks with a string name are tool calls', () => {
    const lines = [
      { type: 'progress', data: { message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'sub.html' } }] } } },
      { type: 'assistant', message: { content: { type: 'tool_use', name: 'Write', input: { file_path: 'obj.html' } } } },
      {
        type: 'assistant',
        message: {
          content: [
            null,
            { type: 'server_tool_use', name: 'web_search', input: {} },
            { type: 'tool_use', input: { command: 'ls' } },
            { type: 'text', text: 'tool_use' },
          ],
        },
      },
    ];
    const text = `${lines.map((l) => JSON.stringify(l)).join('\n')}\n${jsonl(writeHtml())}`;
    assert.deepEqual(toolUsesFrom(text).toolUses.map((t) => t.name), ['Write']);
    assert.deepEqual(scanTranscript(text).unauditedFiles, ['D:\\work\\app\\index.html']);
  });

  // Kills `audits++` → `audits--` and `uiEdits++` → `uiEdits--`.
  test('scanTranscript counts UI edits and audits', () => {
    const scan = scanTranscript(AUDIT_THEN_UI);
    assert.deepEqual([scan.uiEdits, scan.audits], [2, 1]);
  });

  // Kills `parsedLines === 0` → `false` and the `'no-transcript'` literal.
  test('an empty transcript is reported as no transcript, not as no UI edits', () => {
    assert.equal(evaluate({ transcriptText: '' }).why, 'no-transcript');
  });

  // Kills `/\.html?$/i` → `/\.html$/i`: an .htm page is still a --file target.
  test('an .htm page is the audit target', () => {
    assert.match(buildReason({ files: ['src/A.tsx', 'legacy/index.htm'] }), /audit --file legacy\/index\.htm --out/);
  });

  // Kills `more > 0` → `true` or `>= 0`, and the empty branch `[]` → a junk line.
  test('exactly MAX_FILES_LISTED files have no "and N more" line', () => {
    const files = Array.from({ length: 12 }, (_, i) => `src/C${i}.tsx`);
    const reason = buildReason({ files });
    assert.equal((reason.match(/^- src\/C\d+\.tsx$/gm) ?? []).length, 12);
    assert.doesNotMatch(reason, /more$/m);
    const listEnd = reason.indexOf('\n\n');
    assert.equal(reason.slice(0, listEnd).split('\n').length, 13);
  });

  // Kills the reason's instruction lines mutated to "": the re-audit to a new
  // file, the instruction to fix in source, and the honest fallback when the
  // audit cannot run.
  test('the reason asks for a re-audit and says what to do when the audit cannot run', () => {
    const reason = buildReason({ files: ['a.html'] });
    assert.match(reason, /including any state you built .* with `--interact`/);
    assert.match(reason, /^Fix what it reports in the source, re-audit to a new file, and compare:$/m);
    assert.match(reason, /^ {2}npx a11y-loop audit --file a\.html --out \.a11y\/run-2\.json --quiet$/m);
    assert.match(reason, /say so in your reply, state that the change is unverified/);
  });
});
