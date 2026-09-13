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
 * How many consecutive presses may land outside the dialog on something no user
 * can act on before it stops counting as a wrap and starts counting as an escape.
 *
 * Not a fudge factor — it is the length of a real wrap, measured. A portalled
 * dialog wraps through a CHAIN: floating-ui (Base UI, Radix) renders a focus
 * guard beside the floating element and another pair at the edges of <body>, and
 * hands focus back an animation frame later, so a forward Tab off the end of the
 * sheet goes guard → body → back inside. Observed on a live Base UI sheet, three
 * runs: two of them spent two presses out (guard, then body) and one spent a
 * single press. Allowing exactly one press, as this check used to, therefore
 * reported a perfectly trapped dialog as broken about two runs in three — which
 * is what made the row look flaky rather than wrong.
 *
 * It stays small on purpose, and it only applies AFTER focus has been inside the
 * dialog at least once: presses spent outside before that are the probe finding
 * its way in from wherever the earlier surveys left focus, not a wrap. Landing on
 * a genuine, exposed element outside the dialog is an escape on the first press
 * either way, whatever this bound says.
 */
export const MAX_WRAP_TICKS = 3;

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
 * Snapshot the first visible dialog's identity and whether focus was moved
 * into it — BEFORE anything else has a chance to touch focus.
 *
 * This must be called immediately after whatever opened the dialog (a click,
 * or an --interact state's setup function), and before any other survey runs.
 * The keyboard and focus-visibility surveys each walk the page with real Tab
 * presses, which moves focus around; if "was focus moved into the dialog on
 * open" were checked afterwards, it would be answering a different question —
 * "where did those OTHER surveys leave focus" — and a page that sets initial
 * focus correctly would be reported as though it had not.
 *
 * @param {import('playwright').Page} page
 * @param {{presumedTrigger?:string|null}} [opts]
 * @returns {Promise<{selector:string, html:string, trigger:string|null, focusMovedIntoDialog:boolean, initialFocus:string|null}|null>}
 */
export async function captureDialogInitialState(page, opts = {}) {
  const { presumedTrigger = null } = opts;

  return page.evaluate(
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
        // Was this dialog MODAL at the moment it opened? Recorded now because
        // it is the only way to tell, later, between a dialog that never
        // trapped anything and one whose modal treatment was torn down while
        // the probe was running. See surveyDialog.
        modal: helpers.modalDialogRoot() === dialog,
        focusMovedIntoDialog: Boolean(active && dialog.contains(active)),
        initialFocus: active ? helpers.cssPath(active) : null,
      };
    },
    { selector: DIALOG_SELECTOR, presumed: presumedTrigger },
  );
}

/**
 * Let the page finish reacting to a key before reading where focus went.
 *
 * A focus trap built on requestAnimationFrame — floating-ui's enqueueFocus, and
 * so Base UI's and Radix's — hands focus back one frame after a guard receives
 * it, and cancels a pending hand-back when another arrives. Synthetic Tab
 * presses can be dispatched faster than a frame, which cancels the redirect over
 * and over and leaves focus parked outside the dialog: the probe outruns the
 * page and then reports the page for not keeping up. No keyboard user can press
 * Tab twice inside one frame, so waiting two frames does not weaken the check —
 * it stops it measuring itself.
 *
 * @param {import('playwright').Page} page
 */
