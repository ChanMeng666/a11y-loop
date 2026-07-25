/**
 * The audit engine: five rendering passes, own checks, interaction states.
 *
 * Engine choice is deliberate and documented in docs/research/tooling.md:
 * axe-core via @axe-core/playwright, Chromium only, one engine done well.
 * Pa11y is LGPL and pins a stale axe; Lighthouse's accessibility category is an
 * axe subset behind a gameable 0–100 score.
 *
 * The five passes cost almost nothing and roughly double real-world contrast
 * findings, because a single default-mode scan never sees dark-mode or
 * forced-colors failures.
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

import { HELPERS_SOURCE, tabbableScript } from './browser-utils.js';
import { makeFinding, dedupeFindings, SEVERITY } from './finding.js';
import { isBestPractice } from './wcag-map.js';
import { suggestColors } from './suggest-color.js';
import { resolveTarget } from './serve.js';

import { surveyKeyboard, keyboardFindings } from './checks/keyboard.js';
import { surveyFocusVisibility, focusVisibilityFindings } from './checks/focus-visible.js';
import { surveyTargets, targetSizeFindings } from './checks/target-size.js';
import { surveyAnimations, reducedMotionFindings } from './checks/reduced-motion.js';
import { surveyLinks, linkTextFindings } from './checks/link-text.js';
import { surveyReflow, reflowFindings, REFLOW_VIEWPORT } from './checks/reflow.js';
import {
  hasVisibleDialog,
  surveyDialog,
  dialogFindings,
  surveyRoleButtons,
  roleButtonFindings,
} from './checks/dialog.js';

export const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

/**
 * axe tags are NOT cumulative — every tag must be listed explicitly or coverage
 * silently drops. `best-practice` is included so those rules can be reported in
 * their own non-blocking bucket, and removed by --no-best-practice.
 */
export const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];

export const BEST_PRACTICE_TAG = 'best-practice';

/** The five rendering passes. */
export const PASSES = [
  { name: 'default', viewport: DEFAULT_VIEWPORT, context: {} },
  { name: 'dark', viewport: DEFAULT_VIEWPORT, context: { colorScheme: 'dark' } },
  { name: 'forced-colors', viewport: DEFAULT_VIEWPORT, context: { forcedColors: 'active' } },
  { name: 'reduced-motion', viewport: DEFAULT_VIEWPORT, context: { reducedMotion: 'reduce' } },
  { name: 'reflow', viewport: REFLOW_VIEWPORT, context: {} },
];

/** An error the CLI should report as a tool failure (exit 2), not a finding. */
export class ToolError extends Error {
  constructor(message, { hint } = {}) {
    super(message);
    this.name = 'ToolError';
    this.hint = hint ?? null;
  }
}

const MISSING_BROWSER_HINT = [
  'Install the browser a11y-loop needs:',
  '',
  '  npx playwright install chromium',
  '',
  'If you keep Playwright browsers outside the default location, set',
  'PLAYWRIGHT_BROWSERS_PATH to that directory both when installing and when running',
  'a11y-loop — a11y-loop honours it automatically when it is set. For example:',
  '',
  '  PLAYWRIGHT_BROWSERS_PATH=/path/to/playwright-browsers npx playwright install chromium',
].join('\n');

/** Launch Chromium, translating a missing install into an actionable message. */
export async function launchBrowser({ headed = false } = {}) {
  try {
    return await chromium.launch({ headless: !headed });
  } catch (error) {
    const message = String(error?.message ?? '');
    if (/Executable doesn't exist|Failed to launch|browserType\.launch/i.test(message)) {
      throw new ToolError('Chromium is not available to Playwright.', {
        hint: MISSING_BROWSER_HINT,
      });
    }
    throw error;
  }
}

