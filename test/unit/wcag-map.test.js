import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SC_TABLE,
  CONFORMANCE_SET,
  scFromTag,
  levelFromTags,
  versionFromTags,
  wcagForSc,
  wcagFromTags,
  compareSc,
  isBestPractice,
  actIdsForRule,
  axeCoreVersion,
  formatCitation,
} from '../../src/lib/wcag-map.js';

describe('SC_TABLE integrity', () => {
  test('contains 31 Level A and 24 Level AA criteria (the 55-criterion AA set)', () => {
    const levels = Object.values(SC_TABLE).map((e) => e.level);
    const a = levels.filter((l) => l === 'A').length;
    const aa = levels.filter((l) => l === 'AA').length;
    assert.equal(a, CONFORMANCE_SET.levelA, 'Level A count');
    assert.equal(aa, CONFORMANCE_SET.levelAA, 'Level AA count');
    assert.equal(a + aa, CONFORMANCE_SET.aaSet);
  });

  test('does not list 4.1.1 Parsing, which WCAG 2.2 removed', () => {
    assert.equal(SC_TABLE['4.1.1'], undefined);
  });

  test('marks the six new WCAG 2.2 A/AA criteria as 2.2', () => {
    const expected = ['2.4.11', '2.5.7', '2.5.8', '3.2.6', '3.3.7', '3.3.8'];
    for (const sc of expected) {
      assert.equal(SC_TABLE[sc].minVersion, '2.2', `${sc} should be 2.2`);
      assert.ok(['A', 'AA'].includes(SC_TABLE[sc].level));
    }
    const aaOnly22 = Object.entries(SC_TABLE)
      .filter(([, e]) => e.minVersion === '2.2' && e.level !== 'AAA')
      .map(([sc]) => sc);
    assert.deepEqual(aaOnly22.sort(), expected.sort());
  });

  test('every entry has a name, level and version', () => {
    for (const [sc, entry] of Object.entries(SC_TABLE)) {
      assert.match(sc, /^\d\.\d\.\d+$/, `bad SC number ${sc}`);
      assert.ok(entry.name?.length > 2, `${sc} has no name`);
      assert.ok(['A', 'AA', 'AAA'].includes(entry.level), `${sc} bad level`);
      assert.ok(['2.0', '2.1', '2.2'].includes(entry.minVersion), `${sc} bad version`);
    }
  });
});

describe('scFromTag', () => {
  test('splits three-digit tags', () => {
    assert.equal(scFromTag('wcag111'), '1.1.1');
    assert.equal(scFromTag('wcag412'), '4.1.2');
    assert.equal(scFromTag('wcag143'), '1.4.3');
  });

  test('treats trailing digits as the criterion, not the guideline', () => {
    assert.equal(scFromTag('wcag2410'), '2.4.10');
    assert.equal(scFromTag('wcag1410'), '1.4.10');
    assert.equal(scFromTag('wcag2411'), '2.4.11');
  });

  test('ignores level tags and non-wcag tags', () => {
    assert.equal(scFromTag('wcag2aa'), null);
    assert.equal(scFromTag('wcag21a'), null);
    assert.equal(scFromTag('best-practice'), null);
    assert.equal(scFromTag('cat.color'), null);
  });
});

describe('levelFromTags / versionFromTags', () => {
  test('reads the level', () => {
    assert.equal(levelFromTags(['wcag2a', 'wcag412']), 'A');
    assert.equal(levelFromTags(['wcag2aa', 'wcag143']), 'AA');
    assert.equal(levelFromTags(['wcag21aa', 'wcag1410']), 'AA');
    assert.equal(levelFromTags(['wcag2aaa']), 'AAA');
    assert.equal(levelFromTags(['best-practice']), null);
  });

  test('reads the first version containing the criterion', () => {
    assert.equal(versionFromTags(['wcag2a']), '2.0');
    assert.equal(versionFromTags(['wcag21aa']), '2.1');
    assert.equal(versionFromTags(['wcag22aa']), '2.2');
    assert.equal(versionFromTags(['cat.forms']), null);
  });
});

