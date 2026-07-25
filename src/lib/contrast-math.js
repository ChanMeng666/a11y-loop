/**
 * WCAG 2.x contrast math — own implementation.
 *
 * Reference (WCAG 2.2, Understanding SC 1.4.3):
 *   c_srgb = c_8bit / 255
 *   c      = c_srgb <= 0.04045 ? c_srgb / 12.92 : ((c_srgb + 0.055) / 1.055) ** 2.4
 *   L      = 0.2126 * R + 0.7152 * G + 0.0722 * B
 *   ratio  = (L_lighter + 0.05) / (L_darker + 0.05)
 *
 * Deliberate choices, for reproducibility against the WebAIM Contrast Checker
 * (the de facto reference implementation practitioners compare against):
 *  - Channels are quantised to 8 bits on parse, because that is what a browser
 *    actually renders and what WebAIM operates on.
 *  - Alpha is composited in NON-LINEAR sRGB (the same thing browsers and
 *    axe-core do) before linearisation.
 *  - The displayed ratio is TRUNCATED to 2 decimals, never rounded up. This is
 *    what axe-core does (`Math.floor(contrast * 100) / 100` in
 *    color-contrast-evaluate) and it is why the canonical figure for red on
 *    white is 3.99:1 and not 4.00:1. The pass/fail verdict uses the full
 *    precision ratio, so a pair can never reach a threshold by rounding.
 */

import { parse, converter } from 'culori';

const toRgb = converter('rgb');

export class ColorParseError extends Error {
  constructor(input) {
    super(`Could not parse color: ${JSON.stringify(input)}`);
    this.name = 'ColorParseError';
    this.input = input;
  }
}

/** WCAG threshold table. `nonText` is SC 1.4.11 (UI components / graphical objects). */
export const THRESHOLDS = {
  normal: { AA: 4.5, AAA: 7 },
  large: { AA: 3, AAA: 4.5 },
  nonText: { AA: 3 },
};

/** SC that governs each context. */
export const CONTEXT_SC = {
  normal: { AA: '1.4.3', AAA: '1.4.6' },
  large: { AA: '1.4.3', AAA: '1.4.6' },
  'non-text': { AA: '1.4.11' },
};

const to8bit = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);

/**
 * Parse any CSS color string into 8-bit sRGB channels plus alpha.
 * @param {string} input
 * @returns {{r:number,g:number,b:number,alpha:number,hex:string}}
 */
export function parseColor(input) {
  if (typeof input !== 'string' || input.trim() === '') throw new ColorParseError(input);
  let raw = input.trim();
  // Bare hex digits are a very common agent/user input ("777777").
  if (/^[0-9a-f]{3}$|^[0-9a-f]{4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(raw)) raw = `#${raw}`;
  const parsed = parse(raw);
  if (!parsed) throw new ColorParseError(input);
  const rgb = toRgb(parsed);
  if (!rgb) throw new ColorParseError(input);
  const r = to8bit(rgb.r);
  const g = to8bit(rgb.g);
  const b = to8bit(rgb.b);
  const alpha = rgb.alpha === undefined ? 1 : Math.min(1, Math.max(0, rgb.alpha));
  return { r, g, b, alpha, hex: toHex({ r, g, b }) };
}

/** @returns {string} lowercase `#rrggbb` */
export function toHex({ r, g, b }) {
  const h = (v) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Composite `fg` over `bg` in non-linear sRGB (what browsers do).
 * @returns {{r:number,g:number,b:number,alpha:number,hex:string}}
 */
export function composite(fg, bg) {
  const a = fg.alpha ?? 1;
  if (a >= 1) return { ...fg, alpha: 1 };
  const mix = (f, b) => Math.round(f * a + b * (1 - a));
  const out = { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), alpha: 1 };
  return { ...out, hex: toHex(out) };
}

/** Relative luminance of an opaque 8-bit sRGB color. */
export function relativeLuminance({ r, g, b }) {
  const lin = (v8) => {
    const c = v8 / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two opaque colors. Order-independent. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Truncate to 2 decimals for display — never for the verdict, and never
 * upward. Matches axe-core's `Math.floor(contrast * 100) / 100`.
 */
export function truncateRatio(ratio) {
  return Math.floor(ratio * 100) / 100;
}

/** `4.47828` → `"4.47"`, `21` → `"21"`. */
export function formatRatio(ratio) {
  const r = truncateRatio(ratio);
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

/**
 * WCAG "large scale" text: 18pt regular / 14pt bold, i.e. >=24px / >=18.5px bold
 * (1pt = 4/3 px). This boundary is the most common source of disagreement
 * between contrast tools; 18.5 rather than 18.66 matches axe-core.
 */
export function isLargeText(fontSizePx, bold = false) {
  const px = Number(fontSizePx);
  if (!Number.isFinite(px)) return false;
  return bold ? px >= 18.5 : px >= 24;
}

/** Is a CSS font-weight value bold for the purposes of SC 1.4.3? */
export function isBoldWeight(weight) {
  if (weight === 'bold' || weight === 'bolder') return true;
  const n = Number(weight);
  return Number.isFinite(n) && n >= 700;
}

/**
 * Full contrast verdict for a foreground/background pair.
 *
 * @param {string|object} fgInput  CSS color string or parsed color
 * @param {string|object} bgInput
 * @param {{large?:boolean, ui?:boolean, pageBackground?:string}} [opts]
 */
export function checkContrast(fgInput, bgInput, opts = {}) {
  const { large = false, ui = false, pageBackground = '#ffffff' } = opts;
  const fgRaw = typeof fgInput === 'string' ? parseColor(fgInput) : fgInput;
  const bgRaw = typeof bgInput === 'string' ? parseColor(bgInput) : bgInput;
  const page = typeof pageBackground === 'string' ? parseColor(pageBackground) : pageBackground;

  // A translucent background composites over the page behind it first.
  const bg = composite(bgRaw, page);
  const fg = composite(fgRaw, bg);

  const context = ui ? 'non-text' : large ? 'large' : 'normal';
  const thresholds = ui ? THRESHOLDS.nonText : large ? THRESHOLDS.large : THRESHOLDS.normal;
  const ratio = contrastRatio(fg, bg);

  const passes = {};
  for (const [level, min] of Object.entries(thresholds)) passes[level] = ratio >= min;

  return {
    fg: {
      input: typeof fgInput === 'string' ? fgInput : fgRaw.hex,
      hex: fgRaw.hex,
      alpha: fgRaw.alpha ?? 1,
      composited: fg.hex,
      rgb: [fg.r, fg.g, fg.b],
    },
    bg: {
      input: typeof bgInput === 'string' ? bgInput : bgRaw.hex,
      hex: bgRaw.hex,
      alpha: bgRaw.alpha ?? 1,
      composited: bg.hex,
      rgb: [bg.r, bg.g, bg.b],
    },
    context,
    ratio,
    ratioDisplay: formatRatio(ratio),
    ratioTruncated: truncateRatio(ratio),
    thresholds,
    passes,
    sc: CONTEXT_SC[context],
    /** The threshold that has to be met for the requested context at Level AA. */
    required: thresholds.AA,
  };
}