async function settleFrames(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/**
 * Probe focus trap, Escape, and focus return, given a dialog snapshot already
 * captured by `captureDialogInitialState`. This drives the keyboard and
 * therefore changes page state (and, if Escape closes the dialog, closes it),
 * so the caller must run it last in a pass — but it must be handed the
 * initial-focus fact rather than re-deriving it, for the reason above.
 *
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof captureDialogInitialState>>} found
 */
export async function surveyDialog(page, found) {
  if (!found) return null;

  // The probe asks exactly one question: with focus INSIDE this dialog, can Tab
  // take it out? So it has to start inside. By the time it runs, three other
  // surveys have each walked the page with real Tab presses and left focus
  // wherever they happened to finish — and on a portalled dialog, focus sitting
  // outside is itself enough for the library's focus-out handling to begin
  // dismantling the modal treatment it put up. The probe would then walk a page
  // that is no longer behind a modal and report a working trap as broken.
  //
  // Measured on a live Base UI sheet, ten runs: without this, four began outside
  // the dialog and every one of those four reported the trap broken. With it,
  // ten of ten began inside and none did.
  const enteredDialog = await page.evaluate(
    ({ selector }) => {
      const helpers = window.__a11yLoop;
      const dialog = Array.from(document.querySelectorAll(selector)).find((el) =>
        helpers.isVisible(el),
      );
      if (!dialog) return false;
      if (dialog.contains(document.activeElement)) return true;
      const stops = window.tabbable ? window.tabbable.tabbable(dialog) : [];
      if (!stops.length) return false;
      stops[0].focus();
      return dialog.contains(document.activeElement);
    },
    { selector: DIALOG_SELECTOR },
  );

  // Focus trap: Tab repeatedly and watch for focus leaving the dialog.
  //
  // Every modal dialog spends one tick outside itself when it wraps, and the
  // shape of that tick depends on who implements the trap:
  //
  //  - Real Chromium, for a genuinely native <dialog> opened with showModal(),
  //    transiently moves document.activeElement to document.body for exactly
  //    one Tab press when wrapping past the dialog's last (or before its first)
  //    focusable descendant, then redirects back inside on the very next press.
  //    Body itself stays inert throughout, so nothing is reachable there.
  //  - A portalled <div role="dialog"> — Base UI, Radix, Headless UI, anything
  //    on floating-ui — wraps through a focus guard instead: a focusable span
  //    outside the dialog, hidden from assistive technology, whose whole job is
  //    to catch the wrap and hand focus back. Nothing is reachable there either.
  //
  // Treating either as an escape flags a correctly trapped dialog as broken,
  // and that is precisely what happened to portalled dialogs while this gate
  // asked `:modal` — which matches only the native case. It is a real failure
  // if focus lands outside the dialog on a genuine, exposed element, or if it
  // does not come back within MAX_WRAP_TICKS presses: a portalled dialog wraps
  // through a chain of those ticks, not a single one.

  // A dialog focus cannot be placed inside is a dialog whose trap this check
  // cannot judge, so it says so with null rather than guessing — dialogFindings
  // reports only on an explicit false.
  let focusTrapped = enteredDialog ? true : null;
  let escapedTo = null;
  let insideAtLeastOnce = false;
  let consecutiveWrapTicks = 0;
  let tornDownMidProbe = false;
  for (let i = 0; enteredDialog && i < TRAP_PROBE_STEPS; i++) {
    await page.keyboard.press('Tab');
    await settleFrames(page);
    const check = await page.evaluate(
      ({ selector }) => {
        const helpers = window.__a11yLoop;
        const dialog = Array.from(document.querySelectorAll(selector)).find((el) =>
          helpers.isVisible(el),
        );
        const active = document.activeElement;
        if (!dialog || !active) {
          return { inside: false, transient: false, label: null, stillModalRoot: false };
        }
        if (dialog.contains(active)) {
          return { inside: true, transient: false, label: null, stillModalRoot: true };
        }
        const isBodyOrRoot = active === document.body || active === document.documentElement;
        // A focus guard is an EMPTY element that is not exposed to assistive
        // technology — every library builds one the same way, as a bare
        // aria-hidden span with nothing in it. Emptiness is what separates it
        // from the page behind the dialog, which is also aria-hidden but is
        // full of real content: focus landing THERE is a trap that failed, and
        // must still be reported.
        const isFocusGuard =
          !isBodyOrRoot &&
          !helpers.isVisible(active) &&
          active.children.length === 0 &&
          !(active.textContent || '').trim();
        const stillModal =
          (typeof dialog.matches === 'function' && dialog.matches(':modal')) ||
          helpers.modalDialogRoot() === dialog;
        return {
          inside: false,
          transient: (isBodyOrRoot || isFocusGuard) && stillModal,
          stillModalRoot: helpers.modalDialogRoot() === dialog,
          label: isBodyOrRoot ? 'the browser UI / document root' : helpers.cssPath(active),
        };
      },
      { selector: DIALOG_SELECTOR },
    );

    if (check.inside) {
      insideAtLeastOnce = true;
      consecutiveWrapTicks = 0;
      continue;
    }
    if (check.transient && (!insideAtLeastOnce || consecutiveWrapTicks < MAX_WRAP_TICKS)) {
      if (insideAtLeastOnce) consecutiveWrapTicks += 1;
      continue;
    }
    // The dialog was modal when it opened and is not any more: the page took
    // the modal treatment down — the backdrop, the aria-hidden on everything
    // behind it — while this probe was running, usually because the sheet is
    // closing. Focus is free to walk the page because the page let it, not
    // because a trap failed. There is nothing to judge here, so judge nothing:
    // reporting a trap failure off a dialog that stopped being modal mid-probe
    // is how a correctly trapped sheet ends up accused about one run in seven.
    if (found.modal && !check.stillModalRoot) {
      tornDownMidProbe = true;
      break;
    }
    focusTrapped = false;
    escapedTo = check.label;
    break;
  }

  if (tornDownMidProbe) {
    return {
      ...found,
      focusTrapped: null,
      escapedTo: null,
      escapeClosed: null,
      focusReturnedToTrigger: null,
    };
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
