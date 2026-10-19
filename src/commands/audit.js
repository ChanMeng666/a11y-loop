/**
 * `a11y-loop audit` — run the browser audit and emit the report.
 *
 * Exit codes: 0 no violations · 1 violations found · 2 tool error.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { resolve, isAbsolute, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { runAudit, ToolError, DEFAULT_VIEWPORT } from '../lib/axe-runner.js';
import { axeCoreVersion } from '../lib/wcag-map.js';
import { buildReport, serializeReport } from '../lib/format/json.js';
import { formatHuman } from '../lib/format/human.js';
import { serializeSarif } from '../lib/format/sarif.js';
import { buildChecklist } from '../lib/format/checklist.js';

export const TOOL_NAME = 'a11y-loop';

/**
 * Write an output file (`--out`, `--sarif`), creating its parent directories
 * first. The skill's own examples write to `.a11y/run-1.json`, and a fresh
 * project has no `.a11y/`; failing there with ENOENT after a full audit threw
 * the whole run away.
 *
 * @param {string} file
 * @param {string} text
 * @returns {Promise<string>} the absolute path written
 */
export async function writeOutputFile(file, text) {
  const target = resolve(file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, text, 'utf8');
  return target;
}

/** Read our own version rather than hardcoding it in two places. */
async function toolVersion() {
  try {
    const pkgUrl = new URL('../../package.json', import.meta.url);
    return JSON.parse(await readFile(pkgUrl, 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

/**
 * Load an --interact module: `export const states = { name: async (page) => {} }`.
 * @param {string} path
 */
export async function loadStates(path) {
  const absolute = isAbsolute(path) ? path : resolve(process.cwd(), path);
  let module;
  try {
    module = await import(pathToFileURL(absolute).href);
  } catch (error) {
    throw new ToolError(`Could not load --interact module ${absolute}: ${error.message}`, {
      hint:
        'The module must be ESM (.mjs, or .js in a "type":"module" package) and export:\n\n' +
        '  export const states = {\n' +
        '    "modal-open": async (page) => { await page.click("#open-dialog"); },\n' +
        '  };',
    });
  }
  const states = module.states ?? module.default?.states ?? module.default;
  if (!states || typeof states !== 'object') {
    throw new ToolError(`--interact module ${absolute} does not export "states".`, {
      hint: 'Expected: export const states = { "state-name": async (page) => { … } };',
    });
  }
  for (const [name, fn] of Object.entries(states)) {
    if (typeof fn !== 'function') {
      throw new ToolError(`--interact state "${name}" is not a function.`);
    }
  }
  return states;
}

/**
 * Work out what `audit` should audit. Shared by the CLI and `a11y-loop mcp`.
 *
 * @param {string[]} positionals
 * @param {{file?:string, html?:string}} flags
 * @returns {{type:'url'|'file'|'html', value:string}}
 */
export function resolveAuditTarget(positionals, flags) {
  const given = [
    positionals[0] ? { type: 'url', value: positionals[0] } : null,
    flags.file ? { type: 'file', value: flags.file } : null,
    flags.html !== undefined ? { type: 'html', value: flags.html } : null,
  ].filter(Boolean);

  if (given.length === 0) {
    throw new ToolError('audit needs a target.', {
      hint: 'Use one of:\n  a11y-loop audit http://localhost:3000\n  a11y-loop audit --file page.html\n  a11y-loop audit --html "<button></button>"',
    });
  }
  if (given.length > 1) {
    throw new ToolError(
      `audit takes exactly one target, but got ${given.map((g) => g.type).join(' and ')}.`,
    );
  }

  const target = given[0];
  if (target.type === 'url' && !/^https?:\/\//i.test(target.value)) {
    if (/^file:\/\//i.test(target.value)) {
      throw new ToolError('file:// URLs are not supported.', {
        hint:
          'A null origin breaks axe frame injection, ES modules and fetch. Use --file <path> ' +
          'instead — a11y-loop serves it over http on 127.0.0.1.',
      });
    }
    throw new ToolError(`"${target.value}" is not an http(s) URL.`, {
      hint: 'Did you mean --file or --html?',
    });
  }
  return target;
}

/**
 * Run the audit and assemble the JSON report: the one code path behind both
 * `a11y-loop audit` and the MCP `a11y_loop_audit` tool.
 *
 * @param {object} input
 * @param {{type:'url'|'file'|'html', value:string}} input.target
 * @param {object} input.flags parsed CLI flags (interact, headed, bestPractice)
 * @param {AbortSignal} [input.signal]
 * @param {Function} [input.onProgress] see runAudit
 * @returns {Promise<object>} the report, as `serializeReport` writes it
 */
export async function buildAuditReport({ target, flags, signal, onProgress }) {
  const states = flags.interact ? await loadStates(flags.interact) : {};

  const result = await runAudit({
    target,
    options: {
      headed: Boolean(flags.headed),
      bestPractice: flags.bestPractice !== false,
      states,
      signal,
      onProgress,
    },
  });

  const manualChecklist = buildChecklist({
    facts: result.facts,
    incompleteRuleIds: result.incompleteRuleIds,
    statesRun: result.statesRun,
  });

  return buildReport({
    tool: {
      name: TOOL_NAME,
      version: await toolVersion(),
      axeCoreVersion: axeCoreVersion(),
      browser: 'Chromium',
      browserVersion: result.browserVersion,
      userAgent: result.userAgent,
      viewport: DEFAULT_VIEWPORT,
      timestamp: new Date().toISOString(),
      passesRun: result.passesRun,
      statesRun: result.statesRun,
    },
    target: { ...target, servedAt: result.url },
    findings: result.findings,
    manualChecklist,
    facts: result.facts,
  });
}

/**
 * @param {object} input
 * @param {{type:'url'|'file'|'html', value:string}} input.target
 * @param {object} input.flags parsed CLI flags
 * @param {{write:(s:string)=>void, writeError:(s:string)=>void}} io
 * @returns {Promise<number>} process exit code
 */
export async function runAuditCommand({ target, flags }, io) {
  const report = await buildAuditReport({ target, flags });
  const json = serializeReport(report);

  if (flags.out) await writeOutputFile(flags.out, json);
  if (flags.sarif) await writeOutputFile(flags.sarif, serializeSarif(report));

  if (flags.json) {
    io.write(json);
  } else {
    io.write(formatHuman(report, { quiet: Boolean(flags.quiet) }));
  }

  if (flags.out && !flags.json && !flags.quiet) {
    io.writeError(`JSON report written to ${resolve(flags.out)}\n`);
  }
  if (flags.sarif && !flags.json && !flags.quiet) {
    io.writeError(`SARIF written to ${resolve(flags.sarif)}\n`);
  }

  return report.summary.violations > 0 ? 1 : 0;
}
