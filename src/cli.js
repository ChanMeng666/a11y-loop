#!/usr/bin/env node
/**
 * a11y-loop CLI.
 *
 * Exit codes are the loop's contract:
 *   0 — no violations (audit) / threshold met (contrast) / no regression (diff)
 *   1 — violations found / threshold missed / regression introduced
 *   2 — tool error (bad arguments, missing browser, unreadable report)
 */

import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

import { runAuditCommand } from './commands/audit.js';
import { runContrastCommand } from './commands/contrast.js';
import { runDiffCommand } from './commands/diff.js';
import { ToolError } from './lib/axe-runner.js';

export const EXIT = { OK: 0, FINDINGS: 1, ERROR: 2 };

const OPTIONS = {
  json: { type: 'boolean', default: false },
  out: { type: 'string' },
  sarif: { type: 'string' },
  headed: { type: 'boolean', default: false },
  // parseArgs has no --no-* negation, so the negative form is its own option.
  'no-best-practice': { type: 'boolean', default: false },
  interact: { type: 'string' },
  quiet: { type: 'boolean', default: false },
  file: { type: 'string' },
  html: { type: 'string' },
  large: { type: 'boolean', default: false },
  ui: { type: 'boolean', default: false },
  fix: { type: 'boolean', default: false },
  before: { type: 'string' },
  after: { type: 'string' },
  help: { type: 'boolean', default: false, short: 'h' },
  version: { type: 'boolean', default: false },
};

const USAGE = `a11y-loop — accessibility verification for AI coding agents

USAGE
  a11y-loop audit <url>              audit a running page
  a11y-loop audit --file <path>      audit an HTML file (served over http, never file://)
  a11y-loop audit --html "<button>"  audit a fragment (the usual entry point for an agent)
  a11y-loop contrast <fg> <bg>       check a colour pair against WCAG 2.x
  a11y-loop diff --before a.json --after b.json    compare two audits

AUDIT OPTIONS
  --json                 machine-readable report on stdout
  --out <path>           write the JSON report to a file
  --sarif <path>         also write SARIF v2.1 (see notes in the report)
  --interact <path.mjs>  audit interaction states: export const states = { name: async (page) => {} }
  --headed               run a visible browser (debugging)
  --no-best-practice     omit axe best-practice rules (they are never blocking either way)
  --quiet                one-line summary only

CONTRAST OPTIONS
  --large                large-scale text thresholds (>=24px, or >=18.5px bold)
  --ui                   non-text / UI component threshold (3:1, SC 1.4.11)
  --fix                  suggest passing colours, lighter and darker, in OKLCh
  --json                 machine-readable result

EXIT CODES
  0  no violations / threshold met / no regression
  1  violations found / threshold missed / new violations introduced
  2  tool error

Five rendering passes run per audit: default, dark, forced-colors, reduced-motion,
and a 320x256 viewport (the WCAG-sanctioned 400% zoom equivalent for SC 1.4.10).

Automated checks cover a subset of WCAG (Deque: ~57% of issues by volume; ~31% of AA
criteria have any automated rule). This is not an audit or conformance claim.
`;

/**
 * Turn argv into a command plus normalised flags.
 * @param {string[]} argv
 */
export function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: OPTIONS,
    allowPositionals: true,
    strict: true,
  });

  const flags = {
    ...values,
    bestPractice: !values['no-best-practice'],
  };
  delete flags['no-best-practice'];

  return { command: positionals[0] ?? null, positionals: positionals.slice(1), flags };
}

/**
 * Work out what `audit` should audit.
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
 * @param {string[]} argv
 * @param {{write:Function, writeError:Function}} [io]
 * @returns {Promise<number>} exit code
 */
export async function main(argv, io) {
  const out = io ?? {
    write: (text) => process.stdout.write(text),
    writeError: (text) => process.stderr.write(text),
  };

  let parsed;
  try {
    parsed = parseCli(argv);
  } catch (error) {
    out.writeError(`a11y-loop: ${error.message}\n\n${USAGE}`);
    return EXIT.ERROR;
  }

  const { command, positionals, flags } = parsed;

  if (flags.version) {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    out.write(`${pkg.version}\n`);
    return EXIT.OK;
  }

  if (flags.help || command === 'help' || command === null) {
    out.write(USAGE);
    return command === null && !flags.help ? EXIT.ERROR : EXIT.OK;
  }

  try {
    if (command === 'audit') {
      const target = resolveAuditTarget(positionals, flags);
      return await runAuditCommand({ target, flags }, out);
    }

    if (command === 'contrast') {
      const [fg, bg] = positionals;
      if (!fg || !bg) {
        throw new ToolError('contrast needs two colours.', {
          hint: 'a11y-loop contrast "#777777" "#ffffff" [--large] [--ui] [--fix]',
        });
      }
      return await runContrastCommand({ fg, bg, flags }, out);
    }

    if (command === 'diff') {
      return await runDiffCommand({ flags }, out);
    }

    out.writeError(`a11y-loop: unknown command "${command}"\n\n${USAGE}`);
    return EXIT.ERROR;
  } catch (error) {
    if (error instanceof ToolError) {
      out.writeError(`a11y-loop: ${error.message}\n`);
      if (error.hint) out.writeError(`\n${error.hint}\n`);
      return EXIT.ERROR;
    }
    out.writeError(`a11y-loop: unexpected error: ${error?.message ?? error}\n`);
    if (process.env.A11Y_LOOP_DEBUG) out.writeError(`${error?.stack ?? ''}\n`);
    else out.writeError('Set A11Y_LOOP_DEBUG=1 for a stack trace.\n');
    return EXIT.ERROR;
  }
}

// Only run when invoked as a program, so tests can import `main` freely.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
