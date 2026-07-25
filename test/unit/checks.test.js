import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  findPositiveTabindex,
  diffTabOrder,
  keyboardFindings,
} from '../../src/lib/checks/keyboard.js';
import {
  describeFocusChange,
  indicatorColor,
  ringContrast,
  focusVisibilityFindings,
  WATCHED_PROPERTIES,
} from '../../src/lib/checks/focus-visible.js';
import {
  MIN_TARGET_PX,
  meetsSpacingException,
  evaluateTargets,
  targetSizeFindings,
} from '../../src/lib/checks/target-size.js';
import {
  parseSeconds,
  isInfinite,
  findRunningAnimations,
  reducedMotionFindings,
} from '../../src/lib/checks/reduced-motion.js';
import {
  AMBIGUOUS_PHRASES,
  normalizeLinkText,
  isAmbiguousLinkText,
  linkTextFindings,
} from '../../src/lib/checks/link-text.js';
import { reflowFindings } from '../../src/lib/checks/reflow.js';
import { dialogFindings, roleButtonFindings } from '../../src/lib/checks/dialog.js';
import { SEVERITY } from '../../src/lib/finding.js';

const ctx = { passes: ['default'], state: null };
const ids = (findings) => findings.map((f) => f.ruleId);

/** A resting computed style with no focus indicator at all. */
const flatStyle = (overrides = {}) => {
  const style = {};
  for (const prop of WATCHED_PROPERTIES) style[prop] = '';
  return {
    ...style,
    outlineStyle: 'none',
    outlineWidth: '0px',
    outlineColor: 'rgb(0, 0, 0)',
    outlineOffset: '0px',
    boxShadow: 'none',
    borderTopWidth: '0px',
    borderTopColor: 'rgb(0, 0, 0)',
    borderBottomWidth: '0px',
    borderBottomColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    color: 'rgb(0, 0, 0)',
    textDecorationLine: 'none',
    textDecorationColor: 'rgb(0, 0, 0)',
    ...overrides,
  };
};

describe('keyboard: positive tabindex', () => {
  test('flags tabindex greater than zero', () => {
    const found = findPositiveTabindex([
      { selector: 'a', html: '<a>', tabindex: '3' },
      { selector: 'b', html: '<b>', tabindex: '0' },
      { selector: 'c', html: '<c>', tabindex: '-1' },
      { selector: 'd', html: '<d>', tabindex: 'nonsense' },
    ]);
    assert.deepEqual(
      found.map((f) => f.selector),
      ['a'],
    );
    assert.equal(found[0].tabindex, 3);
  });

  test('emits a violation citing SC 2.4.3', () => {
    const findings = keyboardFindings(
      { positiveTabindex: [{ selector: '#x', html: '<div tabindex="5">', tabindex: '5' }] },
      ctx,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'positive-tabindex');
    assert.equal(findings[0].severity, SEVERITY.VIOLATION);
    assert.equal(findings[0].wcag.sc, '2.4.3');
    assert.equal(findings[0].source, 'a11y-loop');
    assert.match(findings[0].message, /tabindex="5"/);
  });
});

