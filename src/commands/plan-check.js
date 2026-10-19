/**
 * `a11y-loop plan-check` — the plan gate, for any agent and any CI job.
 *
 * The Claude Code hook on ExitPlanMode only exists inside Claude Code's
 * interactive plan mode. This subcommand runs the identical decision
 * (`src/lib/plan-gate.js`) on a plan's text from a file, an argument or a pipe,
 * so an agent outside Claude Code, or a headless run inside it, can check its
 * own plan before building UI.
 *
 * Stateless and idempotent: no loop guard, no session cap, no state file. The
 * same plan always gets the same answer. Those guards exist in the hook only
 * because a hook that can deny the same plan twice can deny it forever; a CLI
 * the caller runs on purpose has no such trap.
 *
 * Never prompts. stdin is read only when it is not a TTY and neither --file nor
 * --text is given, and a pipe that stays open with no data gives up after a
 * short idle timeout (exit 2) instead of hanging.
 *
 * Exit codes: 0 the plan carries accessibility content, is not UI work, or is
 * too short to assess · 1 a UI plan with thin or absent accessibility content
 * (a finding) · 2 usage or input error.
 *
 * It checks that the question was asked. It is not a review of the answer.
 */

import { readFile } from 'node:fs/promises';

import { ToolError } from '../lib/axe-runner.js';
import {
  ACCESSIBILITY_TEMPLATE,
  COVERAGE_ITEMS,
  COVERAGE_THRESHOLD,
  PLAN_RULES,
  checkPlan,
} from '../lib/plan-gate.js';

/** How long an open, silent stdin is waited on before plan-check gives up. */
export const DEFAULT_STDIN_IDLE_MS = 3000;

const USAGE_HINT =
  'Give the plan one of three ways:\n' +
  '  a11y-loop plan-check --file plan.md\n' +
  '  a11y-loop plan-check --text "<plan text>"\n' +
  '  cat plan.md | a11y-loop plan-check';

const NOTE =
  'plan-check checks that the accessibility questions were asked in the plan. It is not a review ' +
  'of the answers and says nothing about the conformance of anything built from it; ' +
  '`a11y-loop audit` and a human reviewer are the verification step.';

function stdinIdleMs() {
  const raw = Number(process.env.A11Y_LOOP_STDIN_IDLE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STDIN_IDLE_MS;
}

/**
 * Read all of a non-TTY stream, or reject when it goes quiet for `idleMs`.
 * Destroys the stream on the way out either way, so an open pipe cannot keep
 * the process alive after the answer is written.
 *
 * @param {NodeJS.ReadableStream & {destroy?:Function}} stream
 * @param {number} idleMs
 * @returns {Promise<string>}
 */
export function readStream(stream, idleMs) {
  return new Promise((resolve, reject) => {
    let data = '';
    let timer;
    let settled = false;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        stream.destroy?.();
      } catch {
        // Nothing left to clean up.
      }
      fn(value);
    };
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () =>
          done(
            reject,
            new ToolError(`stdin stayed open with no data for ${idleMs} ms, so no plan was read.`, {
              hint: USAGE_HINT,
            }),
          ),
        idleMs,
      );
    };
    stream.setEncoding?.('utf8');
    stream.on('data', (chunk) => {
      data += chunk;
      arm();
    });
    stream.on('end', () => done(resolve, data));
    stream.on('error', (error) =>
      done(reject, new ToolError(`could not read stdin: ${error?.message ?? error}`, { hint: USAGE_HINT })),
    );
    arm();
  });
}

/**
 * Where the plan comes from: exactly one of --file, --text, or a non-TTY stdin.
 *
 * @param {{file?:string, text?:string}} flags
 * @param {(NodeJS.ReadableStream & {isTTY?:boolean}) | null} stdin
 * @returns {Promise<{source:string, text:string}>}
 */
export async function readPlanInput(flags, stdin) {
  if (flags.file !== undefined && flags.text !== undefined) {
    throw new ToolError('plan-check takes one of --file or --text, not both.', { hint: USAGE_HINT });
  }

  let input;
  if (flags.file !== undefined) {
    if (!flags.file) throw new ToolError('--file needs a path.', { hint: USAGE_HINT });
    try {
      input = { source: flags.file, text: await readFile(flags.file, 'utf8') };
    } catch (error) {
      throw new ToolError(`could not read plan file "${flags.file}": ${error.code ?? error.message}`);
    }
  } else if (flags.text !== undefined) {
    input = { source: '--text', text: flags.text };
  } else if (!stdin || stdin.isTTY) {
    throw new ToolError('plan-check needs a plan, and it never prompts for one.', { hint: USAGE_HINT });
  } else {
    input = { source: 'stdin', text: await readStream(stdin, stdinIdleMs()) };
  }

  if (!input.text.trim()) {
    throw new ToolError(`the plan from ${input.source} is empty.`, { hint: USAGE_HINT });
  }
  return input;
}

