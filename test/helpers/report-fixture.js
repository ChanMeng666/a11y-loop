/**
 * Report fixtures for formatter and diff tests.
 *
 * Built with the real `makeFinding` and `buildReport` so the fixtures cannot
 * drift from the shape the audit actually produces.
 */

import { makeFinding, SEVERITY } from '../../src/lib/finding.js';
import { buildReport } from '../../src/lib/format/json.js';
import { buildChecklist } from '../../src/lib/format/checklist.js';

export const TOOL = {
  name: 'a11y-loop',
  version: '0.1.0',
  axeCoreVersion: '4.12.1',
  browser: 'Chromium',
  browserVersion: '151.0.7922.34',
  viewport: { width: 1280, height: 720 },
  timestamp: '2026-07-26T00:00:00.000Z',
  passesRun: ['default', 'dark', 'forced-colors', 'reduced-motion', 'reflow'],
  statesRun: [],
};

export function emptyButtonFinding(overrides = {}) {
  return makeFinding({
    ruleId: 'button-name',
    source: 'axe',
    severity: SEVERITY.VIOLATION,
    impact: 'critical',
    tags: ['cat.name-role-value', 'wcag2a', 'wcag412'],
    selector: 'html > body > button',
    html: '<button class="cta"></button>',
    message: 'Buttons must have discernible text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.12/button-name',
    passes: ['default'],
    ...overrides,
  });
}

export function contrastFinding(overrides = {}) {
  return makeFinding({
    ruleId: 'color-contrast',
    source: 'axe',
    severity: SEVERITY.VIOLATION,
    impact: 'serious',
    tags: ['cat.color', 'wcag2aa', 'wcag143'],
    selector: 'html > body > p',
    html: '<p style="color:#999">low</p>',
    message: 'Element has insufficient color contrast of 2.84',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.12/color-contrast',
    suggestions: [
      {
        role: 'foreground',
        direction: 'darker',
        hex: '#767676',
        newRatio: 4.54,
        newRatioDisplay: '4.54',
      },
    ],
    passes: ['default', 'dark'],
    ...overrides,
  });
}

export function targetSizeFinding(overrides = {}) {
  return makeFinding({
    ruleId: 'target-size-min',
    source: 'a11y-loop',
    severity: SEVERITY.NEEDS_REVIEW,
    impact: 'moderate',
    sc: '2.5.8',
    selector: 'html > body > a',
    html: '<a href="/x">x</a>',
    message: 'Target is 16×16 CSS px, smaller than the 24×24 minimum.',
    passes: ['default'],
    ...overrides,
  });
}

export function bestPracticeFinding(overrides = {}) {
  return makeFinding({
    ruleId: 'region',
    source: 'axe',
    severity: SEVERITY.BEST_PRACTICE,
    impact: 'moderate',
    tags: ['cat.keyboard', 'best-practice'],
    selector: 'html > body > p',
    html: '<p>x</p>',
    message: 'All page content should be contained by landmarks',
    passes: ['default'],
    ...overrides,
  });
}

export function dialogFinding(overrides = {}) {
  return makeFinding({
    ruleId: 'dialog-focus-not-trapped',
    source: 'a11y-loop',
    severity: SEVERITY.VIOLATION,
    impact: 'serious',
    sc: '2.1.2',
    selector: '#dlg',
    html: '<div role="dialog">',
    message: 'Tabbing inside this dialog moved focus out of it.',
    passes: ['default'],
    state: 'dialog-open',
    ...overrides,
  });
}

/**
 * @param {{findings?:Array, facts?:object, statesRun?:string[], targetType?:string}} [opts]
 */
export function makeReport(opts = {}) {
  const {
    findings = [emptyButtonFinding(), contrastFinding(), targetSizeFinding(), bestPracticeFinding()],
    facts = { images: 1, formFields: 0, links: 1, headings: 1, ariaAttributes: 0 },
    statesRun = [],
    incompleteRuleIds = [],
    targetType = 'html',
  } = opts;

  return buildReport({
    tool: { ...TOOL, statesRun },
    target: { type: targetType, value: '<button></button>', servedAt: 'http://127.0.0.1:1234/' },
    findings,
    manualChecklist: buildChecklist({ facts, incompleteRuleIds, statesRun }),
    facts,
  });
}

/** A report with no findings at all. */
export function cleanReport() {
  return makeReport({ findings: [] });
}
