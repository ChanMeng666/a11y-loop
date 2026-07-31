#!/usr/bin/env node
/**
 * PreToolUse gate on `ExitPlanMode`.
 *
 * The skill can tell an agent to think about accessibility while planning. It
 * cannot make it. This hook can: when a plan changes user interface work and
 * says nothing about accessibility, the plan does not get approved, and Claude
 * is handed the section it has to fill in before trying again.
 *
 * The gate checks that the question was asked. It cannot check that the answer
 * is any good — that is what `a11y-loop audit` and a human are for.
 *
 * Three properties matter more than catching everything:
 *
 *   1. **It never breaks planning.** Empty stdin, bad JSON, an unreadable state
 *      file, a bug in here — every failure path allows and exits 0.
 *   2. **It denies at most once per plan.** A hook that can deny the same plan
 *      twice can deny it forever. Plan text is hashed and a hash is only ever
 *      spent once; after that the same plan passes with the reminder demoted to
 *      `additionalContext`. There is a per-session cap on top of that, and an
 *      `A11Y_LOOP_PLAN_GATE=off` kill switch on top of that.
 *   3. **It defers, it does not allow.** ExitPlanMode normally asks the user to
 *      approve the plan. Returning `"allow"` would suppress that prompt and
 *      auto-accept the plan — a side effect nobody asked this hook for. The
 *      non-deny paths return `"defer"`, which is the normal permission flow.
 *
 * A false deny costs the user a round trip on a plan that was fine. A miss
 * costs nothing the skill was not already going to catch at generation time.
 * So the UI detector demands real evidence before it fires.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Deny a given plan hash at most once, and a given session at most this often. */
const MAX_DENIES_PER_SESSION = 3;

/** Hashes and session counters older than this are pruned on the next write. */
const STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Hard cap on retained hashes, so the file cannot grow without bound. */
const MAX_STATE_ENTRIES = 200;

/** Room to spare under the documented 10,000-character `additionalContext` cap. */
const MAX_REASON_CHARS = 8000;

const STATE_VERSION = 1;
const STATE_FILENAME = 'a11y-loop-plan-gate.json';

/** At least one STRONG signal, and this much total weight, before we call it UI. */
const UI_SCORE_THRESHOLD = 5;

/** How many of the seven items a plan needs before we treat it as having answered. */
const COVERAGE_THRESHOLD = 3;

/**
 * Unmistakably user-interface vocabulary. Deliberately excludes accessibility
 * words: whether a plan touches UI has to be established independently of
 * whether it mentions accessibility, or a plan that says "accessibility" once in
 * a backend context scores as UI and then gets denied for thin coverage.
 */
const STRONG_UI = [
  'react', 'vue', 'svelte', 'angular', 'astro', 'next.js', 'nuxt', 'remix',
  'jsx', 'tsx', '.tsx', '.jsx', '.vue', '.svelte', '.astro', '.html', '.css',
  'tailwind', 'css', 'scss', 'sass', 'stylesheet', 'styled-components',
  'css module', 'html', 'dom', 'frontend', 'front-end', 'storybook', 'shadcn',
  'material ui', 'chakra', 'bootstrap', 'design system', 'design token',
  'dark mode', 'light mode', 'responsive', 'viewport', 'breakpoint',
  'media query', 'user interface', 'ui component', 'component library',
  'landing page', 'web page', 'webpage', 'modal', 'dialog', 'dropdown',
  'navbar', 'nav bar', 'sidebar', 'tooltip', 'carousel', 'accordion',
  'breadcrumb', 'hero section', 'button', 'checkbox', 'radio button',
  'onclick', 'click handler', 'hover', 'animation', 'typography',
  'color scheme', 'palette', 'wireframe', 'mockup',
];

/** Words that lean UI but earn a living elsewhere — a database has tables too. */
const MEDIUM_UI = [
  'component', 'page', 'screen', 'form', 'menu', 'tab', 'table', 'chart',
  'dashboard', 'layout', 'style', 'color', 'colour', 'theme', 'widget', 'view',
  'panel', 'card', 'badge', 'toast', 'banner', 'spinner', 'skeleton', 'avatar',
  'grid', 'mobile', 'desktop', 'click', 'scroll', 'input', 'label',
  'placeholder', 'heading', 'font', 'icon', 'svg', 'image', 'link', 'header',
  'footer', 'toggle', 'switch', 'slider', 'pagination', 'filter', 'nav',
];

