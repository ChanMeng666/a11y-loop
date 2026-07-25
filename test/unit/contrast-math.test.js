import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseColor,
  ColorParseError,
  relativeLuminance,
  contrastRatio,
  composite,
  checkContrast,
  isLargeText,
  isBoldWeight,
  formatRatio,
  truncateRatio,
  THRESHOLDS,
} from '../../src/lib/contrast-math.js';

/** Ratio of two hex strings, truncated the way we display it. */
const ratio = (fg, bg) => truncateRatio(contrastRatio(parseColor(fg), parseColor(bg)));

describe('parseColor', () => {
  test('parses 6-digit hex', () => {
    assert.deepEqual(parseColor('#777777'), {
      r: 119,
      g: 119,
      b: 119,
      alpha: 1,
      hex: '#777777',
    });
  });

  test('parses 3-digit hex', () => {
    assert.equal(parseColor('#fff').hex, '#ffffff');
  });

  test('parses bare hex digits without #', () => {
    assert.equal(parseColor('777777').hex, '#777777');
    assert.equal(parseColor('abc').hex, '#aabbcc');
  });

  test('parses rgb() and rgba()', () => {
    assert.equal(parseColor('rgb(0, 128, 255)').hex, '#0080ff');
    const a = parseColor('rgba(0, 0, 0, 0.5)');
    assert.equal(a.alpha, 0.5);
    assert.equal(a.hex, '#000000');
  });

  test('parses CSS named colors', () => {
    assert.equal(parseColor('white').hex, '#ffffff');
    assert.equal(parseColor('rebeccapurple').hex, '#663399');
  });

  test('parses hsl()', () => {
    assert.equal(parseColor('hsl(0, 100%, 50%)').hex, '#ff0000');
  });

  test('throws ColorParseError on garbage', () => {
    assert.throws(() => parseColor('not-a-color'), ColorParseError);
    assert.throws(() => parseColor(''), ColorParseError);
    assert.throws(() => parseColor(undefined), ColorParseError);
  });
});

