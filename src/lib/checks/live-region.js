/**
 * Status messages (SC 4.1.3 Status Messages, Level AA, WCAG 2.1).
 *
 * A status message is text that appears in response to something the user did
 * ("Saved", "3 results", "Added to cart", "Enter a valid email") without focus
 * moving to it. A sighted user sees it; a screen reader user hears it only if
 * it is inside a live region (aria-live, role="status", role="alert",
 * role="log", <output>) that was already in the page when the text arrived.
 * Two checks, both driven by what an --interact state's action changed:
 *
 *  - status-message-not-announced: text appeared after the action, outside any
 *    live region that existed before it, and focus did not go to it (nor to a
 *    control that names it with aria-describedby or aria-errormessage). A
 *    violation only when every confidence signal is present: the text is short,
 *    it reads like a status ("saved", "error", "required", "3 results"), and it
 *    appeared next to the control the state activated. Anything weaker is
 *    needsReview, because new text is also what a disclosure, a tab panel or a
 *    new view looks like, and only a human can tell the two apart for sure.
 *  - live-region-injected-late: a live region was inserted into the page
 *    already holding its text, in the same mutation batch. Assistive technology
 *    announces changes to a live region it already knows about, so a region
 *    that arrives full is often read out by nobody. Always needsReview: support
 *    varies by browser and screen reader (role="alert" in particular is often
 *    announced on insertion), and the region does carry the right role, so
 *    whether this is a failure is a question for a test with a screen reader.
 *
 * What is never reported as a status message:
 *  - text inside a dialog that opened during the state (the dialog checks own
 *    that, and moving focus into the dialog is how it is announced);
 *  - text the user asked to see: inside an element some aria-expanded="true"
 *    control names with aria-controls, the activated control's own disclosed
 *    sibling, a menu, listbox, tab panel, tooltip, open <details> or popover;
 *  - large content: anything with a heading, a landmark, a table or two or more
 *    controls in it, or more than LARGE_TEXT characters of new text;
 *  - anything at all when the state changed the route: a new view is not a
 *    status message, and route-change-focus-lost is the check for it.
 */

import { makeFinding, SEVERITY } from '../finding.js';
import { OWN_CHECK_SC } from '../wcag-map.js';

export const NOT_ANNOUNCED = 'status-message-not-announced';
export const INJECTED_LATE = 'live-region-injected-late';

/** New text longer than this is content, not a status message. */
export const LARGE_TEXT = 250;
/** A status message short enough to raise confidence. */
export const SHORT_TEXT = 150;

export const LIVE_SELECTOR =
  '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"], output';

/** Wording that reads like a status message, in English. */
export const STATUS_WORDS =
  /\b(saved|success|successful(ly)?|succeeded|error|errors|invalid|required|failed|failure|added|removed|deleted|updated|sent|copied|submitted|subscribed|thank(s| you)|results?|items?|matches|loading|done|complete(d)?|must|cannot|can't|(please )?(enter|choose|select|provide) (a|an|your)|not found|no matches|try again)\b/i;

/** Is this short text plausibly a status message? */
export function readsLikeStatus(text) {
  const t = String(text ?? '').trim();
  if (!t) return false;
  if (/^\d+$/.test(t)) return true; // a count badge: "3"
  return STATUS_WORDS.test(t);
}

/**
 * Snapshot every text node and every live region, and start watching for live
 * regions inserted with their content. Call immediately before the --interact
 * state runs, after armStateRecorder.
 *
 * @param {import('playwright').Page} page
 */
export async function armLiveRegions(page) {
  await page.evaluate((liveSelector) => {
    const helpers = window.__a11yLoop;
    const shown = (el) =>
      Boolean(el) &&
      (typeof el.checkVisibility === 'function'
        ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
        : helpers.isRendered(el));
    const textBefore = new Map();
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    let count = 0;
    for (let node = walker.nextNode(); node && count < 20000; node = walker.nextNode(), count++) {
      if (!node.data.trim()) continue;
      textBefore.set(node, { data: node.data, shown: shown(node.parentElement) });
    }
    const regions = new Set(document.querySelectorAll(liveSelector));
    const rec = {
      token: window.__a11yLoopPageToken,
      textBefore,
      regions,
      regionsEmptyOnInsert: new Set(),
      late: [],
      dialogsOpenBefore: new Set(
        Array.from(document.querySelectorAll(helpers.dialogRoles)).filter((el) => helpers.dialogIsOpen(el)),
      ),
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1 || !node.isConnected) continue;
          const found = [];
          if (node.matches(liveSelector)) found.push(node);
          found.push(...node.querySelectorAll(liveSelector));
          for (const region of found) {
            if (rec.regions.has(region) || rec.regionsEmptyOnInsert.has(region)) continue;
            if (rec.late.some((entry) => entry.el === region)) continue;
            const text = (region.textContent || '').replace(/\s+/g, ' ').trim();
            if (text) {
              rec.late.push({
                el: region,
                path: helpers.cssPath(region),
                html: helpers.shortHtml(region),
                text: text.slice(0, 120),
                role: region.getAttribute('role') || (region.tagName === 'OUTPUT' ? 'status' : null),
                live: region.getAttribute('aria-live'),
              });
            } else {
              rec.regionsEmptyOnInsert.add(region);
            }
          }
        }
      }
    });
    observer.observe(document, { subtree: true, childList: true });
    window.__a11yLoopLive = rec;
  }, LIVE_SELECTOR);
}