describe('wcagForSc', () => {
  test('resolves a well-known criterion', () => {
    assert.deepEqual(wcagForSc('4.1.2'), {
      sc: '4.1.2',
      name: 'Name, Role, Value',
      level: 'A',
      minVersion: '2.0',
      wcag22Only: false,
    });
  });

  test('flags WCAG 2.2-only criteria', () => {
    assert.equal(wcagForSc('2.5.8').wcag22Only, true);
    assert.equal(wcagForSc('2.5.8').name, 'Target Size (Minimum)');
    assert.equal(wcagForSc('1.4.3').wcag22Only, false);
  });

  test('returns null for an unknown criterion', () => {
    assert.equal(wcagForSc('9.9.9'), null);
  });
});

describe('wcagFromTags (real axe tag sets)', () => {
  test('maps button-name to SC 4.1.2 Level A', () => {
    const w = wcagFromTags(['cat.name-role-value', 'wcag2a', 'wcag412', 'section508', 'ACT']);
    assert.equal(w.sc, '4.1.2');
    assert.equal(w.name, 'Name, Role, Value');
    assert.equal(w.level, 'A');
    assert.equal(w.minVersion, '2.0');
    assert.equal(w.wcag22Only, false);
  });

  test('maps color-contrast to SC 1.4.3 Level AA', () => {
    const w = wcagFromTags(['cat.color', 'wcag2aa', 'wcag143']);
    assert.equal(w.sc, '1.4.3');
    assert.equal(w.name, 'Contrast (Minimum)');
    assert.equal(w.level, 'AA');
  });

  test('maps target-size to SC 2.5.8 and flags it as WCAG 2.2-only', () => {
    const w = wcagFromTags(['cat.sensory-and-visual-cues', 'wcag22aa', 'wcag258']);
    assert.equal(w.sc, '2.5.8');
    assert.equal(w.wcag22Only, true);
    assert.equal(w.minVersion, '2.2');
  });

  test('keeps secondary criteria when a rule maps to several', () => {
    // link-name carries both 2.4.4 and 4.1.2.
    const w = wcagFromTags(['wcag2a', 'wcag244', 'wcag412']);
    assert.equal(w.sc, '2.4.4');
    assert.deepEqual(w.alsoSc, ['4.1.2']);
  });

  test('returns null for best-practice-only rules', () => {
    assert.equal(wcagFromTags(['cat.semantics', 'best-practice']), null);
  });

  test('falls back to tag-derived data for an unrecognised criterion', () => {
    const w = wcagFromTags(['wcag22aa', 'wcag999']);
    assert.equal(w.sc, '9.9.9');
    assert.equal(w.name, null);
    assert.equal(w.level, 'AA');
    assert.equal(w.minVersion, '2.2');
  });
});

describe('compareSc', () => {
  test('sorts numerically, not lexically', () => {
    const sorted = ['2.4.10', '2.4.2', '1.4.3', '2.4.9'].sort(compareSc);
    assert.deepEqual(sorted, ['1.4.3', '2.4.2', '2.4.9', '2.4.10']);
  });
});

describe('isBestPractice', () => {
  test('is true only when there is no criterion behind the rule', () => {
    assert.equal(isBestPractice(['best-practice', 'cat.semantics']), true);
    assert.equal(isBestPractice(['best-practice', 'wcag2a', 'wcag131']), false);
    assert.equal(isBestPractice(['wcag2aa', 'wcag143']), false);
  });
});

describe('axe-core metadata', () => {
  test('exposes ACT rule ids from the installed axe-core', () => {
    // Verified against axe-core 4.12.1 rule metadata.
    assert.deepEqual(actIdsForRule('button-name'), ['97a4e1', 'm6b1q3']);
    assert.ok(actIdsForRule('color-contrast').includes('afw4f7'));
    assert.deepEqual(actIdsForRule('not-a-real-rule'), []);
  });

  test('reports the installed axe-core version', () => {
    assert.match(axeCoreVersion(), /^\d+\.\d+\.\d+/);
  });
});

describe('formatCitation', () => {
  test('renders the SC-first citation format', () => {
    assert.equal(
      formatCitation(wcagForSc('4.1.2')),
      'SC 4.1.2 Name, Role, Value (Level A)',
    );
    assert.equal(formatCitation(wcagForSc('1.4.3')), 'SC 1.4.3 Contrast (Minimum) (Level AA)');
  });

  test('returns null when there is no criterion', () => {
    assert.equal(formatCitation(null), null);
    assert.equal(formatCitation({}), null);
  });
});
