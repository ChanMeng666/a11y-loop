/**
 * `a11y-loop contrast <fg> <bg>` — WCAG 2.x contrast check, with fixes.
 *
 * Exit codes: 0 the pair meets the requested threshold · 1 it does not ·
 * 2 the colours could not be parsed.
 */

import { checkContrast, ColorParseError, THRESHOLDS } from '../lib/contrast-math.js';
import { suggestColors } from '../lib/suggest-color.js';
import { ToolError } from '../lib/axe-runner.js';

/** Build the machine-readable result, shared by --json and the human output. */
export function contrastResult(fg, bg, { large = false, ui = false, fix = false } = {}) {
  const check = checkContrast(fg, bg, { large, ui });
  const required = check.thresholds.AA;

  const result = {
    foreground: { input: fg, hex: check.fg.hex, alpha: check.fg.alpha },
    background: { input: bg, hex: check.bg.hex, alpha: check.bg.alpha },
    ratio: check.ratioTruncated,
    ratioDisplay: check.ratioDisplay,
    context: check.context,
    wcag: {
      sc: check.sc.AA,
      name: ui ? 'Non-text Contrast' : 'Contrast (Minimum)',
      level: 'AA',
      required,
    },
    thresholds: {
      normalText: THRESHOLDS.normal,
      largeText: THRESHOLDS.large,
      nonText: THRESHOLDS.nonText,
    },
    passes: check.passes,
  };

  if (check.fg.alpha < 1 || check.bg.alpha < 1) {
    result.composited = { foreground: check.fg.composited, background: check.bg.composited };
  }

  if (fix) {
    result.fix = suggestColors(check.fg.composited, check.bg.composited, { target: required });
  }

  return result;
}

function contextLabel(result) {
  if (result.context === 'non-text') return 'non-text / UI component';
  return result.context === 'large' ? 'large-scale text (≥24px, or ≥18.5px bold)' : 'normal text';
}

export function formatContrastHuman(result) {
  const lines = [];
  const verdictFor = (level, threshold) => {
    const passes = result.passes[level];
    return `${passes ? 'PASS' : 'FAIL'} ${level} (${threshold}:1)`;
  };

  lines.push(`${result.foreground.hex} on ${result.background.hex} — ${result.ratioDisplay}:1`);
  if (result.composited) {
    lines.push(
      `  composited for alpha: ${result.composited.foreground} on ${result.composited.background}`,
    );
  }
  lines.push(`  measured as: ${contextLabel(result)}`);

  const levels = Object.keys(result.passes);
  const thresholdFor = (level) =>
    result.context === 'non-text'
      ? result.thresholds.nonText[level]
      : result.context === 'large'
        ? result.thresholds.largeText[level]
        : result.thresholds.normalText[level];
  lines.push(`  ${levels.map((level) => verdictFor(level, thresholdFor(level))).join('  ·  ')}`);
  lines.push(
    `  SC ${result.wcag.sc} ${result.wcag.name} (Level ${result.wcag.level}) requires ${result.wcag.required}:1`,
  );

  if (result.fix) {
    lines.push('');
    if (result.fix.suggestions.length === 0) {
      lines.push(
        result.fix.original.passes
          ? '  Already meets the threshold — nothing to fix.'
          : `  No candidate reached ${result.fix.target}:1 by adjusting lightness alone. ` +
            'Change hue or chroma, or pick a different pair.',
      );
    } else {
      lines.push(`  Candidates that reach ${result.fix.target}:1 (hue and chroma preserved):`);
      for (const s of result.fix.suggestions) {
        const what = s.role === 'background' ? 'background' : 'text';
        const from = s.role === 'background' ? result.fix.original.bg : result.fix.original.fg;
        lines.push(
          `    ${what} ${s.direction}: ${from} → ${s.hex}  ` +
            `(${result.fix.original.ratioDisplay}:1 → ${s.newRatioDisplay}:1)` +
            (s.note ? `  — ${s.note}` : ''),
        );
      }
    }
  }

  lines.push('');
  lines.push('Contrast is measured with the WCAG 2.x algorithm; the ratio is truncated to two');
  lines.push('decimals, matching axe-core and the WebAIM Contrast Checker.');
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {{fg:string, bg:string, flags:object}} input
 * @param {{write:Function, writeError:Function}} io
 * @returns {Promise<number>}
 */
export async function runContrastCommand({ fg, bg, flags }, io) {
  let result;
  try {
    result = contrastResult(fg, bg, {
      large: Boolean(flags.large),
      ui: Boolean(flags.ui),
      fix: Boolean(flags.fix),
    });
  } catch (error) {
    if (error instanceof ColorParseError) {
      throw new ToolError(error.message, {
        hint:
          'Accepted formats: #rgb, #rrggbb, #rrggbbaa, rgb()/rgba(), hsl()/hsla(), oklch(), ' +
          'and CSS named colours.',
      });
    }
    throw error;
  }

  if (flags.json) {
    io.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    io.write(formatContrastHuman(result));
  }

  return result.passes.AA ? 0 : 1;
}