/**
 * The machine-readable result. Its shape is part of the CLI's contract.
 *
 * @param {ReturnType<typeof checkPlan>} check
 * @param {string} source
 */
export function planCheckResult(check, source) {
  const answered = new Set(check.present);
  return {
    tool: 'a11y-loop plan-check',
    source,
    verdict: check.verdict,
    why: check.why,
    isUiWork: check.isUiWork,
    hasA11yContent: check.hasA11yContent,
    hasSection: check.hasSection,
    coverage: { answered: check.present.length, of: COVERAGE_ITEMS.length, threshold: COVERAGE_THRESHOLD },
    missing: check.missing.map(({ key, label }) => ({ key, label, rule: PLAN_RULES[key] })),
    planRules: COVERAGE_ITEMS.map(({ key, label }) => ({
      key,
      label,
      rule: PLAN_RULES[key],
      answered: answered.has(key),
    })),
    risks: check.risks,
    uiEvidence: {
      strong: check.ui.strong,
      medium: check.ui.medium,
      nonUi: check.ui.nonUi,
      uiScore: check.ui.uiScore,
      nonUiScore: check.ui.nonUiScore,
    },
    template: check.verdict === 'fail' ? ACCESSIBILITY_TEMPLATE : null,
    note: NOTE,
  };
}

const HEADLINES = {
  'plan-too-short': 'ok: the plan is too short to assess, so it was not checked.',
  'not-ui': 'ok: this plan does not read as user interface work, so no accessibility section is expected.',
  'already-covered': 'ok: this UI plan carries accessibility content.',
  'ui-without-accessibility':
    'FINDING: this plan changes user interface work, and its accessibility content is thin or absent.',
};

/** @param {ReturnType<typeof planCheckResult>} result */
export function formatPlanCheckHuman(result) {
  const lines = [`a11y-loop plan-check ${HEADLINES[result.why]}`];
  const assessed = result.why === 'already-covered' || result.why === 'ui-without-accessibility';

  if (assessed) {
    lines.push(
      `Plan items answered: ${result.coverage.answered} of ${result.coverage.of} (the check asks for at least ${result.coverage.threshold}).`,
    );
  }

  if (result.verdict === 'fail') {
    lines.push('');
    lines.push(
      result.hasSection
        ? 'There is an accessibility heading, but most items under it are unanswered.'
        : 'There is no accessibility section in this plan.',
    );
    lines.push('');
    lines.push('Unanswered:');
    for (const m of result.missing) lines.push(`  - ${m.label}: ${m.rule}`);
    lines.push('');
    lines.push('Add this section, fill each line from what this plan actually builds, and run plan-check again:');
    lines.push('');
    lines.push(result.template);
  } else if (result.why === 'already-covered' && result.missing.length) {
    lines.push(`Still unanswered: ${result.missing.map((m) => m.label).join(', ')}.`);
  }

  if (assessed && result.risks.length) {
    lines.push('');
    lines.push('Decisions already in this plan that are hard to walk back once built:');
    for (const r of result.risks) lines.push(`  - ${r.note}`);
  }

  lines.push('');
  lines.push(result.note);
  return `${lines.join('\n')}\n`;
}

/**
 * Read the plan and check it: the one code path behind `a11y-loop plan-check`
 * and the MCP `a11y_loop_plan_check` tool.
 *
 * @param {{file?:string, text?:string}} flags
 * @param {(NodeJS.ReadableStream & {isTTY?:boolean}) | null} stdin
 */
export async function planCheck(flags, stdin) {
  const { source, text } = await readPlanInput(flags, stdin);
  return planCheckResult(checkPlan(text), source);
}

/**
 * @param {{flags?: {file?:string, text?:string, json?:boolean}}} input
 * @param {{write:Function, writeError:Function, stdin?:NodeJS.ReadableStream|null}} io
 *   `io.stdin` defaults to `process.stdin`; pass `null` to mean "no stdin".
 * @returns {Promise<number>} exit code
 */
export async function runPlanCheckCommand({ flags = {} } = {}, io) {
  const stdin = io.stdin === undefined ? process.stdin : io.stdin;
  const result = await planCheck(flags, stdin);
  io.write(flags.json ? `${JSON.stringify(result, null, 2)}\n` : formatPlanCheckHuman(result));
  return result.verdict === 'fail' ? 1 : 0;
}
