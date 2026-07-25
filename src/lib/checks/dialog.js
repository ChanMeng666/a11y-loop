/**
 * Dialog behaviour and custom-control keyboard activation.
 *
 * These are the checks that need a driven browser rather than a DOM snapshot,
 * and they are where AI-generated UI fails most reliably: a `<div role="dialog">`
 * that renders correctly, traps nothing, ignores Escape, and drops focus back to
 * the top of the document when it closes.
 *
 * "A role is a promise" — `role="button"` commits to BOTH Enter and Space. A div
 * with only a click handler satisfies neither, and axe cannot tell, because
 * nothing about the markup is wrong.
 */

import { makeFinding, SEVERITY } from '../finding.js';

/** Tab presses used to probe a focus trap. */
export const TRAP_PROBE_STEPS = 12;

/**
 * @param {object} observation
 * @param {string} observation.selector
 * @param {string} observation.html
 * @param {boolean} observation.focusMovedIntoDialog
 * @param {boolean} observation.focusTrapped
 * @param {string|null} observation.escapedTo  selector focus escaped to, if any
 * @param {boolean|null} observation.escapeClosed
 * @param {boolean|null} observation.focusReturnedToTrigger
 * @param {string|null} observation.trigger
 * @param {{passes:string[], state:string|null}} ctx
 */
export function dialogFindings(observation, ctx) {
  if (!observation) return [];
  const { passes = [], state = null } = ctx ?? {};
  const findings = [];
  const base = {
    source: 'a11y-loop',
    selector: observation.selector,
    html: observation.html,
    passes,
    state,
  };

  if (observation.focusMovedIntoDialog === false) {
    findings.push(
      makeFinding({
        ...base,
        ruleId: 'dialog-initial-focus',
        severity: SEVERITY.VIOLATION,
        impact: 'serious',
        sc: '2.4.3',
        message:
          'When this dialog opened, focus stayed outside it. Move focus into the dialog on ' +
          'open — to the first interactive element, or to the dialog container itself.',
      }),
    );
  }

  if (observation.focusTrapped === false) {
    findings.push(
      makeFinding({
        ...base,
        ruleId: 'dialog-focus-not-trapped',
        severity: SEVERITY.VIOLATION,
        impact: 'serious',
        sc: '2.1.2',
        message:
          `Tabbing inside this dialog moved focus out of it (reached ${observation.escapedTo ?? 'content behind the dialog'}). ` +
          'A modal dialog must keep Tab and Shift+Tab within itself while it is open.',
        data: { escapedTo: observation.escapedTo ?? null },
      }),
    );
  }

  if (observation.escapeClosed === false) {
    findings.push(
      makeFinding({
        ...base,
        ruleId: 'dialog-escape-does-not-close',
        severity: SEVERITY.VIOLATION,
        impact: 'serious',
        sc: '2.1.1',
        message:
          'Pressing Escape did not close this dialog. Every modal dialog must be dismissible ' +
          'from the keyboard (ARIA APG Dialog (Modal) pattern).',
      }),
    );
  }

  if (observation.escapeClosed === true && observation.focusReturnedToTrigger === false) {
    findings.push(
      makeFinding({
        ...base,
        ruleId: 'dialog-focus-not-returned',
        severity: SEVERITY.VIOLATION,
        impact: 'serious',
        sc: '2.4.3',
        message:
          `The dialog closed but focus did not return to the control that opened it ` +
          `(${observation.trigger ?? 'unknown trigger'}). Keyboard users are dropped back to ` +
          'the top of the document and lose their place.',
        data: { trigger: observation.trigger ?? null },
      }),
    );
  }

  return findings;
}

/**
 * @param {Array<{selector:string, html:string, name:string, enterActivates:boolean, spaceActivates:boolean, nativeButton:boolean}>} controls
 * @param {{passes:string[], state:string|null}} ctx
 */
export function roleButtonFindings(controls = [], ctx) {
  const { passes = [], state = null } = ctx ?? {};
  const findings = [];
  for (const control of controls) {
    const missing = [];
    if (!control.enterActivates) missing.push('Enter');
    if (!control.spaceActivates) missing.push('Space');
    if (missing.length === 0) continue;

    findings.push(
      makeFinding({
        ruleId: 'role-button-keyboard-activation',
        source: 'a11y-loop',
        severity: SEVERITY.VIOLATION,
        impact: 'critical',
        sc: '2.1.1',
        selector: control.selector,
        html: control.html,
        message:
          `This element has role="button" but does not activate on ${missing.join(' or ')}. ` +
          'role="button" is a promise to behave like a button, which means responding to both ' +
          'Enter and Space. Use a real <button>, or add keydown handling for both keys.',
        passes,
        state,
        data: {
          enterActivates: control.enterActivates,
          spaceActivates: control.spaceActivates,
          accessibleName: control.name,
        },
      }),
    );
  }
  return findings;
}

const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], dialog[open]';