/**
 * Everything the action made appear, with the signals the verdict needs.
 * Read-only; call straight after the state returns, before anything moves
 * focus.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{armed:boolean, candidates:Array, late:Array}>}
 */
export async function surveyLiveRegions(page) {
  return page.evaluate(
    ({ liveSelector, largeText }) => {
      const rec = window.__a11yLoopLive;
      if (!rec || rec.token !== window.__a11yLoopPageToken) return { armed: false, candidates: [], late: [] };
      const helpers = window.__a11yLoop;
      const shown = (el) =>
        Boolean(el) &&
        (typeof el.checkVisibility === 'function'
          ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
          : helpers.isRendered(el));
      const active = document.activeElement;
      const focusOnBody = !active || active === document.body || active === document.documentElement;
      const activation = helpers.lastActivation();
      const activated = activation && activation.el.isConnected ? activation.el : null;

      const lateEls = new Set(rec.late.map((entry) => entry.el));
      const validRegion = (el) => rec.regions.has(el) || rec.regionsEmptyOnInsert.has(el);

      /** Inside a live region: announced (valid), reported elsewhere (late), or neither. */
      const regionOf = (el) => {
        let node = el;
        while (node && node.nodeType === 1) {
          if (node.matches(liveSelector)) return node;
          node = node.parentElement;
        }
        return null;
      };

      // 1. New or changed visible text, grouped by its block-level container.
      const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE']);
      const containers = new Map();
      const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
      let count = 0;
      for (let node = walker.nextNode(); node && count < 20000; node = walker.nextNode(), count++) {
        if (!node.data.trim()) continue;
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) continue;
        if (!shown(parent)) continue;
        const prev = rec.textBefore.get(node);
        if (prev && prev.shown && prev.data === node.data) continue;
        if (parent.closest('[aria-hidden="true"]')) continue;
        let block = parent;
        while (
          block.parentElement &&
          block !== document.body &&
          ['inline', 'contents'].includes(getComputedStyle(block).display)
        ) {
          block = block.parentElement;
        }
        if (!containers.has(block)) containers.set(block, []);
        containers.get(block).push(node.data);
      }
      // Merge a container into any other container that holds it.
      const blocks = [...containers.keys()];
      const roots = blocks.filter((b) => !blocks.some((other) => other !== b && other.contains(b)));
      const textOf = (root) =>
        blocks
          .filter((b) => root === b || root.contains(b))
          .flatMap((b) => containers.get(b))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

      const DISCLOSED =
        '[role="menu"], [role="menubar"], [role="listbox"], [role="tree"], [role="tooltip"], ' +
        '[role="tabpanel"], [role="grid"], details[open]';

      const referencedByFocus = (el) => {
        if (focusOnBody) return false;
        const ids = ['aria-describedby', 'aria-errormessage', 'aria-labelledby', 'aria-details']
          .map((name) => active.getAttribute(name) || '')
          .join(' ')
          .split(/\s+/)
          .filter(Boolean);
        return ids.some((id) => {
          const target = document.getElementById(id);
          return target && (el.contains(target) || target.contains(el));
        });
      };

      const disclosedByControl = (el) => {
        for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
          if (node.matches(DISCLOSED)) return true;
          try {
            if (node.matches(':popover-open')) return true;
          } catch {
            // :popover-open unsupported: nothing to match.
          }
          if (node.id) {
            const controls = document.querySelectorAll('[aria-expanded="true"][aria-controls]');
            for (const control of controls) {
              if ((control.getAttribute('aria-controls') || '').split(/\s+/).includes(node.id)) return true;
            }
          }
        }
        // A disclosure button with no aria-controls: its expanded content is
        // what follows it in the same parent.
        if (activated && activated.getAttribute('aria-expanded') === 'true' && activated.parentElement) {
          if (activated.parentElement.contains(el) && !el.contains(activated)) return true;
        }
        return false;
      };

      const inNewDialog = (el) => {
        const dialog = el.closest(helpers.dialogRoles);
        return Boolean(dialog && helpers.dialogIsOpen(dialog) && !rec.dialogsOpenBefore.has(dialog));
      };

      const isLarge = (el, text) => {
        if (text.length > largeText) return true;
        if (el.matches('h1, h2, h3, h4, h5, h6, [role="heading"], main, nav, header, footer, aside, section, form, table, [role="main"], [role="navigation"], [role="region"], [role="form"], [role="table"], [role="grid"]')) return true;
        if (el.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"], main, nav, table, form, [role="main"], [role="navigation"], [role="table"], [role="grid"]')) return true;
        const controls = el.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]');
        return controls.length >= 2;
      };

      // How far apart two elements are in the tree: steps from each up to
      // their lowest common ancestor.
      const distance = (a, b) => {
        const chain = [];
        for (let n = a; n; n = n.parentElement) chain.push(n);
        let up = 0;
        for (let n = b; n; n = n.parentElement, up++) {
          const i = chain.indexOf(n);
          if (i !== -1) return { fromA: i, fromB: up };
        }
        return { fromA: Infinity, fromB: Infinity };
      };

      const candidates = [];
      for (const root of roots) {
        const text = textOf(root);
        if (!text) continue;
        const region = regionOf(root);
        if (region && (validRegion(region) || lateEls.has(region))) continue;
        if (!focusOnBody && (root.contains(active) || active.contains(root))) continue;
        if (referencedByFocus(root)) continue;
        if (inNewDialog(root)) continue;
        if (disclosedByControl(root)) continue;
        if (isLarge(root, text)) continue;

        let near = false;
        if (activated) {
          const form = activated.form || activated.closest('form');
          if (form && form.contains(root)) near = true;
          const d = distance(root, activated);
          if (d.fromA <= 3 && d.fromB <= 4) near = true;
        }
        candidates.push({
          selector: helpers.cssPath(root),
          html: helpers.shortHtml(root),
          text: text.slice(0, 160),
          textLength: text.length,
          near,
          activatedPath: activated ? helpers.cssPath(activated) : null,
          focusMovedAway: !focusOnBody,
        });
      }

      // 2. Live regions that arrived holding their text, still in the page.
      const late = rec.late
        .filter((entry) => entry.el.isConnected)
        .filter((entry) => !inNewDialog(entry.el))
        .filter((entry) => focusOnBody || !(entry.el.contains(active) || active === entry.el))
        .map(({ el: _el, ...rest }) => rest);

      return { armed: true, candidates, late };
    },
    { liveSelector: LIVE_SELECTOR, largeText: LARGE_TEXT },
  );
}

