import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  detectUi,
  assessAccessibility,
  detectForeclosingRisks,
  planHash,
  evaluate,
  buildReason,
  isEntryPoint,
} from '../../plugin/hooks/plan-gate.mjs';

const GATE = fileURLToPath(new URL('../../plugin/hooks/plan-gate.mjs', import.meta.url));

/** A plan that is unmistakably UI and says nothing about accessibility. */
const UI_PLAN = `Build a React settings page. Add a modal dialog for role changes, a
members table with per-row actions, tabs across the top and a dark mode toggle.
Style everything with Tailwind CSS. The navbar gets a dropdown, and the invite
form needs checkbox inputs and a submit button.`;

/** A plan that lives entirely on the server. */
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

/** Run the gate as Claude Code runs it, with an isolated state directory. */
function runGate(payload, { env = {}, dataDir } = {}) {
  const stdout = execFileSync(process.execPath, [GATE], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PLUGIN_DATA: dataDir ?? mkdtempSync(path.join(tmpdir(), 'a11y-gate-')),
      A11Y_LOOP_PLAN_GATE: '',
      ...env,
    },
  });
  return stdout.trim() ? JSON.parse(stdout).hookSpecificOutput : null;
}

const hookInput = (plan, session = 'session-1') => ({
  session_id: session,
  hook_event_name: 'PreToolUse',
  tool_name: 'ExitPlanMode',
  tool_input: { plan },
});

describe('detectUi', () => {
  test('recognises a plan full of interface vocabulary', () => {
    assert.equal(detectUi(UI_PLAN).touchesUi, true);
  });

  test('leaves a backend plan alone', () => {
    assert.equal(detectUi(BACKEND_PLAN).touchesUi, false);
  });

  test('a backend plan borrowing UI-ish words does not accumulate past the threshold', () => {
    const plan = `Add a filter to the users table view. The worker reads from the
      message queue, writes to postgres, and the cron scheduler triggers the nightly
      indexing job. Log the exit code to stderr.`;
    assert.equal(detectUi(plan).touchesUi, false);
  });

  test('requires at least one unambiguous signal, not just weak ones', () => {
    const weak = 'Update the card, panel, badge, view, grid, label and input handling in the record layer.';
    assert.equal(detectUi(weak).strong.length, 0);
    assert.equal(detectUi(weak).touchesUi, false);
  });

  test('matches terms containing punctuation on token boundaries', () => {
    assert.ok(detectUi('Convert the .tsx files and add front-end routing.').strong.includes('.tsx'));
  });
});

describe('assessAccessibility', () => {
  test('a filled-in section covers well past the threshold', () => {
    const result = assessAccessibility(UI_PLAN + FULL_A11Y);
    assert.equal(result.hasSection, true);
    assert.equal(result.covered, true);
    assert.deepEqual(result.missing, []);
  });

  test('a bare plan covers nothing', () => {
    const result = assessAccessibility(UI_PLAN);
    assert.equal(result.hasSection, false);
    assert.equal(result.covered, false);
    assert.equal(result.missing.length, 7);
  });

  test('generic product words never light up a coverage item', () => {
    const plan = 'Test the color of the table and check the structure of the form before we verify it.';
    assert.equal(assessAccessibility(plan).present.length, 0);
  });

  test('accessibility prose counts even without the template headings', () => {
    const prose = `${UI_PLAN}\n\nWe are targeting WCAG 2.2 Level AA. Contrast pairs go
      through a11y-loop contrast in both themes, and we will run an a11y-loop audit
      on the modal-open state before merge.`;
    assert.equal(assessAccessibility(prose).covered, true);
  });

  test('an empty heading alone is not coverage', () => {
    const result = assessAccessibility(`${UI_PLAN}\n\n### Accessibility\n- TBD`);
    assert.equal(result.hasSection, true);
    assert.equal(result.covered, false);
  });
});

