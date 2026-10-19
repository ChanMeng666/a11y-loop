/**
 * Focus after a client-side route change (SC 2.4.3 Focus Order, Level A).
 *
 * A full page load puts focus back at the top of a fresh document, and a
 * screen reader announces the new title. A single-page app that swaps the view
 * in place gets neither for free. The two shapes this check reports are the
 * ones that leave a keyboard or screen reader user with nowhere to stand:
 *
 *  - focus was on a control inside the old view (a "View order" link in a
 *    list), the router removed that view, and focus fell to <body>;
 *  - focus was on a control that is still there, and something moved focus to
 *    <body> (a blur(), or focusing an element that cannot take focus) while the
 *    new view appeared.
 *
 * Either one is fine if the app announced the new view through a live region
 * that existed before the change, the way route announcers do.
 *
 * Deliberately out of scope, to stay conservative:
 *  - a real navigation (a full load resets focus by definition), detected by
 *    the page token the helpers set once per document;
 *  - an in-page anchor (#section whose target exists);
 *  - a route change driven from script with nothing focused or activated
 *    first: no user can do that, so there is no focus to have lost;
 *  - focus left on a persistent control (a nav link that survives the change).
 *    That is the default of most routers and a weaker experience than moving
 *    focus to the new heading, but it is not focus lost, and this check does
 *    not call it one.
 */

import { makeFinding, SEVERITY } from '../finding.js';
import { OWN_CHECK_SC } from '../wcag-map.js';

export const RULE_ID = 'route-change-focus-lost';

const LIVE_SELECTOR =
  '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"], output';

/**
 * Snapshot what the route check compares against. Call immediately before the
 * --interact state runs, after armStateRecorder.
 *
 * @param {import('playwright').Page} page
 */
export async function armRouteFocus(page) {
  await page.evaluate((liveSelector) => {
    const main = document.querySelector('main, [role="main"]');
    const regions = Array.from(document.querySelectorAll(liveSelector));
    window.__a11yLoopRoute = {
      token: window.__a11yLoopPageToken,
      href: location.href,
      logStart: window.__a11yLoop.routeLog().length,
      main,
      mainChildren: main ? Array.from(main.children) : [],
      regions,
      regionText: regions.map((el) => (el.textContent || '').trim()),
    };
  }, LIVE_SELECTOR);
}

/**
 * What happened to the route and to focus while the state ran. Read-only.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<object>}
 */
