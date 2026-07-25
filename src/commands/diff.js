/**
 * `a11y-loop diff --before a.json --after b.json`
 *
 * Exit codes: 0 no new violations · 1 regression (NEW is non-empty) ·
 * 2 a report could not be read.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { diffReports, formatDiffHuman } from '../lib/diff.js';
import { ToolError } from '../lib/axe-runner.js';

async function readReport(path, label) {
  const absolute = resolve(path);
  let text;
  try {
    text = await readFile(absolute, 'utf8');
  } catch (error) {
    throw new ToolError(`Could not read --${label} report ${absolute}: ${error.message}`, {
      hint: 'Produce reports with: a11y-loop audit <target> --out report.json',
    });
  }
  let report;
  try {
    report = JSON.parse(text);
  } catch (error) {
    throw new ToolError(`--${label} report ${absolute} is not valid JSON: ${error.message}`);
  }
  if (!report?.findings?.violations) {
    throw new ToolError(
      `--${label} report ${absolute} is not an a11y-loop report (no findings.violations array).`,
      { hint: 'Produce reports with: a11y-loop audit <target> --out report.json' },
    );
  }
  return report;
}

/**
 * @param {{flags:object}} input
 * @param {{write:Function, writeError:Function}} io
 * @returns {Promise<number>}
 */
export async function runDiffCommand({ flags }, io) {
  if (!flags.before || !flags.after) {
    throw new ToolError('diff requires both --before <a.json> and --after <b.json>.');
  }

  const before = await readReport(flags.before, 'before');
  const after = await readReport(flags.after, 'after');
  const diff = diffReports(before, after);

  if (flags.json) {
    io.write(`${JSON.stringify(diff, null, 2)}\n`);
  } else {
    io.write(
      formatDiffHuman(diff, {
        beforePath: resolve(flags.before),
        afterPath: resolve(flags.after),
      }),
    );
  }

  return diff.summary.regression ? 1 : 0;
}