describe('detectForeclosingRisks', () => {
  const cases = [
    ['dragging', 'Users drag the cards to reorder their dashboard layout.'],
    ['hover', 'The category mega menu opens on hover.'],
    ['infiniteScroll', 'The activity feed uses infinite scroll.'],
    ['canvas', 'Spend charts render to canvas via chart.js.'],
    ['timing', 'Checkout holds the reservation behind a 10-minute countdown.'],
    ['captcha', 'Signup is protected by a captcha.'],
    ['autoplay', 'The hero has an autoplay background video.'],
  ];

  for (const [id, plan] of cases) {
    test(`flags ${id}`, () => {
      assert.ok(detectForeclosingRisks(plan).some((r) => r.id === id));
    });
  }

  test('cites the criterion rather than declaring a verdict', () => {
    const note = detectForeclosingRisks(cases[0][1])[0].note;
    assert.match(note, /SC 2\.5\.7/);
    assert.doesNotMatch(note, /compliant|guarantee|ensures/i);
  });

  test('a clean plan raises nothing', () => {
    assert.deepEqual(detectForeclosingRisks(BACKEND_PLAN), []);
  });

  // A plan that rules a pattern out was being told to plan an alternative for it.
  for (const [id, plan] of [
    ['dragging', '- **Foreclosing decisions:** none reviewed; no drag-only or hover-only controls.'],
    ['autoplay', 'The hero image is static. Do not use autoplay anywhere on the page.'],
    ['timing', 'Checkout works without a countdown.'],
    ['canvas', 'Charts are SVG, never canvas.'],
  ]) {
    test(`does not flag ${id} when the plan rules it out`, () => {
      assert.ok(!detectForeclosingRisks(plan).some((r) => r.id === id));
    });
  }

  test('a negation that belongs to another word does not hide the risk', () => {
    assert.ok(detectForeclosingRisks('Cards reorder by drag and drop, with no keyboard alternative for drag and drop yet.').some((r) => r.id === 'dragging'));
    assert.ok(detectForeclosingRisks('There is no keyboard alternative for drag and drop.').some((r) => r.id === 'dragging'));
  });

  test('one planned mention is enough even when another is negated', () => {
    assert.ok(detectForeclosingRisks('No autoplay in the header. The hero has an autoplay background video.').some((r) => r.id === 'autoplay'));
  });
});

describe('planHash', () => {
  test('ignores whitespace churn so a reformatted plan is the same plan', () => {
    assert.equal(planHash('a  b\n\nc'), planHash(' a b c '));
  });

  test('separates plans that differ in substance', () => {
    assert.notEqual(planHash(UI_PLAN), planHash(BACKEND_PLAN));
  });
});

describe('evaluate', () => {
  const base = { seenBefore: false, denyCount: 0 };

  test('denies UI work with no accessibility content', () => {
    const v = evaluate({ ...base, plan: UI_PLAN });
    assert.equal(v.decision, 'deny');
    assert.equal(v.spendHash, true);
  });

  test('makes no decision rather than allowing, so the user still approves the plan', () => {
    assert.equal(evaluate({ ...base, plan: BACKEND_PLAN }).decision, 'none');
  });

  test('passes a plan that already answered the question', () => {
    const v = evaluate({ ...base, plan: UI_PLAN + FULL_A11Y });
    assert.equal(v.decision, 'none');
    assert.equal(v.why, 'already-covered');
  });

  test('demotes to context on a second sighting of the same plan', () => {
    const v = evaluate({ ...base, plan: UI_PLAN, seenBefore: true });
    assert.equal(v.decision, 'none');
    assert.equal(v.why, 'repeat-plan');
    assert.ok(v.additionalContext);
    assert.equal(v.spendHash, false);
  });

  test('stops denying once the session cap is reached', () => {
    const v = evaluate({ ...base, plan: UI_PLAN, denyCount: 3 });
    assert.equal(v.decision, 'none');
    assert.equal(v.why, 'session-cap');
  });

  test('ignores a plan too short to judge', () => {
    assert.equal(evaluate({ ...base, plan: 'Fix the button.' }).why, 'plan-too-short');
  });
});

describe('buildReason', () => {
  const reason = buildReason({
    missing: [{ label: 'Target' }, { label: 'Structure' }],
    hasSection: false,
    risks: [{ note: 'drag-based reordering → SC 2.5.7' }],
    repeat: false,
  });

  test('hands over the section to fill in', () => {
    assert.match(reason, /### Accessibility/);
    assert.match(reason, /\*\*Target:\*\*/);
  });

  test('names what is unanswered and what is hard to walk back', () => {
    assert.match(reason, /Unanswered here: Target, Structure/);
    assert.match(reason, /SC 2\.5\.7/);
  });

  test('says what the gate is not', () => {
    assert.match(reason, /not a review of the answer/);
    assert.match(reason, /A11Y_LOOP_PLAN_GATE=off/);
  });

  test('obeys the honesty rules it exists to enforce', () => {
    assert.doesNotMatch(reason, /\bWCAG compliant|fully accessible|guarantees|ADA compliant/i);
  });
});

describe('the hook as Claude Code invokes it', () => {
  test('denies a UI plan and hands back the template', () => {
    const out = runGate(hookInput(UI_PLAN));
    assert.equal(out.hookEventName, 'PreToolUse');
    assert.equal(out.permissionDecision, 'deny');
    assert.match(out.permissionDecisionReason, /### Accessibility/);
  });

  test('denies a given plan only once', () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'a11y-gate-'));
    assert.equal(runGate(hookInput(UI_PLAN), { dataDir }).permissionDecision, 'deny');

    const second = runGate(hookInput(UI_PLAN), { dataDir });
    assert.equal(second.hookEventName, 'PreToolUse');
    assert.ok(second.additionalContext);
    // No decision key at all: defer is ignored interactively (and drops the
    // context with it), and allow would skip the user's plan-approval prompt.
    assert.equal(Object.hasOwn(second, 'permissionDecision'), false);
    assert.equal(Object.hasOwn(second, 'permissionDecisionReason'), false);
  });

  test('never returns allow or defer on any path', () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'a11y-gate-'));
    const runs = [
      runGate(hookInput(UI_PLAN), { dataDir }),
      runGate(hookInput(UI_PLAN), { dataDir }),
      runGate(hookInput(BACKEND_PLAN)),
      runGate(hookInput(UI_PLAN + FULL_A11Y)),
      runGate(''),
    ];
    for (const out of runs) {
      assert.notEqual(out?.permissionDecision, 'allow');
      assert.notEqual(out?.permissionDecision, 'defer');
    }
    for (const plan of [UI_PLAN, BACKEND_PLAN, UI_PLAN + FULL_A11Y]) {
      for (const seenBefore of [false, true]) {
        assert.ok(['deny', 'none'].includes(evaluate({ plan, seenBefore, denyCount: 0 }).decision));
      }
    }
  });

  test('says nothing about a backend plan', () => {
    assert.equal(runGate(hookInput(BACKEND_PLAN)), null);
  });

  test('says nothing when the plan already answered', () => {
    assert.equal(runGate(hookInput(UI_PLAN + FULL_A11Y)), null);
  });

  test('the kill switch silences it', () => {
    assert.equal(runGate(hookInput(UI_PLAN), { env: { A11Y_LOOP_PLAN_GATE: 'off' } }), null);
  });

  test('empty stdin is not an error', () => {
    assert.equal(runGate(''), null);
  });

  test('malformed JSON is not an error', () => {
    assert.equal(runGate('not json {{{'), null);
  });

  test('a payload with no plan is not an error', () => {
    assert.equal(runGate({ tool_name: 'ExitPlanMode', tool_input: {} }), null);
  });
});