/**
 * The verdict on one candidate. Pure.
 *
 * @param {{text:string, textLength:number, near:boolean}} candidate
 * @returns {'violation'|'needsReview'}
 */
export function judgeStatusCandidate(candidate) {
  const confident =
    candidate.textLength <= SHORT_TEXT && candidate.near && readsLikeStatus(candidate.text);
  return confident ? SEVERITY.VIOLATION : SEVERITY.NEEDS_REVIEW;
}

/**
 * @param {{armed:boolean, candidates:Array, late:Array}|null} observation
 * @param {{passes:string[], state:string|null, routeChanged?:boolean}} ctx
 */
export function liveRegionFindings(observation, ctx) {
  const { passes = [], state = null, routeChanged = false } = ctx ?? {};
  if (!observation?.armed || routeChanged) return [];
  const findings = [];

  for (const candidate of observation.candidates ?? []) {
    const severity = judgeStatusCandidate(candidate);
    const quoted = candidate.text.length > 80 ? `${candidate.text.slice(0, 80)}…` : candidate.text;
    findings.push(
      makeFinding({
        ruleId: NOT_ANNOUNCED,
        source: 'a11y-loop',
        severity,
        impact: 'serious',
        sc: OWN_CHECK_SC[NOT_ANNOUNCED],
        selector: candidate.selector,
        html: candidate.html,
        message:
          `After this state's action, "${quoted}" appeared outside any live region that was in the ` +
          'page beforehand, and focus did not move to it, so a screen reader user is not told. If ' +
          'it is a status message, put it in a container with role="status" (or role="alert" for ' +
          'an error) that is in the page before the text arrives, or link it from the field with ' +
          'aria-describedby and move focus to the field.' +
          (severity === SEVERITY.NEEDS_REVIEW
            ? ' This is needs-review: it is long, does not read like a status, or did not appear ' +
              'next to the control the state activated, so it may be content the user asked to see.'
            : ''),
        passes,
        state,
        data: {
          text: candidate.text,
          nearActivatedControl: candidate.near,
          activated: candidate.activatedPath,
        },
      }),
    );
  }

  for (const region of observation.late ?? []) {
    const kind = region.role ? `role="${region.role}"` : `aria-live="${region.live}"`;
    findings.push(
      makeFinding({
        ruleId: INJECTED_LATE,
        source: 'a11y-loop',
        severity: SEVERITY.NEEDS_REVIEW,
        impact: 'moderate',
        sc: OWN_CHECK_SC[INJECTED_LATE],
        selector: region.path,
        html: region.html,
        message:
          `A ${kind} region was added to the page already holding "${region.text}". Screen readers ` +
          'announce changes to a live region they already know about, so a region inserted with its ' +
          'text is often not read out at all. Keep the empty region in the page from the start and ' +
          'change only its text.' +
          (region.role === 'alert'
            ? ' role="alert" is often announced on insertion, but not by every browser and screen ' +
              'reader pair, so confirm with one.'
            : ' Confirm with a screen reader.'),
        passes,
        state,
        data: { text: region.text, role: region.role, ariaLive: region.live },
      }),
    );
  }
  return findings;
}
