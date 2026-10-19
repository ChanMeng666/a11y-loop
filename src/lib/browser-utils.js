/**
 * Code injected into the audited page.
 *
 * `tabbable` is loaded from its UMD build (it is a browser library, not a Node
 * one) and the small helper set below gives every own check a consistent way to
 * name an element in a report.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

let tabbableSource = null;

/** The tabbable UMD bundle, read once. */
export function tabbableScript() {
  if (tabbableSource === null) {
    tabbableSource = readFileSync(require.resolve('tabbable/dist/index.umd.min.js'), 'utf8');
  }
  return tabbableSource;
}

/**
 * Helpers available in-page as `window.__a11yLoop`.
 * Kept as a source string so it can go through `addInitScript`, which runs
 * before page scripts on every navigation.
 */
export const HELPERS_SOURCE = `
(() => {
  if (window.__a11yLoop) return;

  /** A short, stable-ish CSS path for an element. */
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'html > body';
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 7) {
      let part = node.tagName.toLowerCase();
      if (node.id && /^[A-Za-z][-\\w]*$/.test(node.id)) {
        parts.unshift('#' + node.id);
        break;
      }
      const cls = (node.getAttribute('class') || '')
        .trim()
        .split(/\\s+/)
        .filter((c) => c && /^[A-Za-z][-\\w]*$/.test(c))
        .slice(0, 2);
      if (cls.length) part += '.' + cls.join('.');
      const parent = node.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) part += ':nth-of-type(' + (sameTag.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      node = parent;
      // Stop at the root so paths read like axe's ancestry selectors.
      if (node === document.documentElement) {
        parts.unshift('html');
        break;
      }
    }
    return parts.join(' > ');
  }

  /** Opening tag plus a little text — enough for an agent to locate the element. */
  function shortHtml(el, limit) {
    if (!el || el.nodeType !== 1) return '';
    const html = el.outerHTML || '';
    return html.length > (limit || 200) ? html.slice(0, limit || 200) : html;
  }

  /** Accessible name, best effort: aria-label, aria-labelledby, then text. */
  function accessibleName(el) {
    if (!el) return '';
    const label = el.getAttribute && el.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    const ids = el.getAttribute && el.getAttribute('aria-labelledby');
    if (ids) {
      const text = ids
        .split(/\\s+/)
        .map((id) => {
          const target = document.getElementById(id);
          return target ? (target.textContent || '').trim() : '';
        })
        .filter(Boolean)
        .join(' ');
      if (text) return text;
    }
    if (el.tagName === 'IMG') {
      const alt = el.getAttribute('alt');
      if (alt !== null) return alt.trim();
    }
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      if (el.labels && el.labels.length) {
        return Array.from(el.labels).map((l) => (l.textContent || '').trim()).join(' ');
      }
      const title = el.getAttribute('title');
      if (title) return title.trim();
      const value = el.getAttribute('value');
      if (el.type === 'submit' || el.type === 'button') return (value || '').trim();
    }
    return (el.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  /** Is the element actually rendered — regardless of who it is hidden from? */
  function isRendered(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  }

  /**
   * Is the element rendered AND exposed to assistive technology / keyboard
   * navigation? Most checks want this — an aria-hidden element is not
   * reachable, not announced, not a real target. Motion is the exception:
   * SC 2.2.2 is about what a SIGHTED user sees moving on screen, which has
   * nothing to do with the accessibility tree, so the reduced-motion check
   * uses isRendered directly rather than this.
   */
  function isVisible(el) {
    if (!isRendered(el)) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    // A native <dialog> opened with showModal() (or a fullscreen element)
    // makes everything outside itself genuinely inert: unclickable,
    // unfocusable, unreachable by Tab, whatever the DOM and CSS say. Without
    // this, every check that surveys "visible" elements would flood a report
    // with the rest of the page once a modal is open — not a real defect,
    // just this helper not knowing the platform already handled it.
    //
    // A PORTALLED dialog needs no equivalent clause here: it makes the rest of
    // the page unreachable by marking it aria-hidden, which the check above
    // already catches. modalDialogRoot() is what reads that shape.
    var modal = document.querySelector(':modal');
    if (modal && !modal.contains(el)) return false;
    return true;
  }

  // Record the CSS path of whatever was last clicked, for the whole life of
  // the page. This is how a dialog check identifies "the trigger" when
  // nothing declares it explicitly (no aria-controls / data-dialog-target):
  // a click is a far more reliable signal than "whatever has focus right
  // now", because a well-behaved dialog moves focus into itself as soon as
  // it opens, which overwrites the one clue that would otherwise identify
  // the trigger by the time anything gets a chance to look.
  document.addEventListener(
    'click',
    function (event) {
      window.__a11yLoopLastClick = cssPath(event.target);
    },
    true,
  );

  /** Elements a user can interact with — the population for target-size etc. */
  function interactiveElements() {
    const selector = [
      'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
      'summary', '[role="button"]', '[role="link"]', '[role="checkbox"]',
      '[role="radio"]', '[role="switch"]', '[role="tab"]', '[role="menuitem"]',
      '[role="option"]', '[onclick]', '[tabindex]',
    ].join(',');
    return Array.from(document.querySelectorAll(selector)).filter((el) => {
      if (!isVisible(el)) return false;
      if (el.disabled) return false;
      return true;
    });
  }

  /**
   * The first opaque background colour behind an element, walking ancestors.
   * Returns null when nothing determinable is found (a background image or
   * gradient), which callers must surface as needs-review rather than guess.
   */
  function backdropColor(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') return null;
      const bg = style.backgroundColor;
      const match = /rgba?\\(([^)]+)\\)/.exec(bg || '');
      if (match) {
        const parts = match[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
        const alpha = parts.length > 3 ? parts[3] : 1;
        if (alpha >= 1) return 'rgb(' + parts[0] + ', ' + parts[1] + ', ' + parts[2] + ')';
      }
      node = node.parentElement;
    }
    return 'rgb(255, 255, 255)';
  }

  /**
   * Has the page been taken out of reach around this element? That is how a
   * portalled dialog declares modality when it does not set aria-modal: the
   * library marks the dialog's body-level SIBLINGS aria-hidden (or inert) and
   * leaves its own portal alone. Base UI sets no aria-modal attribute at all
   * and relies on this entirely, which is the currently recommended pattern.
   */
  function outsideIsHidden(el) {
    var top = el;
    while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
    return Array.prototype.some.call(document.body.children, function (sibling) {
      if (sibling === top || sibling.contains(el)) return false;
      if (!isRendered(sibling)) return false;
      return sibling.getAttribute('aria-hidden') === 'true' || sibling.hasAttribute('inert');
    });
  }

  /**
   * The open modal dialog, or null. The :modal pseudo-class is the cheap
   * answer and the right one for a native <dialog> opened with showModal() —
   * but it is ONLY that. Every React popup library (Base UI, Radix, Headless
   * UI, floating-ui) ships a portalled <div role="dialog"> instead, which
   * :modal never matches, so anything relying on it alone silently treats an
   * open sheet as though no dialog were there at all.
   *
   * The portalled shape is recognised by what it actually does: a visible
   * dialog-role element that is itself exposed, and that has either declared
   * aria-modal="true" or hidden the rest of the page around itself. The LAST
   * such element in document order wins, because a portal appends to <body> —
   * so the most recently opened dialog is the topmost one.
   */
  function modalDialogRoot() {
    var native = document.querySelector(':modal');
    if (native) return native;

    var open = Array.prototype.filter.call(
      document.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"]'),
      function (el) {
        if (el.getAttribute('aria-modal') === 'false') return false;
        if (!isVisible(el)) return false;
        return el.getAttribute('aria-modal') === 'true' || outsideIsHidden(el);
      },
    );
    return open.length ? open[open.length - 1] : null;
  }

  /**
   * Where a forward Tab walk should be scoped: inside the open modal dialog
   * if there is one (everything outside it is unreachable while it is open),
   * otherwise the whole document. tabbable() has no idea a dialog is open —
   * it reads display and visibility, not aria-hidden, and knows nothing about
   * :modal — so callers must pass this as the container rather than always
   * walking document.body.
   */
  function tabbableRoot() {
    return modalDialogRoot() || document.body;
  }

  /** The CSS path of whatever was last clicked, or null if nothing was. */
  function lastClickSelector() {
    return window.__a11yLoopLastClick || null;
  }

  // ---------------------------------------------------------------------------
  // Interaction history and the state recorder.
  //
  // An --interact state is a black box: a function that does things to the
  // page. Three checks need to know what it did (which control opened a
  // dialog, whether the route changed, what text appeared), so the page keeps
  // a short history of activations and focus moves from the moment it loads,
  // and armStateRecorder() starts watching dialogs open and close just before
  // the state runs. Nothing here changes the page; it only listens.
  // ---------------------------------------------------------------------------

  /** Once per document: a full load gets a new token, a client-side route keeps it. */
  window.__a11yLoopPageToken = Math.random().toString(36).slice(2);

  var HISTORY_CAP = 8;
  var activations = [];
  var focusHistory = [];
  var routeLog = [];

  /** The element a user would say they activated: the control, not the span inside it. */
  function controlFor(el) {
    if (!el || el.nodeType !== 1) return null;
    var control = el.closest(
      'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], ' +
        '[role="menuitem"], [role="tab"], [tabindex]',
    );
    return control || el;
  }

  function remember(list, el) {
    if (!el || el.nodeType !== 1) return;
    if (list.length && list[list.length - 1].el === el) return;
    list.push({ el: el, path: cssPath(el), html: shortHtml(el) });
    if (list.length > HISTORY_CAP) list.shift();
  }

  // Window, capture phase, registered before any page script: these run before
  // the page's own handlers, so an activation is on record before whatever it
  // triggers (a dialog opening, a route changing) has happened. pointerdown is
  // here because some menus open on it rather than on click.
  // Each one also freezes the focus snapshot of any dialog that closed since
  // the previous activation (see settleClosed): whatever the user does next is
  // not the page's doing, so it must not change the verdict on that close.
  window.addEventListener('pointerdown', function (event) { freezeClosed(); remember(activations, controlFor(event.target)); }, true);
  window.addEventListener('click', function (event) { freezeClosed(); remember(activations, controlFor(event.target)); }, true);
  window.addEventListener(
    'keydown',
    function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      freezeClosed();
      var active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement) remember(activations, active);
    },
    true,
  );
  document.addEventListener('focusin', function (event) { remember(focusHistory, event.target); }, true);

  /** A client-side route change, with what had focus at that moment. */
  function noteRoute(kind) {
    var active = document.activeElement;
    var focused = active && active !== document.body && active !== document.documentElement ? active : null;
    routeLog.push({
      kind: kind,
      href: location.href,
      focused: focused,
      focusedPath: focused ? cssPath(focused) : null,
      focusedHtml: focused ? shortHtml(focused) : null,
    });
    if (routeLog.length > 32) routeLog.shift();
  }
  ['pushState', 'replaceState'].forEach(function (name) {
    var original = History.prototype[name];
    if (typeof original !== 'function') return;
    History.prototype[name] = function () {
      var result = original.apply(this, arguments);
      try { noteRoute(name); } catch (e) { /* never break the page's router */ }
      return result;
    };
  });
  window.addEventListener('hashchange', function () { noteRoute('hashchange'); });
  window.addEventListener('popstate', function () { noteRoute('popstate'); });

  var DIALOG_ROLES = '[role="dialog"], [role="alertdialog"], dialog';

  /**
   * Is this dialog open, as far as assistive technology is concerned? Opacity
   * is deliberately not consulted: a dialog faded to opacity 0 is still in the
   * accessibility tree, and one fading in is already open.
   */
  function dialogIsOpen(el) {
    if (!el || !el.isConnected) return false;
    if (el.tagName === 'DIALOG' && !el.open) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    if (!el.getClientRects().length) return false;
    return getComputedStyle(el).visibility !== 'hidden';
  }

  var tracker = null;

  /**
   * How long a closed dialog's page gets to put focus somewhere real before the
   * close is judged. A library that restores focus in an animation frame, or
   * after the close transition, is not late in any way a user would notice.
   */
  var CLOSE_SETTLE_MS = 1000;

  /**
   * Where focus is, for a dialog that has just closed. It has landed only when
   * it is on a rendered element outside the closed dialog: focus still inside
   * a dialog that is now hidden is about to be fixed up to <body> by the
   * browser, so it is not an answer yet.
   */
  function sampleClosedFocus(record) {
    var active = document.activeElement;
    var landed =
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      !(record.el && record.el.isConnected && record.el.contains(active)) &&
      isRendered(active);
    record.focusLost = !landed;
    record.focusPath = landed ? cssPath(active) : null;
    var opener = record.opener;
    record.openerUsable = Boolean(
      opener &&
        opener.isConnected &&
        isVisible(opener) &&
        (!window.tabbable || window.tabbable.isFocusable(opener)),
    );
    return landed;
  }

  /**
   * Judge a close from a snapshot, not from wherever focus happens to be when
   * the state returns: a state that closes a dialog and then clicks plain text
   * moves focus to <body> itself, and that is not the dialog's doing. The
   * snapshot is retaken every 50 ms until focus lands or CLOSE_SETTLE_MS
   * passes, and frozen early by the next activation.
   */
  function settleClosed(record) {
    var started = performance.now();
    record.settled = false;
    (function tick() {
      if (record.settled) return;
      if (sampleClosedFocus(record) || performance.now() - started >= CLOSE_SETTLE_MS) {
        record.settled = true;
        return;
      }
      setTimeout(tick, 50);
    })();
  }

  function freezeClosed() {
    if (!tracker) return;
    tracker.closed.forEach(function (record) {
      if (record.settled) return;
      sampleClosedFocus(record);
      record.settled = true;
    });
  }

  /**
   * The control that opened this dialog: the most recent activation, failing
   * that the most recent focus, taken at the moment the dialog opened, that is
   * NOT inside the dialog itself.
   *
   * Taking it at open time is the fix for 0.3.x, which read the last click when
   * the probe ran and so took a dialog's own Submit for its trigger. The
   * inside-the-dialog filter matters for a different case: a dialog opened
   * again with no new activation outside it (from script, after its own Save
   * closed it), where the most recent activation is that Save button. See the
   * reopen-from-script state of fixture-dialog-submit-inside.html, which goes
   * red without the filter.
   */
  function pickOpener(dialog) {
    var lists = [activations, focusHistory];
    for (var l = 0; l < lists.length; l++) {
      for (var i = lists[l].length - 1; i >= 0; i--) {
        var entry = lists[l][i];
        if (!entry.el.isConnected || dialog.contains(entry.el)) continue;
        if (entry.el === document.body || entry.el === document.documentElement) continue;
        return entry;
      }
    }
    return null;
  }

  function scanDialogs() {
    if (!tracker) return;
    var nowOpen = [];
    document.querySelectorAll(DIALOG_ROLES).forEach(function (el) {
      if (dialogIsOpen(el)) nowOpen.push(el);
    });
    nowOpen.forEach(function (el) {
      if (tracker.open.has(el)) return;
      var opener = tracker.armed ? pickOpener(el) : null;
      tracker.open.set(el, {
        el: el,
        selector: cssPath(el),
        html: shortHtml(el),
        opener: opener ? opener.el : null,
        openerPath: opener ? opener.path : null,
        openerHtml: opener ? opener.html : null,
        preexisting: !tracker.armed,
      });
    });
    tracker.open.forEach(function (record, el) {
      if (nowOpen.indexOf(el) !== -1) return;
      tracker.open.delete(el);
      tracker.closed.push(record);
      settleClosed(record);
    });
  }

  /**
   * Start recording, immediately before an --interact state runs. Dialogs
   * already open now are recorded as pre-existing, with no opener: whatever the
   * state does next did not open them.
   */
  function armStateRecorder() {
    if (tracker) return;
    tracker = { open: new Map(), closed: [], armed: false, routeLogStart: routeLog.length };
    scanDialogs();
    tracker.armed = true;
    activations.length = 0;
    focusHistory.length = 0;
    var pending = false;
    var observer = new MutationObserver(function () {
      scanDialogs();
      // A dialog shown by a class toggle and then revealed by a transition is
      // checked again shortly after, so its opening is not missed.
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; scanDialogs(); }, 60);
    });
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open', 'class', 'style', 'hidden', 'aria-hidden', 'role'],
    });
  }

  /** The recorded opener of an open dialog, or null when the recorder cannot say. */
  function dialogOpener(dialog) {
    if (!tracker) return null;
    scanDialogs();
    var record = tracker.open.get(dialog);
    return record && record.opener ? record.opener : null;
  }

  /** The recorder's state, refreshed, or null before armStateRecorder() ran. */
  function recorder() {
    if (tracker) scanDialogs();
    return tracker;
  }

  function lastActivation() {
    return activations.length ? activations[activations.length - 1] : null;
  }

  window.__a11yLoop = {
    cssPath: cssPath,
    shortHtml: shortHtml,
    accessibleName: accessibleName,
    isRendered: isRendered,
    isVisible: isVisible,
    modalDialogRoot: modalDialogRoot,
    tabbableRoot: tabbableRoot,
    lastClickSelector: lastClickSelector,
    lastActivation: lastActivation,
    focusHistory: function () { return focusHistory.slice(); },
    routeLog: function () { return routeLog.slice(); },
    dialogIsOpen: dialogIsOpen,
    dialogRoles: DIALOG_ROLES,
    armStateRecorder: armStateRecorder,
    recorder: recorder,
    dialogOpener: dialogOpener,
    interactiveElements: interactiveElements,
    backdropColor: backdropColor,
  };
})();
`;