/** Evidence the plan is somewhere else entirely. */
const NON_UI = [
  'cli', 'command-line', 'command line', 'database migration',
  'schema migration', 'sql', 'postgres', 'postgresql', 'mysql', 'sqlite',
  'mongodb', 'redis', 'backend', 'back-end', 'server-side', 'api endpoint',
  'rest api', 'graphql', 'cron', 'scheduler', 'parser', 'lexer', 'tokenizer',
  'compiler', 'infrastructure', 'terraform', 'kubernetes', 'docker', 'ci/cd',
  'github action', 'webhook', 'message queue', 'worker', 'daemon', 'stdout',
  'stderr', 'exit code', 'shell script', 'npm package', 'lockfile',
  'environment variable', 'telemetry', 'rate limit', 'indexing', 'changelog',
];

const WEIGHTS = { strong: 3, medium: 1, nonUi: 2 };

/**
 * The shape the gate asks a plan to arrive in. Pasted verbatim into the deny
 * message so Claude does not have to reconstruct it from the skill.
 */
export const ACCESSIBILITY_TEMPLATE = `### Accessibility
- **Target:** WCAG 2.2 Level AA — <rationale / jurisdiction>
- **Per-component criteria:** <component> → <SC list> + <keyboard contract source>
- **Foreclosing decisions:** <none reviewed | list + alternatives>
- **Color tokens:** <pairs verified with contrast --fix, light + dark>
- **Structure:** <heading outline / landmarks / focus order>
- **Verification:** <states needing --interact | where the audit gate sits>
- **Manual budget:** <what automation cannot judge here>`;

/**
 * The seven items, each with a detector that only matches accessibility-specific
 * language. A generic word like "test" or "color" must never light one of these
 * up, or a plan with no accessibility content at all would score as covered.
 */
export const COVERAGE_ITEMS = [
  {
    key: 'target',
    label: 'Target',
    detect: /wcag\s*2\.\d|level\s+(?:a{1,3})\b|conformance\s+(?:target|level)|en\s*301\s*549|section\s*508/i,
  },
  {
    key: 'perComponent',
    label: 'Per-component criteria',
    detect: /per-component|\bsc\s*\d\.\d\.\d+|success criteri|acceptance criteri|keyboard contract|\bapg\b|aria authoring/i,
  },
  {
    key: 'foreclosing',
    label: 'Foreclosing decisions',
    detect: /foreclos|rules? out|single[- ]pointer|keyboard alternative|accessible alternative|pointer alternative|no alternative/i,
  },
  {
    key: 'colorTokens',
    label: 'Color tokens',
    detect: /contrast|4\.5\s*:\s*1|3\s*:\s*1|color token|colour token|oklch/i,
  },
  {
    key: 'structure',
    label: 'Structure',
    detect: /heading (?:outline|order|structure|level)|landmark|focus order|reading order|tab order|semantic (?:html|structure|markup)|skip link/i,
  },
  {
    key: 'verification',
    label: 'Verification',
    detect: /a11y-loop|axe-core|\baxe\b|--interact|re-audit|audit (?:gate|loop|pass)|accessibility (?:audit|test|check)|a11y (?:audit|test|check)/i,
  },
  {
    key: 'manualBudget',
    label: 'Manual budget',
    detect: /manual (?:test|review|check|budget|pass)|screen[- ]reader test|\bnvda\b|voiceover|\bjaws\b|talkback|human (?:review|confirm|judge)|not automat|cannot (?:be )?(?:automat|judge)|assistive technolog/i,
  },
];

/**
 * Product decisions that are cheap to change in a plan and expensive to change
 * in shipped code. Each one is a real WCAG obligation, cited as the criterion
 * rather than as a verdict.
 */