/** Is a dialog currently visible? Cheap enough to call on every pass. */
export async function hasVisibleDialog(page) {
  return page.evaluate((selector) => {
    const helpers = window.__a11yLoop;
    return Array.from(document.querySelectorAll(selector)).some((el) => helpers.isVisible(el));
  }, DIALOG_SELECTOR);
}

/**
 * Probe the first visible dialog: initial focus, focus trap, Escape, focus
 * return. This drives the keyboard and therefore changes page state, so the
 * caller must run it last in a pass.
 *
 * @param {import('playwright').Page} page
 * @param {{presumedTrigger?:string|null}} [opts]
 */
export async function surveyDialog(page, opts = {}) {
  const { presumedTrigger = null } = opts;

  const found = await page.evaluate(
    ({ selector, presumed }) => {
      const helpers = window.__a11yLoop;
      const dialog = Array.from(document.querySelectorAll(selector)).find((el) =>
        helpers.isVisible(el),
      );
      if (!dialog) return null;

      // Prefer an explicit relationship over the presumed trigger.
      let trigger = presumed;
      if (dialog.id) {
        const declared = document.querySelector(
          `[aria-controls="${dialog.id}"], [data-dialog-target="${dialog.id}"]`,
        );
        if (declared) trigger = helpers.cssPath(declared);
      }

      const active = document.activeElement;
      return {
        selector: helpers.cssPath(dialog),
        html: helpers.shortHtml(dialog),
        trigger,
        focusMovedIntoDialog: Boolean(active && dialog.contains(active)),
        initialFocus: active ? helpers.cssPath(active) : null,
      };
    },
    { selector: DIALOG_SELECTOR, presumed: presumedTrigger },
  );

  if (!found) return null;

  // Focus trap: Tab repeatedly and watch for focus leaving the dialog.
  let focusTrapped = true;
  let escapedTo = null;
  for (let i = 0; i < TRAP_PROBE_STEPS; i++) {
    await page.keyboard.press('Tab');
    const outside = await page.evaluate(
      ({ selector }) => {
        const helpers = window.__a11yLoop;
        const dialog = Array.from(document.querySelectorAll(selector)).find((el) =>
          helpers.isVisible(el),
        );
        const active = document.activeElement;
        if (!dialog || !active) return null;
        if (dialog.contains(active)) return null;
        if (active === document.body || active === document.documentElement) {
          return 'the browser UI / document root';
        }
        return helpers.cssPath(active);
      },
      { selector: DIALOG_SELECTOR },
    );
    if (outside) {
      focusTrapped = false;
      escapedTo = outside;
      break;
    }
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  const stillOpen = await hasVisibleDialog(page);
  const escapeClosed = !stillOpen;

  let focusReturnedToTrigger = null;
  if (escapeClosed && found.trigger) {
    const activeSelector = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return null;
      return window.__a11yLoop.cssPath(active);
    });
    focusReturnedToTrigger = activeSelector === found.trigger;
  }

  return { ...found, focusTrapped, escapedTo, escapeClosed, focusReturnedToTrigger };
}

/**
 * Test Enter and Space on every `role="button"` that is not a real button.
 * Activation is detected by watching for a `click` event: a native button fires
 * one on Enter and Space for free, a div with only an onclick handler fires
 * neither.
 *
 * @param {import('playwright').Page} page
 */
export async function surveyRoleButtons(page) {
  const controls = await page.evaluate(() => {
    const helpers = window.__a11yLoop;
    window.__a11yLoopClicks = [];
    if (!window.__a11yLoopClickListener) {
      window.__a11yLoopClickListener = (event) => {
        window.__a11yLoopClicks.push(helpers.cssPath(event.target));
      };
      document.addEventListener('click', window.__a11yLoopClickListener, true);
    }
    return Array.from(document.querySelectorAll('[role="button"]'))
      .filter((el) => helpers.isVisible(el) && el.tagName !== 'BUTTON')
      .slice(0, 20)
      .map((el) => ({
        selector: helpers.cssPath(el),
        html: helpers.shortHtml(el),
        name: helpers.accessibleName(el),
      }));
  });

  const results = [];
  for (const control of controls) {
    const activation = { enterActivates: false, spaceActivates: false };
    for (const [key, field] of [
      ['Enter', 'enterActivates'],
      [' ', 'spaceActivates'],
    ]) {
      const focused = await page.evaluate((selector) => {
        window.__a11yLoopClicks = [];
        const el = document.querySelector(selector);
        if (!el) return false;
        el.focus();
        return document.activeElement === el;
      }, control.selector);
      if (!focused) continue;
      await page.keyboard.press(key === ' ' ? 'Space' : key);
      await page.waitForTimeout(30);
      activation[field] = await page.evaluate(
        (selector) => (window.__a11yLoopClicks ?? []).includes(selector),
        control.selector,
      );
    }
    results.push({ ...control, ...activation, nativeButton: false });
  }
  return results;
}
