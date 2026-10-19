import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { main, EXIT } from '../../src/cli.js';
import { checkPlan, COVERAGE_ITEMS, PLAN_RULES } from '../../src/lib/plan-gate.js';
import { readStream, planCheckResult } from '../../src/commands/plan-check.js';
import { evaluate } from '../../plugin/hooks/plan-gate.mjs';

/** A plan that is unmistakably UI and says nothing about accessibility. */
const UI_PLAN = `Build a React settings page. Add a modal dialog for role changes, a
members table with per-row actions, tabs across the top and a dark mode toggle.
Style everything with Tailwind CSS. The navbar gets a dropdown, and the invite
form needs checkbox inputs and a submit button.`;

const BACKEND_PLAN = `Design the REST API for the billing service: endpoints, auth,
pagination and rate limits. Add a postgres schema migration, a cron scheduler and a
worker daemon. The CLI should return proper exit codes and write errors to stderr.`;

const FULL_A11Y = `
### Accessibility
- Target: WCAG 2.2 Level AA — NZ Web Accessibility Standard 1.2
- Per-component criteria: members table SC 1.3.1; invite form SC 3.3.2 and 4.1.2; modal follows the APG dialog keyboard contract
- Foreclosing decisions: none — no drag reordering, no hover-only menus
- Color tokens: every pair run through a11y-loop contrast --fix in light and dark
- Structure: heading outline, landmarks, focus order, skip link
- Verification: --interact states modal-open and form-error, audited before merge
- Manual budget: NVDA screen reader pass, 2h`;

const DRAG_PLAN = `${UI_PLAN}\nCards on the kanban board are reordered by drag and drop.`;

/** A corpus spanning every branch of the decision. */
const CORPUS = {
  ui: UI_PLAN,
  backend: BACKEND_PLAN,
  covered: UI_PLAN + FULL_A11Y,
  drag: DRAG_PLAN,
  short: 'React modal with a button.',
  partial: `${UI_PLAN}\n\n## Accessibility\n- Target: WCAG 2.2 Level AA`,
  empty: '',
};

function captureIo(stdin = null) {
  const out = [];
  const err = [];
  return {
    io: { write: (t) => out.push(t), writeError: (t) => err.push(t), stdin },
    stdout: () => out.join(''),
    stderr: () => err.join(''),
  };
}

function pipedStdin(text) {
  const stream = new PassThrough();
  stream.end(text);
  return stream;
}

describe('the hook and the CLI share one decision', () => {
  for (const [name, plan] of Object.entries(CORPUS)) {
    test(`"${name}": a first-sighting hook deny happens exactly when plan-check fails`, () => {
      const hook = evaluate({ plan, seenBefore: false, denyCount: 0 });
      const cli = checkPlan(plan);
      assert.equal(hook.decision === 'deny', cli.verdict === 'fail');
      if (cli.verdict === 'pass') assert.equal(hook.why, cli.why);
      else assert.equal(hook.why, 'ui-without-accessibility');
    });
  }

  test('every coverage item has a plan rule', () => {
    for (const item of COVERAGE_ITEMS) assert.ok(PLAN_RULES[item.key], `PLAN_RULES.${item.key}`);
  });
});

describe('checkPlan', () => {
  test('fails a UI plan with no accessibility content', () => {
    const r = checkPlan(UI_PLAN);
    assert.equal(r.verdict, 'fail');
    assert.equal(r.isUiWork, true);
    assert.equal(r.hasA11yContent, false);
    assert.equal(r.missing.length, 7);
  });

  test('passes a backend plan as not UI work', () => {
    const r = checkPlan(BACKEND_PLAN);
    assert.equal(r.verdict, 'pass');
    assert.equal(r.why, 'not-ui');
    assert.equal(r.isUiWork, false);
  });

  test('passes a UI plan that carries the section', () => {
    const r = checkPlan(UI_PLAN + FULL_A11Y);
    assert.equal(r.verdict, 'pass');
    assert.equal(r.why, 'already-covered');
    assert.equal(r.hasA11yContent, true);
    assert.deepEqual(r.missing, []);
  });

  test('is deterministic: the same plan gets the same answer every time', () => {
    assert.deepEqual(checkPlan(UI_PLAN), checkPlan(UI_PLAN));
  });

  test('tolerates a non-string without throwing', () => {
    assert.equal(checkPlan(undefined).verdict, 'pass');
    assert.equal(checkPlan(null).why, 'plan-too-short');
  });
});