export const FORECLOSING_RISKS = [
  {
    id: 'dragging',
    detect: /drag(?:gable|ging|-and-drop| and drop| to reorder| to sort)?\b|sortable list|reorder by drag|kanban/i,
    note: 'drag-based reordering → SC 2.5.7 Dragging Movements (Level AA, WCAG 2.2) asks for a single-pointer alternative. Name it now (move up/down buttons, a position field, a cut-and-paste move) or drop the pattern.',
  },
  {
    id: 'hover',
    detect: /hover (?:menu|card|panel|reveal|state|to)|on hover|reveal on hover|hover-?triggered|mega ?menu/i,
    note: 'content that appears on hover → SC 1.4.13 Content on Hover or Focus (Level AA) requires it to be dismissible, hoverable and persistent. Decide the focus trigger and dismiss key here, not after the CSS exists.',
  },
  {
    id: 'infiniteScroll',
    detect: /infinite scroll|endless scroll|load more on scroll|auto-?load (?:more|as you scroll)|virtual(?:ised|ized) (?:list|scroll)/i,
    note: 'infinite scroll → keyboard and screen-reader users can be stranded above content that only appends on scroll, and anything below the feed becomes unreachable. Relates to SC 2.4.3 Focus Order (Level A). Decide the paginated or "load more" button path now.',
  },
  {
    id: 'canvas',
    detect: /\bcanvas\b|webgl|\bd3\b|three\.js|pixi|chart\.js|render(?:ed|ing)? to (?:a )?canvas/i,
    note: 'canvas or WebGL rendering → SC 1.1.1 Non-text Content (Level A). Pixels expose no accessible names or roles, so the text alternative (a data table, a summary, an SVG version) is part of the build, not a follow-up.',
  },
  {
    id: 'timing',
    detect: /countdown|time(?:-| )?out|session expir|auto-?(?:refresh|logout|dismiss)|expires in|\btimer\b|auto-?advanc/i,
    note: 'a time limit → SC 2.2.1 Timing Adjustable (Level A) requires the user be able to turn it off, adjust it, or extend it. Decide which of the three you are offering.',
  },
  {
    id: 'captcha',
    detect: /captcha|recaptcha|hcaptcha|human verification|bot check|prove you'?re human/i,
    note: 'CAPTCHA → SC 1.1.1 Non-text Content (Level A) needs alternatives in more than one modality, and SC 3.3.8 Accessible Authentication (Minimum) (Level AA, WCAG 2.2) rules out cognitive function tests in the auth path. A puzzle or transcription challenge fails 3.3.8.',
  },
  {
    id: 'autoplay',
    detect: /auto-?play|plays? automatically|auto-?rotat|auto-?scroll(?:ing)? carousel|background video|looping video/i,
    note: 'autoplay → SC 1.4.2 Audio Control (Level A) for anything audible past 3 seconds, and SC 2.2.2 Pause, Stop, Hide (Level A) for anything moving past 5 seconds. Both need a control that is reachable before the moving thing.',
  },
];

/** Accessibility vocabulary at its broadest — used only to spot a section anchor. */
const A11Y_ANCHOR = /accessib|a11y|\bwcag\b|\baria\b|screen reader|keyboard (?:navigation|access|contract)|assistive/i;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Match a literal term on token boundaries. `\b` is no use here because half the
 * terms start or end with `.`, `-` or `/` (`.tsx`, `front-end`, `ci/cd`).
 *
 * @param {string} term
 * @returns {RegExp}
 */
function termRegex(term) {
  return new RegExp(`(?<![a-z0-9])${escapeRe(term)}(?![a-z0-9])`, 'i');
}

const COMPILED = {
  strong: STRONG_UI.map((t) => [t, termRegex(t)]),
  medium: MEDIUM_UI.map((t) => [t, termRegex(t)]),
  nonUi: NON_UI.map((t) => [t, termRegex(t)]),
};

/**
 * Decide whether a plan changes user interface work.
 *
 * Requires at least one unambiguous signal on top of the score, so that a
 * backend plan mentioning "table" and "filter" and "view" cannot accumulate its
 * way past the threshold.
 *
 * @param {string} text
 * @returns {{touchesUi:boolean, uiScore:number, nonUiScore:number, strong:string[], medium:string[], nonUi:string[]}}
 */
export function detectUi(text) {
  const hit = (pairs) => pairs.filter(([, re]) => re.test(text)).map(([term]) => term);
  const strong = hit(COMPILED.strong);
  const medium = hit(COMPILED.medium);
  const nonUi = hit(COMPILED.nonUi);

  const uiScore = strong.length * WEIGHTS.strong + medium.length * WEIGHTS.medium;
  const nonUiScore = nonUi.length * WEIGHTS.nonUi;

  return {
    touchesUi: strong.length > 0 && uiScore >= UI_SCORE_THRESHOLD && uiScore > nonUiScore,
    uiScore,
    nonUiScore,
    strong,
    medium,
    nonUi,
  };
}

/**
 * Score a plan against the seven items. Tolerant by design: any heading spelling
 * counts, partial coverage counts, and prose that never uses the template's
 * wording still counts as long as it says something accessibility-specific.
 *
 * @param {string} text
 * @returns {{hasSection:boolean, present:string[], missing:{key:string,label:string}[], covered:boolean}}
 */