describe('relativeLuminance', () => {
  test('black is 0 and white is 1', () => {
    assert.equal(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
    assert.equal(relativeLuminance({ r: 255, g: 255, b: 255 }), 1);
  });

  test('uses the sRGB linear segment below 0.04045', () => {
    // 10/255 = 0.0392 → linear segment: 0.0392/12.92
    const expected = 10 / 255 / 12.92;
    assert.ok(Math.abs(relativeLuminance({ r: 10, g: 10, b: 10 }) - expected) < 1e-12);
  });

  test('applies the ITU-R BT.709 coefficients', () => {
    assert.ok(Math.abs(relativeLuminance({ r: 255, g: 0, b: 0 }) - 0.2126) < 1e-12);
    assert.ok(Math.abs(relativeLuminance({ r: 0, g: 255, b: 0 }) - 0.7152) < 1e-12);
    assert.ok(Math.abs(relativeLuminance({ r: 0, g: 0, b: 255 }) - 0.0722) < 1e-12);
  });
});

describe('contrastRatio — values verified against the WebAIM Contrast Checker', () => {
  test('black on white is 21:1', () => {
    assert.equal(ratio('#000000', '#ffffff'), 21);
  });

  test('identical colors are 1:1', () => {
    assert.equal(ratio('#ffffff', '#ffffff'), 1);
    assert.equal(ratio('#3366cc', '#3366cc'), 1);
  });

  test('#777777 on white is 4.47 (the canonical AA near-miss)', () => {
    // Full precision 4.47809: truncated 4.47 the way axe-core reports it.
    assert.equal(ratio('#777777', '#ffffff'), 4.47);
  });

  test('#767676 on white is 4.54 (the canonical smallest passing grey)', () => {
    assert.equal(ratio('#767676', '#ffffff'), 4.54);
  });

  test('#949494 on white is 3.03 (large-text boundary grey)', () => {
    assert.equal(ratio('#949494', '#ffffff'), 3.03);
  });

  test('pure blue on white is 8.59', () => {
    assert.equal(ratio('#0000ff', '#ffffff'), 8.59);
  });

  test('pure red on white is 3.99', () => {
    assert.equal(ratio('#ff0000', '#ffffff'), 3.99);
  });

  test('pure green on white is 1.37', () => {
    assert.equal(ratio('#00ff00', '#ffffff'), 1.37);
  });

  test('is order-independent', () => {
    assert.equal(ratio('#000000', '#ffffff'), ratio('#ffffff', '#000000'));
  });
});

describe('composite (alpha in non-linear sRGB)', () => {
  test('50% black over white is #808080', () => {
    const out = composite(parseColor('rgba(0,0,0,0.5)'), parseColor('#ffffff'));
    assert.equal(out.hex, '#808080');
    assert.equal(out.alpha, 1);
  });

  test('a fully opaque foreground is unchanged', () => {
    const out = composite(parseColor('#123456'), parseColor('#ffffff'));
    assert.equal(out.hex, '#123456');
  });

  test('a fully transparent foreground becomes the background', () => {
    const out = composite(parseColor('rgba(255,0,0,0)'), parseColor('#00ff00'));
    assert.equal(out.hex, '#00ff00');
  });

  test('checkContrast composites before measuring', () => {
    const r = checkContrast('rgba(0,0,0,0.5)', '#ffffff');
    assert.equal(r.fg.composited, '#808080');
    assert.equal(r.ratioDisplay, '3.94');
  });

  test('a translucent background composites over the page background first', () => {
    const r = checkContrast('#000000', 'rgba(0,0,0,0.5)', { pageBackground: '#ffffff' });
    assert.equal(r.bg.composited, '#808080');
  });
});

describe('isLargeText / isBoldWeight', () => {
  test('regular text is large at 24px and above', () => {
    assert.equal(isLargeText(24, false), true);
    assert.equal(isLargeText(23.9, false), false);
  });

  test('bold text is large at 18.5px and above', () => {
    assert.equal(isLargeText(18.5, true), true);
    assert.equal(isLargeText(18.4, true), false);
  });

  test('non-numeric sizes are not large', () => {
    assert.equal(isLargeText('inherit'), false);
  });

  test('bold weights are 700 and above plus the keywords', () => {
    assert.equal(isBoldWeight('bold'), true);
    assert.equal(isBoldWeight('bolder'), true);
    assert.equal(isBoldWeight(700), true);
    assert.equal(isBoldWeight('600'), false);
    assert.equal(isBoldWeight('normal'), false);
  });
});

describe('checkContrast verdicts', () => {
  test('#777777 on white fails AA normal but passes AA large', () => {
    const normal = checkContrast('#777777', '#ffffff');
    assert.equal(normal.context, 'normal');
    assert.equal(normal.passes.AA, false);
    assert.equal(normal.thresholds.AA, 4.5);
    assert.equal(normal.sc.AA, '1.4.3');

    const large = checkContrast('#777777', '#ffffff', { large: true });
    assert.equal(large.context, 'large');
    assert.equal(large.passes.AA, true);
    assert.equal(large.thresholds.AA, 3);
  });

  test('--ui uses the 3:1 non-text threshold and cites SC 1.4.11', () => {
    const r = checkContrast('#949494', '#ffffff', { ui: true });
    assert.equal(r.context, 'non-text');
    assert.equal(r.thresholds.AA, 3);
    assert.equal(r.sc.AA, '1.4.11');
    assert.equal(r.passes.AA, true);
    assert.equal(r.passes.AAA, undefined, 'there is no AAA level for SC 1.4.11');
  });

  test('AAA thresholds are reported alongside AA', () => {
    const r = checkContrast('#595959', '#ffffff');
    assert.equal(r.passes.AA, true);
    assert.equal(r.thresholds.AAA, 7);
    assert.equal(r.passes.AAA, true, '#595959 on white is 7.00:1');
  });

  test('the displayed ratio is never rounded up past a threshold', () => {
    // A ratio just short of 4.5 must neither display as 4.5 nor pass.
    assert.equal(truncateRatio(4.4999), 4.49);
    assert.equal(4.4999 >= THRESHOLDS.normal.AA, false);
    // Every 8-bit grey on white agrees: displayed >= 4.5 iff it truly passes.
    for (let v = 0; v <= 255; v++) {
      const c = checkContrast(`rgb(${v},${v},${v})`, '#ffffff');
      assert.equal(
        c.ratioTruncated >= THRESHOLDS.normal.AA,
        c.passes.AA,
        `grey ${v}: displayed ${c.ratioDisplay} disagrees with the verdict`,
      );
    }
  });

  test('ratio formatting truncates to 2 decimals and drops them for integers', () => {
    assert.equal(formatRatio(21), '21');
    assert.equal(formatRatio(4.47828), '4.47');
    assert.equal(formatRatio(3.998476), '3.99');
    assert.equal(formatRatio(1), '1');
  });
});