describe('main — plan-check', () => {
  test('a UI plan with no accessibility content exits 1 and names what is missing', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['plan-check', '--text', UI_PLAN], io), EXIT.FINDINGS);
    assert.match(stdout(), /FINDING/);
    assert.match(stdout(), /Per-component criteria:/);
    assert.match(stdout(), /### Accessibility/);
  });

  test('a covered plan exits 0', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['plan-check', '--text', UI_PLAN + FULL_A11Y], io), EXIT.OK);
    assert.match(stdout(), /carries accessibility content/);
  });

  test('a backend plan exits 0', async () => {
    const { io } = captureIo();
    assert.equal(await main(['plan-check', '--text', BACKEND_PLAN], io), EXIT.OK);
  });

  test('running the same plan twice gives the same answer (no loop guard, no state)', async () => {
    for (let i = 0; i < 3; i++) {
      const { io } = captureIo();
      assert.equal(await main(['plan-check', '--text', UI_PLAN], io), EXIT.FINDINGS);
    }
  });

  test('--json carries the verdict, the missing items and the rule each stands for', async () => {
    const { io, stdout } = captureIo();
    assert.equal(await main(['plan-check', '--text', DRAG_PLAN, '--json'], io), EXIT.FINDINGS);
    const r = JSON.parse(stdout());
    assert.equal(r.verdict, 'fail');
    assert.equal(r.isUiWork, true);
    assert.equal(r.hasA11yContent, false);
    assert.equal(r.missing.length, 7);
    for (const m of r.missing) assert.equal(m.rule, PLAN_RULES[m.key]);
    assert.equal(r.planRules.length, COVERAGE_ITEMS.length);
    assert.ok(r.risks.some((risk) => risk.id === 'dragging'));
    assert.match(r.template, /### Accessibility/);
    assert.match(r.note, /not a review/);
  });

  test('reads the plan from --file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'a11y-loop-plan-'));
    try {
      const file = join(dir, 'plan.md');
      await writeFile(file, UI_PLAN + FULL_A11Y);
      const { io } = captureIo();
      assert.equal(await main(['plan-check', '--file', file], io), EXIT.OK);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('reads the plan from a piped stdin', async () => {
    const { io } = captureIo(pipedStdin(UI_PLAN));
    assert.equal(await main(['plan-check'], io), EXIT.FINDINGS);
  });

  test('a TTY stdin with no input exits 2 with usage instead of prompting', async () => {
    const tty = new PassThrough();
    tty.isTTY = true;
    const { io, stderr } = captureIo(tty);
    assert.equal(await main(['plan-check'], io), EXIT.ERROR);
    assert.match(stderr(), /never prompts/);
    assert.match(stderr(), /--file plan\.md/);
  });

  test('no stdin at all exits 2', async () => {
    const { io } = captureIo(null);
    assert.equal(await main(['plan-check'], io), EXIT.ERROR);
  });

  test('an empty plan exits 2, not 0', async () => {
    const { io, stderr } = captureIo(pipedStdin('   \n'));
    assert.equal(await main(['plan-check'], io), EXIT.ERROR);
    assert.match(stderr(), /empty/);
  });

  test('a missing file exits 2', async () => {
    const { io, stderr } = captureIo();
    assert.equal(await main(['plan-check', '--file', join(tmpdir(), 'no-such-plan-a11y.md')], io), EXIT.ERROR);
    assert.match(stderr(), /could not read plan file/);
  });

  test('--file and --text together exit 2', async () => {
    const { io } = captureIo();
    assert.equal(await main(['plan-check', '--file', 'a.md', '--text', UI_PLAN], io), EXIT.ERROR);
  });

  test('usage lists plan-check', async () => {
    const { io, stdout } = captureIo();
    await main(['--help'], io);
    assert.match(stdout(), /a11y-loop plan-check --file plan\.md/);
    assert.match(stdout(), /PLAN-CHECK OPTIONS/);
  });
});

describe('readStream', () => {
  test('gives up on an open, silent stream instead of hanging', async () => {
    const stream = new PassThrough();
    const started = Date.now();
    await assert.rejects(readStream(stream, 50), /stayed open with no data/);
    assert.ok(Date.now() - started < 2000);
    assert.equal(stream.destroyed, true);
  });

  test('reads a stream that arrives in chunks', async () => {
    const stream = new PassThrough();
    const pending = readStream(stream, 500);
    stream.write('first ');
    setTimeout(() => stream.end('second'), 20);
    assert.equal(await pending, 'first second');
  });
});

describe('planCheckResult', () => {
  test('has no template on a pass', () => {
    assert.equal(planCheckResult(checkPlan(BACKEND_PLAN), '--text').template, null);
  });
});
