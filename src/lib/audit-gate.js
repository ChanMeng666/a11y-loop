/**
 * The audit gate's decision, with no I/O, no state and no client in it.
 *
 * Its one caller is `plugin/hooks/audit-gate.mjs`, the Claude Code `Stop` hook,
 * which adds the stdin/stdout protocol, the `stop_hook_active` loop guard, the
 * once-per-session cap and the kill switch on top. It loads a copy of this
 * file, `plugin/hooks/lib/audit-gate.mjs`, because an installed plugin gets
 * only its own folder. Edit this file, then run `npm run sync-plugin`;
 * `test/unit/plugin-sync.test.js` fails until you do. Keep it free of imports
 * other than `node:` built-ins, or the copy breaks.
 *
 * It answers one question about a Claude Code transcript: did this session
 * write or edit user interface files after the last time it ran
 * `a11y-loop audit`? It checks that the audit was run. It cannot check that
 * the audit was clean, or that it covered the states that changed — the
 * audit's own report and a human reviewer are for that.
 *
 * The transcript is Claude Code's session JSONL: one JSON object per line, and
 * each assistant turn carries `message.content[]` blocks, of which the ones
 * that matter here are `{ type: 'tool_use', name, input }`. The format is
 * Claude Code's, not a published contract, so every read here is defensive: a
 * line that does not parse, or a block of an unknown shape, is skipped, never
 * thrown on.
 *
 * A false block costs one extra turn in a session that was fine. A miss costs
 * nothing the skill text was not already asking for. So both detectors demand
 * real evidence: a UI file extension, or JS/TS whose written content looks like
 * it touches the DOM; and an audit command the CLI actually accepts.
 */

/** Edits to files with these extensions are UI edits, whatever they contain. */
export const UI_EXTENSIONS = Object.freeze([
  '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.css', '.scss', '.mdx',
]);

/** Edits to these are UI edits only when the content written looks like UI code. */
export const SCRIPT_EXTENSIONS = Object.freeze(['.js', '.ts', '.mjs', '.cjs']);

/** The tools that write files, and where each keeps its path and its new content. */
const WRITE_TOOLS = {
  Write: (input) => ({ path: input.file_path, content: input.content }),
  Edit: (input) => ({ path: input.file_path, content: input.new_string }),
  MultiEdit: (input) => ({
    path: input.file_path,
    content: Array.isArray(input.edits) ? input.edits.map((e) => e?.new_string ?? '').join('\n') : '',
  }),
  NotebookEdit: (input) => ({ path: input.notebook_path, content: input.new_source }),
};

/** The tools that run shell commands. PowerShell is Claude Code's Windows shell tool. */
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

/** Upper bound on files named in the reason, so a huge session cannot flood it. */
const MAX_FILES_LISTED = 12;

function extname(p) {
  const base = String(p).split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot).toLowerCase() : '';
}

/**
 * Whether JS/TS source text looks like it renders or touches UI. Each signal is
 * one TypeScript generics never produce: a closing tag, a self-closing tag, a
 * JSX fragment, a DOM global, `createElement(` or a `<template>`.
 *
 * @param {unknown} content
 * @returns {boolean}
 */