export async function surveyRouteFocus(page) {
  return page.evaluate(() => {
    const arm = window.__a11yLoopRoute;
    // No snapshot in this document: the state caused a full load, which
    // resets focus by definition. Out of scope.
    if (!arm || arm.token !== window.__a11yLoopPageToken) return { fullLoad: true, routeChanged: false };

    const helpers = window.__a11yLoop;
    const before = new URL(arm.href);
    const now = new URL(location.href);
    const pathChanged = before.pathname !== now.pathname || before.search !== now.search;
    let hashRoute = false;
    if (!pathChanged && before.hash !== now.hash) {
      // #section with a matching id is an in-page anchor, not a route.
      const id = decodeURIComponent(now.hash.slice(1));
      hashRoute = Boolean(now.hash.length > 1 && !document.getElementById(id) && !document.getElementsByName(id).length);
    }
    const urlChanged = pathChanged || hashRoute;

    const mainReplaced = Boolean(
      arm.main &&
        (!arm.main.isConnected ||
          (arm.mainChildren.length > 0 && arm.mainChildren.every((child) => !child.isConnected))),
    );

    const routeChanged = urlChanged || mainReplaced;
    if (!routeChanged) return { fullLoad: false, routeChanged: false };

    // What had focus when the route changed: the router's own pushState call
    // records it. Failing that (a view swap with no history entry), the last
    // control the state activated.
    const changes = helpers.routeLog().slice(arm.logStart).filter((entry) => entry.href !== arm.href);
    const atChange = changes.find((entry) => entry.focused) ?? null;
    const activation = helpers.lastActivation();
    const candidate = atChange
      ? { el: atChange.focused, path: atChange.focusedPath, html: atChange.focusedHtml }
      : activation
        ? { el: activation.el, path: activation.path, html: activation.html }
        : null;

    const active = document.activeElement;
    const focusOnBody = !active || active === document.body || active === document.documentElement;

    const announced = arm.regions.some(
      (el, i) => el.isConnected && (el.textContent || '').trim() && (el.textContent || '').trim() !== arm.regionText[i],
    );

    const mainNow = document.querySelector('main, [role="main"]');
    const heading = (mainNow || document.body).querySelector('h1, [role="heading"][aria-level="1"]');

    return {
      fullLoad: false,
      routeChanged: true,
      via: urlChanged ? 'url' : 'view-replaced',
      from: before.pathname + before.search + before.hash,
      to: now.pathname + now.search + now.hash,
      hadFocusTarget: Boolean(candidate),
      focusTargetPath: candidate ? candidate.path : null,
      focusTargetHtml: candidate ? candidate.html : null,
      focusTargetRemoved: Boolean(candidate && !candidate.el.isConnected),
      focusOnBody,
      activePath: focusOnBody ? null : helpers.cssPath(active),
      announced,
      newHeading: heading ? (heading.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) : null,
      mainSelector: mainNow ? helpers.cssPath(mainNow) : 'html > body',
    };
  });
}

/**
 * The verdict for one state's route observation. Pure.
 *
 * @returns {null | {severity:string, shape:'removed'|'reset'}}
 */
export function judgeRouteFocus(observation) {
  if (!observation || observation.fullLoad || !observation.routeChanged) return null;
  if (!observation.hadFocusTarget) return null;
  if (!observation.focusOnBody) return null;
  if (observation.announced) return null;
  // A changed URL is a route by any definition. A view swapped in place with
  // the URL unchanged is very likely one too, but it is also what a tab set or
  // a wizard step can look like, so it goes to a human.
  const severity = observation.via === 'url' ? SEVERITY.VIOLATION : SEVERITY.NEEDS_REVIEW;
  return { severity, shape: observation.focusTargetRemoved ? 'removed' : 'reset' };
}

/**
 * @param {object|null} observation from surveyRouteFocus
 * @param {{passes:string[], state:string|null}} ctx
 */
export function routeFocusFindings(observation, ctx) {
  const verdict = judgeRouteFocus(observation);
  if (!verdict) return [];
  const { passes = [], state = null } = ctx ?? {};
  const where =
    observation.via === 'url'
      ? `The route changed from ${observation.from} to ${observation.to} without a page load`
      : 'The main content was replaced without a page load';
  const what =
    verdict.shape === 'removed'
      ? `, the control that had focus (${observation.focusTargetPath}) was removed with the old view, and focus fell to the document body.`
      : `, and focus was moved off the control that had it (${observation.focusTargetPath}) to the document body.`;
  const fix =
    ' Keyboard users restart from the top of the page and screen reader users hear nothing about ' +
    'the new view. Move focus to the new view: its h1 (with tabindex="-1"), or the main region, ' +
    'or announce the change through a live region that is already in the page.';
  return [
    makeFinding({
      ruleId: RULE_ID,
      source: 'a11y-loop',
      severity: verdict.severity,
      impact: 'serious',
      sc: OWN_CHECK_SC[RULE_ID],
      selector: observation.focusTargetPath ?? observation.mainSelector,
      html: observation.focusTargetHtml ?? '',
      message: where + what + fix,
      passes,
      state,
      data: {
        via: observation.via,
        from: observation.from,
        to: observation.to,
        focusTargetRemoved: observation.focusTargetRemoved,
        newHeading: observation.newHeading,
      },
    }),
  ];
}
