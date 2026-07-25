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

  /** Is the element rendered and not hidden from everyone? */
  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  }

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

  window.__a11yLoop = {
    cssPath: cssPath,
    shortHtml: shortHtml,
    accessibleName: accessibleName,
    isVisible: isVisible,
    interactiveElements: interactiveElements,
    backdropColor: backdropColor,
  };
})();
`;
