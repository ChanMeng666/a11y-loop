/**
 * "Nearest accessible color" suggester.
 *
 * No well-maintained library does this properly, so it is implemented here in
 * ~100 lines. The search runs on OKLCh **lightness** with hue and chroma held
 * fixed, which keeps suggestions recognisably part of the designer's palette —
 * an HSL search desaturates and hue-shifts badly.
 *
 * Both a LIGHTER and a DARKER candidate are returned for the foreground, plus
 * one background option. A loop that silently picks one direction will destroy
 * a brand palette, so the caller (agent or human) chooses.
 *
 * culori is used only for color-space conversion; all contrast math is ours.
 */

import { converter, clampChroma, formatHex } from 'culori';
import { parseColor, contrastRatio, formatRatio, truncateRatio } from './contrast-math.js';

const toOklch = converter('oklch');

/** Coarse scan resolution when bracketing the first lightness that passes. */
const SCAN_STEPS = 120;
/** Bisection refinement steps once a bracket is found. */
const REFINE_STEPS = 24;

/** @returns {string} hex for an OKLCh color at lightness `l`, gamut-mapped to sRGB. */
function hexAtLightness(base, l) {
  const clamped = clampChroma({ ...base, l: Math.min(1, Math.max(0, l)) }, 'oklch', 'rgb');
  return formatHex(clamped);
}

/**
 * Walk lightness away from `base` in one direction until the contrast against
 * `other` reaches `target`, then bisect back toward the original color to find
 * the smallest change that still passes.
 *
 * Contrast is not monotonic in lightness across the whole range (it dips to 1:1
 * where the two colors meet), which is why this brackets with a coarse scan
 * first instead of bisecting blindly.
 *
 * @returns {{hex:string, l:number, ratio:number}|null} null if unreachable
 */
function searchLightness(base, other, target, direction) {
  const startL = base.l;
  const endL = direction === 'lighter' ? 1 : 0;
  const span = endL - startL;
  if (Math.abs(span) < 1e-6) return null;

  const ratioAt = (l) => {
    const hex = hexAtLightness(base, l);
    return { hex, ratio: contrastRatio(parseColor(hex), other) };
  };

  // Coarse scan for the first sample that meets the target.
  let bracketLo = startL; // known-failing end (closest to the original)
  let hit = null;
  for (let i = 1; i <= SCAN_STEPS; i++) {
    const l = startL + (span * i) / SCAN_STEPS;
    const probe = ratioAt(l);
    if (probe.ratio >= target) {
      hit = { l, ...probe };
      break;
    }
    bracketLo = l;
  }
  if (!hit) return null;

  // Bisect between the last failing sample and the first passing one.
  let lo = bracketLo;
  let hi = hit.l;
  let best = hit;
  for (let i = 0; i < REFINE_STEPS; i++) {
    const mid = (lo + hi) / 2;
    const probe = ratioAt(mid);
    if (probe.ratio >= target) {
      best = { l: mid, ...probe };
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

/**
 * Suggest passing alternatives for a failing foreground/background pair.
 *
 * @param {string} fgInput  CSS color
 * @param {string} bgInput  CSS color
 * @param {{target?:number, includeBackground?:boolean}} [opts]
 *   `target` is the required ratio (4.5 normal text, 3 large text / non-text).
 * @returns {{
 *   target:number,
 *   original:{fg:string, bg:string, ratio:number, ratioDisplay:string, passes:boolean},
 *   suggestions:Array<{role:'foreground'|'background', direction:'lighter'|'darker',
 *                      hex:string, newRatio:number, newRatioDisplay:string, note?:string}>
 * }}
 */
export function suggestColors(fgInput, bgInput, opts = {}) {
  const { target = 4.5, includeBackground = true } = opts;
  const fg = parseColor(fgInput);
  const bg = parseColor(bgInput);
  const original = contrastRatio(fg, bg);

  const fgOk = toOklch({ mode: 'rgb', r: fg.r / 255, g: fg.g / 255, b: fg.b / 255 });
  const bgOk = toOklch({ mode: 'rgb', r: bg.r / 255, g: bg.g / 255, b: bg.b / 255 });
  // Hue is undefined for achromatic colors; keep it at 0 so clampChroma is happy.
  if (!Number.isFinite(fgOk.h)) fgOk.h = 0;
  if (!Number.isFinite(bgOk.h)) bgOk.h = 0;

  const suggestions = [];

  for (const direction of ['lighter', 'darker']) {
    const found = searchLightness(fgOk, bg, target, direction);
    if (found && found.hex !== fg.hex) {
      suggestions.push({
        role: 'foreground',
        direction,
        hex: found.hex,
        newRatio: truncateRatio(found.ratio),
        newRatioDisplay: formatRatio(found.ratio),
      });
    }
  }

  if (includeBackground) {
    // Move the background away from the foreground: if the text is dark, the
    // surface should get lighter, and vice versa.
    const direction = fgOk.l <= bgOk.l ? 'lighter' : 'darker';
    const found = searchLightness(bgOk, fg, target, direction);
    if (found && found.hex !== bg.hex) {
      suggestions.push({
        role: 'background',
        direction,
        hex: found.hex,
        newRatio: truncateRatio(found.ratio),
        newRatioDisplay: formatRatio(found.ratio),
        note: 'changes the surface, which affects every element drawn on it',
      });
    }
  }

  return {
    target,
    original: {
      fg: fg.hex,
      bg: bg.hex,
      ratio: truncateRatio(original),
      ratioDisplay: formatRatio(original),
      passes: original >= target,
    },
    suggestions,
  };
}

/**
 * One-line rendering of a suggestion set, for human output.
 * e.g. `#777777 → #595959 (4.47 → 7.00) or lighten background #ffffff → …`
 */
export function formatSuggestions(result) {
  if (result.suggestions.length === 0) return null;
  return result.suggestions
    .map((s) => {
      const what = s.role === 'foreground' ? 'text' : 'background';
      const from = s.role === 'foreground' ? result.original.fg : result.original.bg;
      return `${what} ${s.direction}: ${from} → ${s.hex} (${result.original.ratioDisplay} → ${s.newRatioDisplay})`;
    })
    .join('; ');
}