describe('keyboard: tab order diff', () => {
  test('reports nothing when observed matches expected', () => {
    const diff = diffTabOrder({ expected: ['a', 'b', 'c'], observed: ['a', 'b', 'c'] });
    assert.deepEqual(diff.unreachable, []);
    assert.deepEqual(diff.unexpected, []);
    assert.equal(diff.divergesAt, null);
  });

  test('reports elements that never received focus', () => {
    const diff = diffTabOrder({ expected: ['a', 'b', 'c'], observed: ['a', 'c'] });
    assert.deepEqual(diff.unreachable, ['b']);
  });

  test('reports elements focused that tabbable did not expect', () => {
    const diff = diffTabOrder({ expected: ['a'], observed: ['a', 'surprise'] });
    assert.deepEqual(diff.unexpected, ['surprise']);
  });

  test('detects an order divergence among shared elements', () => {
    const diff = diffTabOrder({ expected: ['a', 'b', 'c'], observed: ['a', 'c', 'b'] });
    assert.equal(diff.divergesAt, 1);
  });

  test('an unreachable element is a violation, a reordering is needs-review', () => {
    const findings = keyboardFindings(
      {
        expected: ['a', 'b', 'c'],
        observed: ['a', 'c', 'b'],
        expectedDetails: [{ selector: 'b', html: '<button>b</button>' }],
      },
      ctx,
    );
    const byRule = Object.fromEntries(findings.map((f) => [f.ruleId, f]));
    assert.equal(byRule['focus-order-diverges'].severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(byRule['focus-order-diverges'].wcag.sc, '2.4.3');

    const unreachable = keyboardFindings(
      { expected: ['a', 'b'], observed: ['a'], expectedDetails: [{ selector: 'b', html: '<b>' }] },
      ctx,
    );
    assert.equal(unreachable[0].ruleId, 'keyboard-unreachable');
    assert.equal(unreachable[0].severity, SEVERITY.VIOLATION);
    assert.equal(unreachable[0].wcag.sc, '2.1.1');
    assert.equal(unreachable[0].html, '<b>');
  });
});

describe('focus visibility', () => {
  test('an unchanged element has no focus indicator', () => {
    const change = describeFocusChange(flatStyle(), flatStyle());
    assert.equal(change.visible, false);
    assert.deepEqual(change.indicators, []);
  });

  test('an outline appearing on focus counts', () => {
    const change = describeFocusChange(
      flatStyle(),
      flatStyle({ outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgb(0, 0, 255)' }),
    );
    assert.equal(change.visible, true);
    assert.ok(change.indicators.includes('outline'));
  });

  test('a transparent outline does not count', () => {
    const change = describeFocusChange(
      flatStyle(),
      flatStyle({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineColor: 'rgba(0, 0, 0, 0)',
      }),
    );
    assert.equal(change.indicators.includes('outline'), false);
  });

  test('a zero-width outline does not count', () => {
    const change = describeFocusChange(
      flatStyle(),
      flatStyle({ outlineStyle: 'solid', outlineWidth: '0px' }),
    );
    assert.equal(change.indicators.includes('outline'), false);
  });

  test('an identical persistent outline in both states is not an indicator', () => {
    const persistent = { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgb(1,2,3)' };
    const change = describeFocusChange(flatStyle(persistent), flatStyle(persistent));
    assert.equal(change.visible, false);
  });

  test('box-shadow, border, background and text changes all count', () => {
    assert.ok(
      describeFocusChange(flatStyle(), flatStyle({ boxShadow: '0 0 0 3px blue' })).indicators.includes(
        'box-shadow',
      ),
    );
    assert.ok(
      describeFocusChange(flatStyle(), flatStyle({ borderTopWidth: '2px' })).indicators.includes(
        'border',
      ),
    );
    assert.ok(
      describeFocusChange(
        flatStyle(),
        flatStyle({ backgroundColor: 'rgb(0, 0, 0)' }),
      ).indicators.includes('background-color'),
    );
    assert.ok(
      describeFocusChange(
        flatStyle(),
        flatStyle({ textDecorationLine: 'underline' }),
      ).indicators.includes('text-decoration'),
    );
  });

  test('identifies the indicator colour', () => {
    assert.equal(
      indicatorColor(
        flatStyle({ outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgb(0, 0, 255)' }),
        ['outline'],
      ),
      'rgb(0, 0, 255)',
    );
    assert.equal(
      indicatorColor(flatStyle({ boxShadow: 'rgb(255, 0, 0) 0px 0px 0px 3px' }), ['box-shadow']),
      'rgb(255, 0, 0)',
    );
    assert.equal(indicatorColor(flatStyle(), []), null);
  });

  test('ring contrast is computed against the adjacent background', () => {
    const good = ringContrast('rgb(0, 0, 255)', 'rgb(255, 255, 255)');
    assert.equal(good.determinable, true);
    assert.equal(good.passes, true, 'blue on white is 8.59:1');

    const bad = ringContrast('rgb(200, 200, 200)', 'rgb(255, 255, 255)');
    assert.equal(bad.determinable, true);
    assert.equal(bad.passes, false);
  });

  test('ring contrast is undeterminable when the backdrop is unknown', () => {
    assert.equal(ringContrast('rgb(0,0,255)', null).determinable, false);
    assert.equal(ringContrast(null, 'rgb(255,255,255)').determinable, false);
    assert.equal(ringContrast('rgb(0,0,255)', 'url(bg.png)').determinable, false);
  });

  test('no indicator is a violation of SC 2.4.7', () => {
    const findings = focusVisibilityFindings(
      [
        {
          selector: 'button',
          html: '<button>x</button>',
          base: flatStyle(),
          focused: flatStyle(),
          adjacentBackground: 'rgb(255, 255, 255)',
        },
      ],
      ctx,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'focus-not-visible');
    assert.equal(findings[0].severity, SEVERITY.VIOLATION);
    assert.equal(findings[0].wcag.sc, '2.4.7');
  });

  test('a low-contrast ring is needs-review under SC 1.4.11', () => {
    const findings = focusVisibilityFindings(
      [
        {
          selector: 'button',
          html: '<button>x</button>',
          base: flatStyle(),
          focused: flatStyle({
            outlineStyle: 'solid',
            outlineWidth: '2px',
            outlineColor: 'rgb(220, 220, 220)',
          }),
          adjacentBackground: 'rgb(255, 255, 255)',
        },
      ],
      ctx,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'focus-indicator-contrast');
    assert.equal(findings[0].severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(findings[0].wcag.sc, '1.4.11');
  });

  test('an adequate ring produces no finding at all', () => {
    const findings = focusVisibilityFindings(
      [
        {
          selector: 'button',
          html: '<button>x</button>',
          base: flatStyle(),
          focused: flatStyle({
            outlineStyle: 'solid',
            outlineWidth: '2px',
            outlineColor: 'rgb(0, 0, 255)',
          }),
          adjacentBackground: 'rgb(255, 255, 255)',
        },
      ],
      ctx,
    );
    assert.deepEqual(findings, []);
  });
});

describe('target size (SC 2.5.8)', () => {
  const rect = (x, y, width, height) => ({ x, y, width, height });

  test('targets of 24x24 and above are not reported', () => {
    assert.deepEqual(
      evaluateTargets([{ selector: 'a', html: '<a>', rect: rect(0, 0, MIN_TARGET_PX, MIN_TARGET_PX) }]),
      [],
    );
  });

  test('an undersized target is reported with its measurements', () => {
    const [result] = evaluateTargets([
      { selector: 'a', html: '<a>', rect: rect(0, 0, 18, 18) },
    ]);
    assert.equal(result.width, 18);
    assert.equal(result.height, 18);
  });

  test('either dimension being short is enough', () => {
    assert.equal(evaluateTargets([{ selector: 'a', html: '', rect: rect(0, 0, 100, 10) }]).length, 1);
    assert.equal(evaluateTargets([{ selector: 'a', html: '', rect: rect(0, 0, 10, 100) }]).length, 1);
  });

  test('the spacing exception is met when targets are 24px apart', () => {
    const a = { selector: 'a', html: '', rect: rect(0, 0, 16, 16) };
    const b = { selector: 'b', html: '', rect: rect(100, 0, 16, 16) };
    assert.equal(meetsSpacingException(a, [a, b]).met, true);
  });

  test('the spacing exception fails for adjacent cramped targets', () => {
    // Centres 16px apart, closer than the 24px circles allow.
    const a = { selector: 'a', html: '', rect: rect(0, 0, 16, 16) };
    const b = { selector: 'b', html: '', rect: rect(16, 0, 16, 16) };
    const spacing = meetsSpacingException(a, [a, b]);
    assert.equal(spacing.met, false);
    assert.equal(spacing.conflictsWith, 'b');
  });

  test('findings are always needs-review, never violations', () => {
    const findings = targetSizeFindings(
      [{ selector: 'a', html: '<a href="#">x</a>', rect: rect(0, 0, 16, 16) }],
      ctx,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(findings[0].wcag.sc, '2.5.8');
    assert.equal(findings[0].wcag.wcag22Only, true);
    assert.match(findings[0].message, /16×16 CSS px/);
    assert.match(findings[0].message, /Spacing exception may apply/);
  });

  test('the message names the conflicting target when spacing fails', () => {
    const targets = [
      { selector: 'a', html: '', rect: rect(0, 0, 16, 16) },
      { selector: 'b', html: '', rect: rect(16, 0, 16, 16) },
    ];
    const findings = targetSizeFindings(targets, ctx);
    assert.match(findings[0].message, /overlaps b/);
    assert.equal(findings[0].data.spacingExceptionMet, false);
  });
});

describe('reduced motion', () => {
  test('parses CSS durations', () => {
    assert.equal(parseSeconds('2s'), 2);
    assert.equal(parseSeconds('500ms'), 0.5);
    assert.equal(parseSeconds('0s'), 0);
    assert.equal(parseSeconds('1s, 4s'), 4);
    assert.equal(parseSeconds(undefined), 0);
  });

  test('detects infinite iteration counts', () => {
    assert.equal(isInfinite('infinite'), true);
    assert.equal(isInfinite('1, infinite'), true);
    assert.equal(isInfinite('3'), false);
    assert.equal(isInfinite(undefined), false);
  });

  const sample = (overrides = {}) => ({
    selector: '.spinner',
    html: '<div class="spinner">',
    animationName: 'spin',
    animationDuration: '1s',
    animationPlayState: 'running',
    animationIterationCount: 'infinite',
    transitionDuration: '0s',
    ...overrides,
  });

  test('ignores elements with no animation', () => {
    assert.deepEqual(findRunningAnimations([sample({ animationName: 'none' })]), []);
  });

  test('ignores zero-duration animations', () => {
    assert.deepEqual(findRunningAnimations([sample({ animationDuration: '0s' })]), []);
  });

  test('ignores paused animations', () => {
    assert.deepEqual(findRunningAnimations([sample({ animationPlayState: 'paused' })]), []);
  });

  test('reports an infinite running animation as continuous', () => {
    const [found] = findRunningAnimations([sample()]);
    assert.equal(found.infinite, true);
    assert.equal(found.continuous, true);
    assert.deepEqual(found.names, ['spin']);
  });

  test('a finite animation over 5s is also continuous', () => {
    const [found] = findRunningAnimations([
      sample({ animationIterationCount: '1', animationDuration: '8s' }),
    ]);
    assert.equal(found.continuous, true);
  });

  test('an infinite animation is an SC 2.2.2 violation', () => {
    const [finding] = reducedMotionFindings([sample()], ctx);
    assert.equal(finding.ruleId, 'reduced-motion-ignored');
    assert.equal(finding.severity, SEVERITY.VIOLATION);
    assert.equal(finding.wcag.sc, '2.2.2');
    assert.equal(finding.wcag.level, 'A');
    assert.match(finding.message, /loops forever/);
    assert.match(finding.message, /prefers-reduced-motion/);
  });

  test('a short finite animation is needs-review under AAA SC 2.3.3', () => {
    const [finding] = reducedMotionFindings(
      [sample({ animationIterationCount: '1', animationDuration: '0.4s' })],
      ctx,
    );
    assert.equal(finding.severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(finding.wcag.sc, '2.3.3');
    assert.equal(finding.wcag.level, 'AAA');
  });
});

describe('ambiguous link text', () => {
  test('the phrase list is the five specified phrases', () => {
    assert.deepEqual(AMBIGUOUS_PHRASES, ['click here', 'read more', 'learn more', 'here', 'more']);
  });

  test('normalises case, punctuation and chevrons', () => {
    assert.equal(normalizeLinkText('  Read More →  '), 'read more');
    assert.equal(normalizeLinkText('Click here!'), 'click here');
    assert.equal(normalizeLinkText('MORE »'), 'more');
  });

  test('matches the ambiguous phrases', () => {
    for (const phrase of AMBIGUOUS_PHRASES) {
      assert.equal(isAmbiguousLinkText(phrase), true, phrase);
    }
    assert.equal(isAmbiguousLinkText('Read more about the speaker line-up'), false);
    assert.equal(isAmbiguousLinkText('Conference schedule'), false);
    assert.equal(isAmbiguousLinkText(''), false);
    assert.equal(isAmbiguousLinkText(undefined), false);
  });

  test('produces needs-review findings under SC 2.4.4, never violations', () => {
    const findings = linkTextFindings(
      [
        { selector: 'a', html: '<a href="/x">Read more</a>', name: 'Read more' },
        { selector: 'b', html: '<a href="/y">Schedule</a>', name: 'Schedule' },
      ],
      ctx,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(findings[0].wcag.sc, '2.4.4');
    assert.match(findings[0].message, /"Read more"/);
  });
});

describe('reflow (SC 1.4.10)', () => {
  test('no finding when there is no horizontal scroll', () => {
    assert.deepEqual(
      reflowFindings({ horizontalScroll: false, scrollWidth: 320, clientWidth: 320, culprits: [] }, ctx),
      [],
    );
  });

  test('names the overflowing elements and reports the overflow amount', () => {
    const [finding] = reflowFindings(
      {
        horizontalScroll: true,
        scrollWidth: 600,
        clientWidth: 320,
        culprits: [{ tag: 'DIV', selector: '.wide', html: '<div class="wide">', right: 600 }],
      },
      ctx,
    );
    assert.equal(finding.ruleId, 'reflow-horizontal-scroll');
    assert.equal(finding.severity, SEVERITY.VIOLATION);
    assert.equal(finding.wcag.sc, '1.4.10');
    assert.match(finding.message, /320×256/);
    assert.match(finding.message, /280px/);
    assert.match(finding.message, /\.wide \(extends to 600px\)/);
  });

  test('overflow from only two-dimensional content is needs-review, not a failure', () => {
    const [finding] = reflowFindings(
      {
        horizontalScroll: true,
        scrollWidth: 600,
        clientWidth: 320,
        culprits: [{ tag: 'TABLE', selector: 'table', html: '<table>', right: 600 }],
      },
      ctx,
    );
    assert.equal(finding.severity, SEVERITY.NEEDS_REVIEW);
    assert.match(finding.message, /excepts when the content genuinely requires/);
  });
});

describe('dialog behaviour', () => {
  const observation = (overrides = {}) => ({
    selector: '#dlg',
    html: '<div role="dialog">',
    trigger: '#open',
    focusMovedIntoDialog: true,
    focusTrapped: true,
    escapedTo: null,
    escapeClosed: true,
    focusReturnedToTrigger: true,
    ...overrides,
  });

  test('a well-behaved dialog produces no findings', () => {
    assert.deepEqual(dialogFindings(observation(), ctx), []);
  });

  test('returns nothing when there was no dialog', () => {
    assert.deepEqual(dialogFindings(null, ctx), []);
  });

  test('focus left outside on open is a violation', () => {
    const findings = dialogFindings(observation({ focusMovedIntoDialog: false }), ctx);
    assert.deepEqual(ids(findings), ['dialog-initial-focus']);
    assert.equal(findings[0].severity, SEVERITY.VIOLATION);
  });

  test('an untrapped dialog is a violation of SC 2.1.2 naming where focus went', () => {
    const findings = dialogFindings(
      observation({ focusTrapped: false, escapedTo: 'main > a' }),
      ctx,
    );
    assert.deepEqual(ids(findings), ['dialog-focus-not-trapped']);
    assert.equal(findings[0].wcag.sc, '2.1.2');
    assert.match(findings[0].message, /main > a/);
  });

  test('Escape not closing is a violation', () => {
    const findings = dialogFindings(observation({ escapeClosed: false }), ctx);
    assert.deepEqual(ids(findings), ['dialog-escape-does-not-close']);
  });

  test('focus not returning to the trigger is a violation naming the trigger', () => {
    const findings = dialogFindings(
      observation({ escapeClosed: true, focusReturnedToTrigger: false }),
      ctx,
    );
    assert.deepEqual(ids(findings), ['dialog-focus-not-returned']);
    assert.match(findings[0].message, /#open/);
  });

  test('focus-return is not reported when Escape never closed the dialog', () => {
    const findings = dialogFindings(
      observation({ escapeClosed: false, focusReturnedToTrigger: false }),
      ctx,
    );
    assert.deepEqual(ids(findings), ['dialog-escape-does-not-close']);
  });

  test('several problems are reported together', () => {
    const findings = dialogFindings(
      observation({ focusMovedIntoDialog: false, focusTrapped: false, escapeClosed: false }),
      ctx,
    );
    assert.equal(findings.length, 3);
  });
});

describe('role="button" keyboard activation', () => {
  test('a control that responds to both keys is fine', () => {
    assert.deepEqual(
      roleButtonFindings(
        [{ selector: '#a', html: '<div role="button">', name: 'Save', enterActivates: true, spaceActivates: true }],
        ctx,
      ),
      [],
    );
  });

  test('missing Space alone is reported', () => {
    const [finding] = roleButtonFindings(
      [{ selector: '#a', html: '<div role="button">', name: 'Save', enterActivates: true, spaceActivates: false }],
      ctx,
    );
    assert.equal(finding.ruleId, 'role-button-keyboard-activation');
    assert.equal(finding.severity, SEVERITY.VIOLATION);
    assert.equal(finding.wcag.sc, '2.1.1');
    assert.match(finding.message, /does not activate on Space/);
  });

  test('a div that responds to neither key names both', () => {
    const [finding] = roleButtonFindings(
      [{ selector: '#a', html: '<div role="button">', name: 'Save', enterActivates: false, spaceActivates: false }],
      ctx,
    );
    assert.match(finding.message, /Enter or Space/);
    assert.match(finding.message, /a promise/);
    assert.equal(finding.impact, 'critical');
  });
});
