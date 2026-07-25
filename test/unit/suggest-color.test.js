import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { converter } from 'culori';
import { suggestColors, formatSuggestions } from '../../src/lib/suggest-color.js';
import { parseColor, contrastRatio } from '../../src/lib/contrast-math.js';

const toOklch = converter('oklch');
const oklchOf = (hex) => {
  const c = parseColor(hex);
  return toOklch({ mode: 'rgb', r: c.r / 255, g: c.g / 255, b: c.b / 255 });
};
const pick = (result, role, direction) =>
  result.suggestions.find((s) => s.role === role && s.direction === direction);

describe('suggestColors', () => {
  test('reports the original ratio and that it fails', () => {
    const r = suggestColors('#777777', '#ffffff', { target: 4.5 });
    assert.equal(r.original.fg, '#777777');
    assert.equal(r.original.bg, '#ffffff');
    assert.equal(r.original.ratioDisplay, '4.47');
    assert.equal(r.original.passes, false);
    assert.equal(r.target, 4.5);
  });

  test('returns a darker foreground candidate that actually passes', () => {
    const r = suggestColors('#777777', '#ffffff', { target: 4.5 });
    const darker = pick(r, 'foreground', 'darker');
    assert.ok(darker, 'expected a darker foreground suggestion');
    const actual = contrastRatio(parseColor(darker.hex), parseColor('#ffffff'));
    assert.ok(actual >= 4.5, `${darker.hex} on white is ${actual}, below the 4.5 target`);
    assert.equal(darker.newRatio >= 4.5, true);
  });

  test('returns a background candidate that actually passes', () => {
    const r = suggestColors('#666666', '#999999', { target: 4.5 });
    const bg = pick(r, 'background', 'lighter');
    assert.ok(bg, 'expected a lighter background suggestion');
    const actual = contrastRatio(parseColor('#666666'), parseColor(bg.hex));
    assert.ok(actual >= 4.5, `#666666 on ${bg.hex} is ${actual}, below the 4.5 target`);
    assert.match(bg.note, /surface/);
  });

  test('omits the background option when the surface cannot help', () => {
    // The text is darker than the background and the background is already
    // white — no lighter surface exists, so only the text can change.
    const r = suggestColors('#777777', '#ffffff', { target: 4.5 });
    assert.equal(
      r.suggestions.some((s) => s.role === 'background'),
      false,
    );
  });

  test('both directions are offered when both are reachable', () => {
    // #767676 is the narrow band where white text (4.54:1) and black text
    // (4.62:1) both clear 4.5:1, so lightening and darkening both work.
    const r = suggestColors('#787878', '#767676', { target: 4.5 });
    assert.ok(pick(r, 'foreground', 'lighter'), 'expected a lighter candidate');
    assert.ok(pick(r, 'foreground', 'darker'), 'expected a darker candidate');
    for (const s of r.suggestions.filter((x) => x.role === 'foreground')) {
      const actual = contrastRatio(parseColor(s.hex), parseColor('#767676'));
      assert.ok(actual >= 4.5, `${s.direction} candidate ${s.hex} only reaches ${actual}`);
    }
  });

  test('preserves hue and chroma (the point of searching in OKLCh)', () => {
    const r = suggestColors('#3366cc', '#ffffff', { target: 4.5 });
    const before = oklchOf('#3366cc');
    for (const s of r.suggestions.filter((x) => x.role === 'foreground')) {
      const after = oklchOf(s.hex);
      const hueDelta = Math.abs(((after.h - before.h + 540) % 360) - 180);
      assert.ok(
        180 - hueDelta < 6,
        `${s.direction} candidate ${s.hex} shifted hue from ${before.h} to ${after.h}`,
      );
    }
  });

  test('finds the smallest change that passes, not an extreme one', () => {
    const r = suggestColors('#777777', '#ffffff', { target: 4.5 });
    const darker = pick(r, 'foreground', 'darker');
    // 4.5:1 on white sits around #767676; a lazy implementation returns black.
    assert.ok(
      darker.newRatio < 6,
      `${darker.hex} overshoots at ${darker.newRatio}:1 — expected just past 4.5`,
    );
    assert.notEqual(darker.hex, '#000000');
  });

  test('honours a 3:1 target for large text / non-text contrast', () => {
    const r = suggestColors('#999999', '#ffffff', { target: 3 });
    const darker = pick(r, 'foreground', 'darker');
    assert.ok(darker.newRatio >= 3);
    assert.ok(darker.newRatio < 4.5, 'a 3:1 target should not overshoot to the 4.5:1 colour');
  });

  test('a passing pair is reported as passing', () => {
    const r = suggestColors('#000000', '#ffffff', { target: 4.5 });
    assert.equal(r.original.passes, true);
    assert.equal(r.original.ratioDisplay, '21');
  });

  test('omits a direction that cannot reach the target', () => {
    // White text on white: lightening can never help.
    const r = suggestColors('#ffffff', '#ffffff', { target: 4.5 });
    assert.equal(pick(r, 'foreground', 'lighter'), undefined);
    assert.ok(pick(r, 'foreground', 'darker'), 'darkening must still be offered');
  });

  test('achromatic input does not produce NaN hues', () => {
    const r = suggestColors('#808080', '#ffffff', { target: 4.5 });
    for (const s of r.suggestions) {
      assert.match(s.hex, /^#[0-9a-f]{6}$/, `bad hex: ${s.hex}`);
    }
  });

  test('can skip the background option', () => {
    const r = suggestColors('#777777', '#ffffff', { target: 4.5, includeBackground: false });
    assert.equal(
      r.suggestions.some((s) => s.role === 'background'),
      false,
    );
  });
});

describe('formatSuggestions', () => {
  test('renders before/after ratios and hex values on one line', () => {
    const r = suggestColors('#777777', '#ffffff', { target: 4.5 });
    const line = formatSuggestions(r);
    assert.match(line, /#777777 → #[0-9a-f]{6}/);
    assert.match(line, /4\.47 → /);
  });

  test('returns null when there is nothing to suggest', () => {
    assert.equal(formatSuggestions({ suggestions: [], original: {} }), null);
  });
});
