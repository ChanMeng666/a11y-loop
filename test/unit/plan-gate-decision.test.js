/**
 * Boundary tests for the plan gate's pure decision (`src/lib/plan-gate.js`),
 * each written against a mutant the rest of the suite let survive. The comment
 * above each test names the mutation it turns red; if a test here ever stops
 * killing anything, delete it rather than keep it for coverage.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkPlan,
  detectUi,
  assessAccessibility,
  detectForeclosingRisks,
  MIN_PLAN_CHARS,
} from '../../src/lib/plan-gate.js';

describe('detectUi: the score arithmetic', () => {
  // One strong term (3) plus two medium terms (1 each) is exactly the threshold.
  // Kills: `uiScore >= UI_SCORE_THRESHOLD` → `>`; `MEDIUM_UI = []`;
  // `strong * 3 + medium * 1` → `strong * 3 - medium * 1` or `strong / 3 + medium`.
  test('one strong and two medium terms reach the threshold exactly', () => {
    const ui = detectUi('Rework the sidebar so its badge and avatar line up.');
    assert.deepEqual([ui.strong, ui.medium, ui.uiScore], [['sidebar'], ['badge', 'avatar'], 5]);
    assert.equal(ui.touchesUi, true);
  });

  test('one strong and one medium term fall short of it', () => {
    const ui = detectUi('Rework the sidebar so its badge lines up.');
    assert.equal(ui.uiScore, 4);
    assert.equal(ui.touchesUi, false);
  });

  // Kills: `strong.length * WEIGHTS.strong` → `strong.length / WEIGHTS.strong`.
  test('two strong terms are enough on their own', () => {
    const ui = detectUi('Swap the tooltip for a carousel.');
    assert.deepEqual([ui.strong, ui.medium, ui.uiScore], [['tooltip', 'carousel'], [], 6]);
    assert.equal(ui.touchesUi, true);
  });

  // Kills: `NON_UI = []`; `uiScore > nonUiScore` → `true`;
  // `nonUi.length * WEIGHTS.nonUi` → `nonUi.length / WEIGHTS.nonUi`.
  // The exact hit lists also kill every vocabulary entry mutated to "" (an empty
  // term matches between any two punctuation characters and shows up as a hit),
  // and the capitalised words kill the `'i'` flag on termRegex being dropped.
  test('non-UI evidence that outweighs the UI score wins', () => {
    const ui = detectUi('Rework the Sidebar so its badge and avatar line up, then move the Parser, lexer and compiler.');
    assert.deepEqual(ui.strong, ['sidebar']);
    assert.deepEqual(ui.medium, ['badge', 'avatar']);
    assert.deepEqual(ui.nonUi, ['parser', 'lexer', 'compiler']);
    assert.deepEqual([ui.uiScore, ui.nonUiScore], [5, 6]);
    assert.equal(ui.touchesUi, false);
  });

  // Kills: `uiScore > nonUiScore` → `uiScore >= nonUiScore`.
  test('a tie between UI and non-UI evidence is not UI work', () => {
    const ui = detectUi('Swap the tooltip for a carousel, then move the parser, lexer and compiler.');
    assert.deepEqual([ui.uiScore, ui.nonUiScore], [6, 6]);
    assert.equal(ui.touchesUi, false);
  });

  // Kills: escapeRe's replacement `'\\$&'` → `''`, which strips the `.` out of
  // `next.js` so the term no longer matches the way people write it.
  test('a term with a regex metacharacter matches literally', () => {
    assert.ok(detectUi('Port the app to Next.js.').strong.includes('next.js'));
  });
});

describe('assessAccessibility: each detector on its own', () => {
  // Kills every `label: '…'` → `''` mutant and `missing.push({…})` → `push({})`.
  // The labels are what the hook's deny message lists as unanswered.
  test('missing items carry their keys and labels', () => {
    assert.deepEqual(assessAccessibility('Nothing relevant here.').missing, [
      { key: 'target', label: 'Target' },
      { key: 'perComponent', label: 'Per-component criteria' },
      { key: 'foreclosing', label: 'Foreclosing decisions' },
      { key: 'colorTokens', label: 'Color tokens' },
      { key: 'structure', label: 'Structure' },
      { key: 'verification', label: 'Verification' },
      { key: 'manualBudget', label: 'Manual budget' },
    ]);
  });

  // Each phrase lights exactly one item, so a mutant that breaks that one
  // alternative cannot hide behind another alternative in the same plan.
  for (const [key, phrase, kills] of [
    ['target', 'Target: WCAG 2.2.', '`wcag\\s*2\\.\\d` → `\\S*` or `\\.\\D`'],
    ['target', 'Target: WCAG2.1.', '`wcag\\s*` → `wcag\\s`'],
    ['target', 'Level AA throughout.', '`level\\s+` → `\\S+`; `a{1,3}` → `a`'],
    ['target', 'Our conformance target is set.', '`conformance\\s+` → `\\S+`'],
    ['target', 'EN 301 549 applies.', '`en\\s*301\\s*549` → `\\S*`'],
    ['target', 'Section 508 applies.', '`section\\s*508` → `\\S*`'],
    ['perComponent', 'Each control lists SC 2.1.1.', '`sc\\s*\\d\\.\\d\\.\\d+` → `\\S*`, `\\D`'],
    ['foreclosing', 'We rule out that pattern.', '`rules? out` → `rules out`'],
    ['foreclosing', 'Offer a single-pointer path.', '`single[- ]pointer` → `[^- ]`'],
    ['colorTokens', 'Text pairs meet 4.5:1.', '`4\\.5\\s*:\\s*1` → `\\s:` or `:\\s1`'],
    ['colorTokens', 'Text pairs meet 4.5 : 1.', '`4\\.5\\s*:\\s*1` → `\\S*`'],
    ['colorTokens', 'Icons meet 3:1.', '`3\\s*:\\s*1` → `\\s:` or `:\\s1`'],
    ['colorTokens', 'Icons meet 3 : 1.', '`3\\s*:\\s*1` → `\\S*`'],
    ['manualBudget', 'Run a screen-reader test.', '`screen[- ]reader` → `[^- ]`'],
    ['manualBudget', 'Tooling cannot judge tone.', '`cannot (?:be )?` → `cannot (?:be )`'],
  ]) {
    test(`"${phrase}" counts as ${key} (kills ${kills})`, () => {
      assert.deepEqual(assessAccessibility(phrase).present, [key]);
    });
  }
});

describe('assessAccessibility: what counts as a section heading', () => {
  for (const [heading, expected, kills] of [
    ['   ## Accessibility', true, '`^\\s{0,3}` → `^\\S{0,3}`'],
    ['Accessibility', true, 'the optional marker group made required'],
    ['**Accessibility**', true, '`\\*\\*\\s*` → `\\*\\*\\s`'],
    ['1. Accessibility', true, '`\\d+[.)]\\s*` → `\\D+`, `[^.)]`, `\\S*`'],
    ['10. Accessibility', true, '`\\d+` → `\\d`'],
    ['We care about accessibility a lot.', false, 'the `^` anchor dropped'],
    ['Accessibility is something we will think about later once the backend ships.', false, 'the `$` anchor dropped'],
  ]) {
    test(`${JSON.stringify(heading)} → hasSection ${expected} (kills ${kills})`, () => {
      assert.equal(assessAccessibility(`Plan.\n${heading}\nMore.`).hasSection, expected);
    });
  }
});

describe('detectForeclosingRisks: spelling variants and negations', () => {
  for (const [id, plan, kills] of [
    ['hover', 'Open a megamenu from the top bar.', '`mega ?menu` → `mega menu`'],
    ['infiniteScroll', 'Rows autoload more as you scroll.', '`auto-?load` → `auto-load`'],
    ['timing', 'Sessions show a timeout warning.', '`time(?:-| )?out` → `time(?:-| )out`'],
    ['timing', 'The feed will autorefresh.', '`auto-?(?:refresh|…)` → `auto-(?:…)`'],
    ['timing', 'Slides autoadvance.', '`auto-?advanc` → `auto-advanc`'],
    ['captcha', 'Ask them to prove youre human.', "`you'?re` → `you're`"],
    ['autoplay', 'Videos autoplay.', '`auto-?play` → `auto-play`'],
    ['autoplay', 'The clip will play automatically.', '`plays? automatically` → `plays automatically`'],
    ['autoplay', 'Banners autorotate.', '`auto-?rotat` → `auto-rotat`'],
    ['autoplay', 'An autoscroll carousel of logos.', '`auto-?scroll` → `auto-scroll`'],
    ['autoplay', 'An auto-scroll carousel of logos.', '`scroll(?:ing)?` → `scroll(?:ing)`'],
  ]) {
    test(`"${plan}" flags ${id} (kills ${kills})`, () => {
      assert.deepEqual(detectForeclosingRisks(plan).map((r) => r.id), [id]);
    });
  }

  for (const [plan, kills] of [
    ['We avoid drag and drop.', '`avoid(?:s|ing|ed)?` → `avoid(?:s|ing|ed)`'],
    ['We dont autoplay video.', "`don'?t` → `don't`"],
    ['The page doesnt autoplay.', "`doesn'?t` → `doesn't`"],
    ['It wont autoplay.', "`won'?t` → `won't`"],
  ]) {
    test(`"${plan}" is ruled out, not planned (kills ${kills})`, () => {
      assert.deepEqual(detectForeclosingRisks(plan), []);
    });
  }

  // Kills each `note: '…'` → `''` mutant. The note is what the deny message
  // shows, and it has to cite the criterion, not just name the pattern.
  for (const [id, plan, sc] of [
    ['hover', 'The menu opens on hover.', '1.4.13'],
    ['infiniteScroll', 'The feed uses infinite scroll.', '2.4.3'],
    ['canvas', 'Charts are drawn with WebGL.', '1.1.1'],
    ['timing', 'A countdown runs at checkout.', '2.2.1'],
    ['captcha', 'Signup has a captcha.', '3.3.8'],
    ['autoplay', 'The hero has autoplay.', '2.2.2'],
  ]) {
    test(`the ${id} note cites SC ${sc}`, () => {
      const [risk] = detectForeclosingRisks(plan);
      assert.equal(risk.id, id);
      assert.ok(risk.note.includes(`SC ${sc}`), risk.note);
    });
  }
});

describe('checkPlan: the length floor', () => {
  // Kills `plan.trim().length < MIN_PLAN_CHARS` → `<=`.
  test('a UI plan of exactly MIN_PLAN_CHARS is assessed, one shorter is not', () => {
    const plan = 'React modal and dialog button for cards.';
    assert.equal(plan.length, MIN_PLAN_CHARS);
    assert.equal(checkPlan(plan).why, 'ui-without-accessibility');
    assert.equal(checkPlan(plan.slice(1)).why, 'plan-too-short');
  });

  // Kills `plan.trim().length` → `plan.length`.
  test('surrounding whitespace does not count towards the floor', () => {
    assert.equal(checkPlan(`${' '.repeat(40)}React modal dialog.`).why, 'plan-too-short');
  });
});