export function looksLikeUiScript(content) {
  if (typeof content !== 'string' || !content) return false;
  return (
    /<\/[A-Za-z][\w.:-]*\s*>/.test(content) || // </div>, </Button>
    /<[A-Za-z][\w.:-]*(\s[^<>]*)?\/>/.test(content) || // <Icon />, <br/>
    /<>|<\/>/.test(content) || // fragment
    /\bdocument\s*\.\s*[A-Za-z]/.test(content) ||
    /\bcreateElement\s*\(/.test(content) ||
    /<template[\s>]/.test(content)
  );
}

/**
 * Whether a write to `filePath` with `content` is a UI edit.
 *
 * @param {unknown} filePath
 * @param {unknown} content
 * @returns {boolean}
 */
export function isUiFile(filePath, content) {
  if (typeof filePath !== 'string' || !filePath) return false;
  const ext = extname(filePath);
  if (UI_EXTENSIONS.includes(ext)) return true;
  if (SCRIPT_EXTENSIONS.includes(ext)) return looksLikeUiScript(content);
  return false;
}

/**
 * The UI file a tool call wrote, or null.
 *
 * @param {{name?:unknown, input?:unknown}} toolUse
 * @returns {string|null}
 */
export function uiEditPath(toolUse) {
  const read = WRITE_TOOLS[/** @type {string} */ (toolUse?.name)];
  const input = toolUse?.input;
  if (!read || !input || typeof input !== 'object') return null;
  const { path, content } = read(input);
  return isUiFile(path, content) ? path : null;
}

/**
 * Whether a shell command runs `a11y-loop audit` in any form the skill's
 * "Resolving the CLI" step produces: the global or project bin, `npx` (with or
 * without a version), or `node <checkout>/src/cli.js` from a checkout.
 *
 * @param {unknown} command
 * @returns {boolean}
 */
export function isAuditCommand(command) {
  if (typeof command !== 'string' || !command) return false;
  return (
    /(^|[\s;&|("'`/\\])a11y-loop(@[\w.^~-]+)?(\.cmd|\.ps1)?["']?\s+audit(\s|$)/m.test(command) ||
    /\bnode(\.exe)?["']?\s+(\S*[\\/])?src[\\/]cli\.js["']?\s+audit(\s|$)/m.test(command)
  );
}

/**
 * Whether a tool call ran an audit.
 *
 * @param {{name?:unknown, input?:any}} toolUse
 * @returns {boolean}
 */
export function isAuditCall(toolUse) {
  return SHELL_TOOLS.has(/** @type {string} */ (toolUse?.name)) && isAuditCommand(toolUse?.input?.command);
}

/**
 * Every tool call in a transcript, in order. Lines that do not parse are skipped:
 * the last line of a transcript that is still being written is often partial.
 * Only lines that mention `tool_use` are parsed at all, which keeps a long
 * session's transcript cheap to scan.
 *
 * @param {string} transcriptText
 * @returns {{toolUses:{name:string,input:any}[], parsedLines:number}}
 */
export function toolUsesFrom(transcriptText) {
  const toolUses = [];
  let parsedLines = 0;
  if (typeof transcriptText !== 'string') return { toolUses, parsedLines };
  for (const line of transcriptText.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    parsedLines++;
    if (!line.includes('"tool_use"')) continue;
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block && block.type === 'tool_use' && typeof block.name === 'string') {
        toolUses.push({ name: block.name, input: block.input });
      }
    }
  }
  return { toolUses, parsedLines };
}

/**
 * Which UI files were written after the last audit, if any.
 *
 * @param {string} transcriptText
 * @returns {{parsedLines:number, uiEdits:number, audits:number, unauditedFiles:string[]}}
 */
export function scanTranscript(transcriptText) {
  const { toolUses, parsedLines } = toolUsesFrom(transcriptText);
  let uiEdits = 0;
  let audits = 0;
  /** @type {string[]} */
  let pending = [];
  for (const use of toolUses) {
    if (isAuditCall(use)) {
      audits++;
      pending = [];
      continue;
    }
    const file = uiEditPath(use);
    if (file) {
      uiEdits++;
      if (!pending.includes(file)) pending.push(file);
    }
  }
  return { parsedLines, uiEdits, audits, unauditedFiles: pending };
}

/**
 * Show a path relative to the session's working directory when it lies inside
 * it, with forward slashes, so the reason stays short and copy-pasteable.
 *
 * @param {string} file
 * @param {string} [cwd]
 */
export function displayPath(file, cwd) {
  const norm = (s) => String(s).replace(/\\/g, '/');
  const f = norm(file);
  if (!cwd) return f;
  const base = norm(cwd).replace(/\/+$/, '');
  const fold = /^[A-Za-z]:\//.test(base); // Windows: compare case-insensitively
  const head = f.slice(0, base.length + 1);
  const same = fold ? head.toLowerCase() === `${base}/`.toLowerCase() : head === `${base}/`;
  return same ? f.slice(base.length + 1) : f;
}

/**
 * @param {{files:string[], cwd?:string}} opts
 * @returns {string}
 */
export function buildReason({ files, cwd }) {
  const shown = files.slice(0, MAX_FILES_LISTED).map((f) => displayPath(f, cwd));
  const more = files.length - shown.length;
  const page = shown.find((f) => /\.html?$/i.test(f));
  const target = page ? `--file ${page}` : '<url of the running dev server>';

  const lines = [
    'a11y-loop audit gate: this session changed user interface files and has not run `a11y-loop audit` since the last change:',
    ...shown.map((f) => `- ${f}`),
    ...(more > 0 ? [`- and ${more} more`] : []),
    '',
    'Before ending, run the audit on what you changed, including any state you built (an open dialog, an error state) with `--interact`:',
    '',
    `  npx a11y-loop audit ${target} --out .a11y/run-1.json --quiet`,
    '',
    'Fix what it reports in the source, re-audit to a new file, and compare:',
    '',
    `  npx a11y-loop audit ${target} --out .a11y/run-2.json --quiet`,
    '  npx a11y-loop diff --before .a11y/run-1.json --after .a11y/run-2.json',
    '',
    'If the audit cannot run here (no browser, no dev server), say so in your reply, state that the change is unverified, and give the user the command to run.',
    '',
    'This gate checks that an audit was run, once per session. It is not a review of the result and not a statement about the conformance of anything built. Turn it off with A11Y_LOOP_AUDIT_GATE=off.',
  ];
  return lines.join('\n');
}

/**
 * The whole decision, with no I/O in it.
 *
 * @param {{transcriptText:string, stopHookActive?:boolean, alreadyBlocked?:boolean, cwd?:string}} input
 * @returns {{decision:'block'|'none', reason?:string, files:string[], why:string}}
 */
export function evaluate({ transcriptText, stopHookActive = false, alreadyBlocked = false, cwd }) {
  const pass = (why, files = []) => ({ decision: /** @type {const} */ ('none'), files, why });

  // Claude Code is already continuing because a stop hook said so. Whatever
  // the transcript says, blocking again is how a gate becomes a loop.
  if (stopHookActive) return pass('stop-hook-active');

  const scan = scanTranscript(transcriptText);
  if (scan.parsedLines === 0) return pass('no-transcript');
  if (scan.uiEdits === 0) return pass('no-ui-edits');
  if (scan.unauditedFiles.length === 0) return pass('audited-after-last-ui-edit');
  if (alreadyBlocked) return pass('already-blocked-this-session', scan.unauditedFiles);

  return {
    decision: 'block',
    files: scan.unauditedFiles,
    why: 'ui-edited-without-audit',
    reason: buildReason({ files: scan.unauditedFiles, cwd }),
  };
}