export function assessAccessibility(text) {
  const hasSection = /^\s{0,3}(?:#{1,6}\s*|\*\*\s*|\d+[.)]\s*)?(?:accessibility|a11y|wcag)\b.{0,40}$/im.test(text);

  const present = [];
  const missing = [];
  for (const item of COVERAGE_ITEMS) {
    if (item.detect.test(text)) present.push(item.key);
    else missing.push({ key: item.key, label: item.label });
  }

  return { hasSection, present, missing, covered: present.length >= COVERAGE_THRESHOLD };
}

/**
 * @param {string} text
 * @returns {{id:string, note:string}[]}
 */
export function detectForeclosingRisks(text) {
  return FORECLOSING_RISKS.filter((r) => r.detect.test(text)).map(({ id, note }) => ({ id, note }));
}

/**
 * @param {string} text
 * @returns {string} 64 hex characters
 */
export function planHash(text) {
  return createHash('sha256').update(text.trim().replace(/\s+/g, ' '), 'utf8').digest('hex');
}

/**
 * @param {{missing:{label:string}[], hasSection:boolean, risks:{note:string}[], repeat:boolean}} opts
 * @returns {string}
 */
export function buildReason({ missing, hasSection, risks, repeat }) {
  const lines = [];

  lines.push(
    repeat
      ? 'a11y-loop plan gate (reminder only — this plan has already been through the gate once):'
      : 'a11y-loop plan gate: this plan changes user interface work, and its accessibility content is thin or absent.',
  );
  lines.push('');
  lines.push(
    hasSection
      ? 'There is an accessibility heading, but most of the seven decisions under it are unanswered.'
      : 'There is no accessibility section in this plan.',
  );
  lines.push(
    'These are plan-time decisions because they are cheap now and a rewrite later. Add this section, fill each line from what this plan actually builds, and call ExitPlanMode again.',
  );
  lines.push('');
  lines.push(ACCESSIBILITY_TEMPLATE);

  if (missing.length) {
    lines.push('');
    lines.push(`Unanswered here: ${missing.map((m) => m.label).join(', ')}.`);
  }

  if (risks.length) {
    lines.push('');
    lines.push('Decisions already in this plan that are hard to walk back once built:');
    for (const r of risks) lines.push(`- ${r.note}`);
  }

  lines.push('');
  lines.push(
    'This gate checks that the question was asked. It is not a review of the answer and not a statement about the conformance of anything you build — `a11y-loop audit` and a human reviewer are still the verification step. Turn the gate off with A11Y_LOOP_PLAN_GATE=off.',
  );

  const reason = lines.join('\n');
  return reason.length > MAX_REASON_CHARS ? `${reason.slice(0, MAX_REASON_CHARS - 3)}...` : reason;
}

/**
 * The whole decision, with no I/O in it.
 *
 * @param {{plan:string, seenBefore:boolean, denyCount:number}} input
 * @returns {{decision:'deny'|'defer', reason?:string, additionalContext?:string, spendHash:boolean, why:string}}
 */
export function evaluate({ plan, seenBefore, denyCount }) {
  const pass = (why) => ({ decision: 'defer', spendHash: false, why });

  if (!plan || plan.trim().length < 40) return pass('plan-too-short');

  const ui = detectUi(plan);
  if (!ui.touchesUi) return pass('not-ui');

  const coverage = assessAccessibility(plan);
  if (coverage.covered) return pass('already-covered');

  const risks = detectForeclosingRisks(plan);

  // Everything below here would be a deny on a first sighting. Past the loop
  // guard it becomes the same text, demoted to context Claude can read and
  // ignore, because a gate that can fire twice on one plan is a trap.
  if (seenBefore || denyCount >= MAX_DENIES_PER_SESSION) {
    return {
      decision: 'defer',
      spendHash: false,
      why: seenBefore ? 'repeat-plan' : 'session-cap',
      additionalContext: buildReason({
        missing: coverage.missing,
        hasSection: coverage.hasSection,
        risks,
        repeat: true,
      }),
    };
  }

  return {
    decision: 'deny',
    spendHash: true,
    why: 'ui-without-accessibility',
    reason: buildReason({
      missing: coverage.missing,
      hasSection: coverage.hasSection,
      risks,
      repeat: false,
    }),
  };
}

/**
 * `${CLAUDE_PLUGIN_DATA}` when Claude Code provides it, the temp directory when
 * it does not. Never the project directory: ExitPlanMode hooks run with cwd set
 * to the home directory (anthropics/claude-code#22343), so nothing here may
 * depend on a relative path.
 *
 * @returns {string}
 */
export function stateFilePath() {
  const dir = process.env.CLAUDE_PLUGIN_DATA?.trim() || tmpdir();
  return path.join(dir, STATE_FILENAME);
}

/** @returns {{version:number, plans:Record<string,number>, sessions:Record<string,{n:number,t:number}>}} */
function emptyState() {
  return { version: STATE_VERSION, plans: {}, sessions: {} };
}

function loadState(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!parsed || parsed.version !== STATE_VERSION) return emptyState();
    return {
      version: STATE_VERSION,
      plans: parsed.plans && typeof parsed.plans === 'object' ? parsed.plans : {},
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
    };
  } catch {
    return emptyState();
  }
}