/** `"4.5:1"` → 4.5 */
function parseExpectedRatio(value, fallback = 4.5) {
  const n = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Concrete colour suggestions for a contrast finding — the thing that closes the
 * loop for an agent. "3.8:1, fails" is not actionable; "#6B7280 → #4B5563
 * (3.8:1 → 7.1:1), or lighten the background to #F9FAFB" is.
 */
export function contrastSuggestionsForNode(node) {
  const data = node.any?.find((check) => check.data?.fgColor && check.data?.bgColor)?.data;
  if (!data) return undefined;
  const target = parseExpectedRatio(data.expectedContrastRatio);
  try {
    const result = suggestColors(data.fgColor, data.bgColor, { target });
    return result.suggestions.length ? result.suggestions : undefined;
  } catch {
    return undefined;
  }
}

const CONTRAST_RULES = new Set(['color-contrast', 'color-contrast-enhanced']);

/** Convert one axe result entry into a11y-loop findings. */
export function findingsFromAxeResult(result, { severity, passName, state }) {
  return result.nodes.map((node) => {
    // target-size findings are ALWAYS downgraded: axe ships the rule disabled
    // because of a documented false-positive trail with overlapping and
    // translucent targets.
    const effectiveSeverity =
      result.id === 'target-size' ? SEVERITY.NEEDS_REVIEW : severity;

    return makeFinding({
      ruleId: result.id,
      source: 'axe',
      severity: effectiveSeverity,
      impact: node.impact ?? result.impact ?? null,
      tags: result.tags ?? [],
      selector: node.ancestry ?? node.target,
      html: node.html,
      message: node.failureSummary
        ? `${result.help}. ${node.failureSummary.replace(/\s+/g, ' ')}`
        : result.help,
      helpUrl: result.helpUrl,
      suggestions: CONTRAST_RULES.has(result.id) ? contrastSuggestionsForNode(node) : undefined,
      passes: [passName],
      state,
    });
  });
}

/** Split axe output into our three buckets and flatten to findings. */
export function findingsFromAxeResults(axeResults, { passName, state = null }) {
  const findings = [];
  for (const violation of axeResults.violations ?? []) {
    const severity = isBestPractice(violation.tags ?? [])
      ? SEVERITY.BEST_PRACTICE
      : SEVERITY.VIOLATION;
    findings.push(...findingsFromAxeResult(violation, { severity, passName, state }));
  }
  for (const incomplete of axeResults.incomplete ?? []) {
    findings.push(
      ...findingsFromAxeResult(incomplete, {
        severity: SEVERITY.NEEDS_REVIEW,
        passName,
        state,
      }),
    );
  }
  return findings;
}

/** Count what is on the page, so the manual checklist can be specific. */
export async function surveyPageFacts(page) {
  return page.evaluate(() => {
    const count = (selector) => document.querySelectorAll(selector).length;
    let ariaAttributes = 0;
    for (const el of document.querySelectorAll('*')) {
      for (const attr of el.attributes) {
        if (attr.name === 'role' || attr.name.startsWith('aria-')) ariaAttributes += 1;
      }
    }
    let animations = 0;
    let stickyElements = 0;
    for (const el of document.querySelectorAll('*')) {
      const style = getComputedStyle(el);
      if (style.animationName && style.animationName !== 'none') animations += 1;
      if (style.position === 'sticky' || style.position === 'fixed') stickyElements += 1;
    }
    return {
      images: count('img, [role="img"], svg[aria-label], svg[role="img"]'),
      formFields: count('input:not([type="hidden"]), select, textarea'),
      links: count('a[href], [role="link"]'),
      headings: count('h1, h2, h3, h4, h5, h6, [role="heading"]'),
      videos: count('video'),
      audios: count('audio'),
      tables: count('table'),
      iframes: count('iframe'),
      dialogs: count('[role="dialog"], [role="alertdialog"], dialog'),
      buttons: count('button, [role="button"]'),
      ariaAttributes,
      animations,
      stickyElements,
      lang: document.documentElement.getAttribute('lang'),
      title: document.title,
    };
  });
}

/** Prepare a page: inject helpers and tabbable, then navigate. */
async function openPage(context, url) {
  const page = await context.newPage();
  await page.addInitScript({ content: tabbableScript() });
  await page.addInitScript({ content: HELPERS_SOURCE });
  await page.goto(url, { waitUntil: 'load' });
  // Let webfonts settle and any entrance animation finish, so contrast and
  // geometry are measured against what a user would actually see.
  await page.waitForTimeout(120);
  return page;
}

function buildAxe(page, { includeBestPractice }) {
  const tags = includeBestPractice ? [...WCAG_TAGS, BEST_PRACTICE_TAG] : [...WCAG_TAGS];
  return new AxeBuilder({ page }).options({
    runOnly: { type: 'tag', values: tags },
    resultTypes: ['violations', 'incomplete'],
    ancestry: true,
    // Tag filtering does not resurrect a disabled rule; target-size has to be
    // switched on by name. Its findings are always downgraded to needs-review.
    rules: { 'target-size': { enabled: true } },
  });
}

/**
 * Own checks that only make sense once, on a normally-rendered page.
 * Interaction-driven probes run last because they change page state.
 */
async function runDefaultPassChecks(page, ctx) {
  const findings = [];

  const keyboard = await surveyKeyboard(page);
  findings.push(...keyboardFindings(keyboard, ctx));

  const focus = await surveyFocusVisibility(page);
  findings.push(...focusVisibilityFindings(focus, ctx));

  const targets = await surveyTargets(page);
  findings.push(...targetSizeFindings(targets, ctx));

  const links = await surveyLinks(page);
  findings.push(...linkTextFindings(links, ctx));

  const roleButtons = await surveyRoleButtons(page);
  findings.push(...roleButtonFindings(roleButtons, ctx));

  if (await hasVisibleDialog(page)) {
    const dialog = await surveyDialog(page, { presumedTrigger: ctx.presumedTrigger ?? null });
    findings.push(...dialogFindings(dialog, ctx));
  }

  return findings;
}

/**
 * Run the audit.
 *
 * @param {object} input
 * @param {{type:'url'|'file'|'html', value:string}} input.target
 * @param {object} [input.options]
 * @param {boolean} [input.options.headed]
 * @param {boolean} [input.options.bestPractice]
 * @param {Record<string, (page:any) => Promise<void>>} [input.options.states]
 * @returns {Promise<{findings:Array, facts:object, tool:object, incompleteRuleIds:string[]}>}
 */
export async function runAudit({ target, options = {} }) {
  const { headed = false, bestPractice = true, states = {} } = options;

  const served = await resolveTarget(target);
  const browser = await launchBrowser({ headed });
  const findings = [];
  const passesRun = [];
  const statesRun = [];
  let facts = {};
  let browserVersion = 'unknown';
  let userAgent = null;

  try {
    browserVersion = browser.version();

    for (const pass of PASSES) {
      const context = await browser.newContext({ viewport: pass.viewport, ...pass.context });
      const page = await openPage(context, served.url);
      const ctx = { passes: [pass.name], state: null };

      try {
        const axeResults = await buildAxe(page, { includeBestPractice: bestPractice }).analyze();
        findings.push(...findingsFromAxeResults(axeResults, { passName: pass.name }));

        if (pass.name === 'default') {
          userAgent = await page.evaluate(() => navigator.userAgent);
          facts = await surveyPageFacts(page);
          findings.push(...(await runDefaultPassChecks(page, ctx)));
        }

        if (pass.name === 'reduced-motion') {
          const animations = await surveyAnimations(page);
          findings.push(...reducedMotionFindings(animations, ctx));
        }

        if (pass.name === 'reflow') {
          const overflow = await surveyReflow(page);
          findings.push(...reflowFindings(overflow, ctx));
        }

        passesRun.push(pass.name);
      } finally {
        await context.close();
      }
    }

    // --interact states: the "state coverage" pillar. Each state gets a fresh
    // page, so states never contaminate each other.
    //
    // Only findings the base page did NOT already have are reported for a state.
    // Otherwise every pre-existing issue would be repeated once per state, and a
    // page with five states would report six times its actual problems.
    const baseFingerprints = new Set(findings.map((f) => f.fingerprint));

    for (const [name, setup] of Object.entries(states)) {
      const context = await browser.newContext({ viewport: DEFAULT_VIEWPORT });
      const page = await openPage(context, served.url);
      const ctx = { passes: ['default'], state: name };
      try {
        await setup(page);
        await page.waitForTimeout(150);

        const presumedTrigger = await page.evaluate(() => {
          const active = document.activeElement;
          if (!active || active === document.body) return null;
          return window.__a11yLoop.cssPath(active);
        });

        const axeResults = await buildAxe(page, { includeBestPractice: bestPractice }).analyze();
        const stateFindings = [
          ...findingsFromAxeResults(axeResults, { passName: 'default', state: name }),
          ...(await runDefaultPassChecks(page, { ...ctx, presumedTrigger })),
        ];
        findings.push(...stateFindings.filter((f) => !baseFingerprints.has(f.fingerprint)));
        statesRun.push(name);
      } catch (error) {
        throw new ToolError(`The --interact state "${name}" threw: ${error.message}`, {
          hint: 'Each state is `async (page) => { … }` and receives a Playwright Page.',
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await served.close();
  }

  const deduped = dedupeFindings(findings);
  const incompleteRuleIds = [
    ...new Set(
      deduped
        .filter((f) => f.severity === SEVERITY.NEEDS_REVIEW && f.source === 'axe')
        .map((f) => f.ruleId),
    ),
  ];

  return {
    findings: deduped,
    facts,
    incompleteRuleIds,
    passesRun,
    statesRun,
    browserVersion,
    userAgent,
    url: served.url,
  };
}