describe('the hook runs when invoked through a link', () => {
  const REPO = path.resolve(path.dirname(GATE), '..');

  function viaLink(makeLink) {
    const dir = mkdtempSync(path.join(tmpdir(), 'a11y-gate-link-'));
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

  function verdictVia(entry) {
    const stdout = execFileSync(process.execPath, [entry], {
      input: JSON.stringify(hookInput(UI_PLAN)),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PLUGIN_DATA: mkdtempSync(path.join(tmpdir(), 'a11y-gate-')), A11Y_LOOP_PLAN_GATE: '' },
    });
    return stdout.trim() ? JSON.parse(stdout).hookSpecificOutput : null;
  }

  test('a file symlink to the hook still emits a verdict', (t) => {
    const l = viaLink((link) => [GATE, link, 'file']);
    if (l.skip) return t.skip(l.skip);
    try {
      assert.equal(verdictVia(l.link)?.permissionDecision, 'deny');
    } finally {
      l.cleanup();
    }
  });

  test('a directory junction or symlink to the checkout still emits a verdict', (t) => {
    const l = viaLink((link) => [REPO, link, 'junction']);
    if (l.skip) return t.skip(l.skip);
    try {
      assert.equal(verdictVia(path.join(l.link, 'hooks', 'plan-gate.mjs'))?.permissionDecision, 'deny');
    } finally {
      l.cleanup();
    }
  });

  test('isEntryPoint never throws and is false without an argv[1]', () => {
    assert.equal(isEntryPoint('file:///x.mjs', undefined), false);
    assert.equal(isEntryPoint('file:///x.mjs', '\u0000bad'), false);
    assert.equal(isEntryPoint(import.meta.url, fileURLToPath(import.meta.url)), true);
  });
});

describe('the hook without its shared logic', () => {
  /**
   * Copy the hook into a temp layout whose ./lib/plan-gate.mjs is missing,
   * or present but throwing at load, and run it on a plan it would deny.
   */
  function runDetached(libSource) {
    const root = mkdtempSync(path.join(tmpdir(), 'a11y-gate-nolib-'));
    try {
      mkdirSync(path.join(root, 'hooks', 'lib'), { recursive: true });
      copyFileSync(GATE, path.join(root, 'hooks', 'plan-gate.mjs'));
      if (libSource !== undefined) writeFileSync(path.join(root, 'hooks', 'lib', 'plan-gate.mjs'), libSource);
      return spawnSync(process.execPath, [path.join(root, 'hooks', 'plan-gate.mjs')], {
        input: JSON.stringify(hookInput(UI_PLAN)),
        encoding: 'utf8',
        timeout: 15_000,
        env: { ...process.env, CLAUDE_PLUGIN_DATA: path.join(root, 'data'), A11Y_LOOP_PLAN_GATE: '' },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  test('a missing hooks/lib/plan-gate.mjs exits 0 with no verdict', () => {
    const r = runDetached(undefined);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '');
    assert.match(r.stderr, /did not load/);
  });

  test('a hooks/lib/plan-gate.mjs that throws at load exits 0 with no verdict', () => {
    const r = runDetached("throw new Error('broken on purpose');\n");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '');
    assert.match(r.stderr, /broken on purpose/);
  });

  test('the same plan in the real layout is denied, so the cases above are not passing by accident', () => {
    assert.equal(runGate(hookInput(UI_PLAN))?.permissionDecision, 'deny');
  });
});