/**
 * Drop anything past its TTL, then trim the newest entries down to the cap.
 *
 * @param {ReturnType<typeof emptyState>} state
 * @param {number} now
 */
function pruneState(state, now) {
  const fresh = Object.entries(state.plans).filter(([, t]) => Number.isFinite(t) && now - t < STATE_TTL_MS);
  fresh.sort((a, b) => b[1] - a[1]);
  state.plans = Object.fromEntries(fresh.slice(0, MAX_STATE_ENTRIES));

  state.sessions = Object.fromEntries(
    Object.entries(state.sessions)
      .filter(([, v]) => v && Number.isFinite(v.t) && now - v.t < STATE_TTL_MS)
      .slice(0, MAX_STATE_ENTRIES),
  );
}

function saveState(file, state) {
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(state), 'utf8');
  } catch {
    // A gate that cannot remember is still a gate; one that throws is not.
  }
}

/**
 * @param {NodeJS.ReadStream} stream
 * @returns {Promise<string>}
 */
function readStdin(stream) {
  return new Promise((resolve) => {
    if (stream.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      data += chunk;
    });
    stream.on('end', () => resolve(data));
    stream.on('error', () => resolve(''));
  });
}

/**
 * `plan` is optional on ExitPlanMode; `planFilePath` carries it instead when the
 * plan was written to disk.
 *
 * @param {any} toolInput
 * @returns {string}
 */
function planTextFrom(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return '';
  if (typeof toolInput.plan === 'string' && toolInput.plan.trim()) return toolInput.plan;
  if (typeof toolInput.planFilePath === 'string' && toolInput.planFilePath.trim()) {
    try {
      return readFileSync(toolInput.planFilePath, 'utf8');
    } catch {
      return '';
    }
  }
  return '';
}

function killSwitchOn() {
  const v = (process.env.A11Y_LOOP_PLAN_GATE ?? '').trim().toLowerCase();
  return v === 'off' || v === '0' || v === 'false' || v === 'disabled';
}

/**
 * Emit nothing and exit 0 — identical to a `defer`, and the quietest possible
 * outcome for the overwhelmingly common case where the gate has no opinion.
 */
function silent() {
  process.exitCode = 0;
}

function emit(payload) {
  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', ...payload } })}\n`,
  );
  process.exitCode = 0;
}

export async function main() {
  try {
    if (killSwitchOn()) return silent();

    const raw = await readStdin(process.stdin);
    if (!raw.trim()) return silent();

    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      return silent();
    }

    const plan = planTextFrom(input?.tool_input);
    if (!plan.trim()) return silent();

    const sessionId = typeof input?.session_id === 'string' ? input.session_id : 'unknown';
    const file = stateFilePath();
    const now = Date.now();
    const state = loadState(file);
    const hash = planHash(plan);

    const verdict = evaluate({
      plan,
      seenBefore: Object.hasOwn(state.plans, hash),
      denyCount: state.sessions[sessionId]?.n ?? 0,
    });

    if (verdict.spendHash) {
      state.plans[hash] = now;
      const seen = state.sessions[sessionId] ?? { n: 0, t: now };
      state.sessions[sessionId] = { n: seen.n + 1, t: now };
      pruneState(state, now);
      saveState(file, state);
    }

    if (verdict.decision === 'deny') {
      return emit({ permissionDecision: 'deny', permissionDecisionReason: verdict.reason });
    }
    if (verdict.additionalContext) {
      return emit({ permissionDecision: 'defer', additionalContext: verdict.additionalContext });
    }
    return silent();
  } catch {
    // Whatever it was, it is not worth blocking a plan over.
    return silent();
  }
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) await main();
