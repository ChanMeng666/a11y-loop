/**
 * The plan gate's decision, with no I/O, no state and no client in it.
 *
 * Two callers share this module and must agree byte for byte:
 *
 *   - `plugin/hooks/plan-gate.mjs`, the Claude Code PreToolUse hook on
 *     ExitPlanMode, which adds a loop guard, a per-session cap and a kill
 *     switch on top. It loads a copy of this file, `plugin/hooks/lib/plan-gate.mjs`,
 *     because an installed plugin gets only its own folder. Edit this file, then
 *     run `npm run sync-plugin`; `test/unit/plugin-sync.test.js` fails until you do.
 *     Keep it free of imports other than `node:` built-ins, or the copy breaks;
 *   - `a11y-loop plan-check`, the stateless CLI any agent or CI job can run.
 *
 * It answers two questions about a plan's text: does it change user interface
 * work, and does it carry accessibility content? It checks that the question
 * was asked. It cannot check that the answer is any good — that is what
 * `a11y-loop audit` and a human are for.
 *
 * A false fail costs a round trip on a plan that was fine. A miss costs nothing
 * the skill was not already going to catch at generation time. So the UI
 * detector demands real evidence before it fires.
 */

import { createHash } from 'node:crypto';

/** Plans shorter than this are not assessed at all. */
export const MIN_PLAN_CHARS = 40;

/** At least one STRONG signal, and this much total weight, before we call it UI. */
const UI_SCORE_THRESHOLD = 5;

/** How many of the seven items a plan needs before we treat it as having answered. */
export const COVERAGE_THRESHOLD = 3;

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
 * A negation that governs the words right after it: "no drag-only controls",
 * "do not use autoplay", "without a countdown". At most two words may sit
 * between it and the match, so "no keyboard alternative for drag and drop",
 * where the negation belongs to something else, still counts as dragging.
 */
const NEGATED_BEFORE = /\b(?:no|not|never|without|avoid(?:s|ing|ed)?|nor|don'?t|doesn'?t|won'?t)\b(?:\s+[\w'-]+){0,2}\s*$/i;

/**
 * Does the plan mention this risk as something it will build? A mention counts
 * unless every occurrence is directly negated.
 *
 * @param {RegExp} re
 * @param {string} text
 * @returns {boolean}
 */
function mentionedAsPlanned(re, text) {
  const all = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  for (const m of text.matchAll(all)) {
    if (!NEGATED_BEFORE.test(text.slice(Math.max(0, m.index - 60), m.index))) return true;
  }
  return false;
}

/**
 * @param {string} text
 * @returns {{id:string, note:string}[]}
 */
export function detectForeclosingRisks(text) {
  return FORECLOSING_RISKS.filter((r) => mentionedAsPlanned(r.detect, text)).map(({ id, note }) => ({ id, note }));
}

/**
 * @param {string} text
 * @returns {string} 64 hex characters
 */
export function planHash(text) {
  return createHash('sha256').update(text.trim().replace(/\s+/g, ' '), 'utf8').digest('hex');
}

/**
 * What SKILL.md §0 asks a UI plan to have decided, one line per coverage item,
 * keyed the same way. These are the questions; `COVERAGE_ITEMS` only detects
 * whether a plan's text attempts each one.
 */
export const PLAN_RULES = {
  target: 'Write the conformance target down (default WCAG 2.2 Level AA), with the jurisdiction or contract behind it.',
  perComponent: 'Give each UI component its success criteria and its keyboard contract (APG pattern) as plan items, not a trailing "accessibility pass".',
  foreclosing: 'Name the product decisions that foreclose accessibility (drag-only, hover-only, infinite scroll, canvas data, time limits, CAPTCHA, autoplay) and the alternative for each.',
  colorTokens: 'Run every intended color pair through `a11y-loop contrast <fg> <bg> --fix` in light and dark, and make the passing values the tokens.',
  structure: 'Decide the heading outline, landmarks, focus order, skip links and SPA route-change focus once, in the plan.',
  verification: 'List the states that need an `--interact` module and say where the audit gates sit (per component, before merge, in CI).',
  manualBudget: 'Budget the manual testing automation cannot do (screen reader, keyboard walk-through, human judgment).',
};

/**
 * The whole verdict on one plan's text: pure, stateless, deterministic.
 *
 * `verdict` is `'fail'` only for a plan that changes UI work and whose
 * accessibility content falls short of the coverage threshold. Every other
 * outcome — too short to assess, not UI work, already covered — is `'pass'`,
 * with `why` saying which.
 *
 * @param {string} text
 * @returns {{
 *   verdict: 'pass'|'fail',
 *   why: 'plan-too-short'|'not-ui'|'already-covered'|'ui-without-accessibility',
 *   isUiWork: boolean,
 *   hasA11yContent: boolean,
 *   hasSection: boolean,
 *   present: string[],
 *   missing: {key:string, label:string}[],
 *   risks: {id:string, note:string}[],
 *   ui: ReturnType<typeof detectUi>,
 * }}
 */
export function checkPlan(text) {
  const plan = typeof text === 'string' ? text : '';
  const ui = detectUi(plan);
  const coverage = assessAccessibility(plan);
  const risks = detectForeclosingRisks(plan);
  const base = {
    isUiWork: ui.touchesUi,
    hasA11yContent: coverage.covered,
    hasSection: coverage.hasSection,
    present: coverage.present,
    missing: coverage.missing,
    risks,
    ui,
  };

  if (plan.trim().length < MIN_PLAN_CHARS) return { verdict: 'pass', why: 'plan-too-short', ...base };
  if (!ui.touchesUi) return { verdict: 'pass', why: 'not-ui', ...base };
  if (coverage.covered) return { verdict: 'pass', why: 'already-covered', ...base };
  return { verdict: 'fail', why: 'ui-without-accessibility', ...base };
}
