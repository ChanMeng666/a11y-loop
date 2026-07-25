/**
 * `a11y-loop audit` — run the browser audit and emit the report.
 *
 * Exit codes: 0 no violations · 1 violations found · 2 tool error.
 */

import { writeFile, readFile } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

import { runAudit, ToolError, DEFAULT_VIEWPORT } from '../lib/axe-runner.js';
import { axeCoreVersion } from '../lib/wcag-map.js';
import { buildReport, serializeReport } from '../lib/format/json.js';
import { formatHuman } from '../lib/format/human.js';
import { serializeSarif } from '../lib/format/sarif.js';
import { buildChecklist } from '../lib/format/checklist.js';

export const TOOL_NAME = 'a11y-loop';

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
 * @param {object} input
 * @param {{type:'url'|'file'|'html', value:string}} input.target
 * @param {object} input.flags parsed CLI flags
 * @param {{write:(s:string)=>void, writeError:(s:string)=>void}} io
 * @returns {Promise<number>} process exit code
 */
export async function runAuditCommand({ target, flags }, io) {
  const states = flags.interact ? await loadStates(flags.interact) : {};

  const result = await runAudit({
    target,
    options: {
      headed: Boolean(flags.headed),
      bestPractice: flags.bestPractice !== false,
      states,
    },
  });

  const manualChecklist = buildChecklist({
    facts: result.facts,
    incompleteRuleIds: result.incompleteRuleIds,
    statesRun: result.statesRun,
  });

  const report = buildReport({
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

  const json = serializeReport(report);

  if (flags.out) await writeFile(resolve(flags.out), json, 'utf8');
  if (flags.sarif) await writeFile(resolve(flags.sarif), serializeSarif(report), 'utf8');

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
