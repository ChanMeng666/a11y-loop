import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  fingerprint,
  normalizeSelector,
  normalizeHtmlShape,
} from '../../src/lib/fingerprint.js';

describe('normalizeSelector', () => {
  test('normalises whitespace around child combinators', () => {
    assert.equal(normalizeSelector('html>body   >  main>button'), 'html > body > main > button');
  });

  test('flattens axe ancestry arrays', () => {
    assert.equal(normalizeSelector([['html > body', 'button']]), 'html > body | button');
  });

  test('flattens a plain frame array', () => {
    assert.equal(normalizeSelector(['#frame', 'button']), '#frame | button');
  });

  test('lowercases and unifies quote style', () => {
    assert.equal(normalizeSelector('INPUT[type="text"]'), "input[type='text']");
  });

  test('tolerates null and undefined entries', () => {
    assert.equal(normalizeSelector([null, 'button', undefined]), 'button');
    assert.equal(normalizeSelector(undefined), '');
  });
});

describe('normalizeHtmlShape', () => {
  test('reduces an element to tag plus sorted attribute names', () => {
    assert.equal(normalizeHtmlShape('<button class="a b" onclick="x">Hi</button>'), 'button[class,onclick]');
  });

  test('sorts attribute names so source order does not matter', () => {
    const a = normalizeHtmlShape('<img src="x" alt="" width="10">');
    const b = normalizeHtmlShape('<img width="10" alt="" src="x">');
    assert.equal(a, b);
    assert.equal(a, 'img[alt,src,width]');
  });

  test('ignores attribute values and text content', () => {
    assert.equal(
      normalizeHtmlShape('<button class="btn-primary">Save</button>'),
      normalizeHtmlShape('<button class="totally-different">Submit now</button>'),
    );
  });

  test('keeps role and type values because they change semantics', () => {
    assert.equal(normalizeHtmlShape('<div role="button">x</div>'), 'div[role][role=button]');
    assert.notEqual(
      normalizeHtmlShape('<div role="button">x</div>'),
      normalizeHtmlShape('<div role="link">x</div>'),
    );
    assert.notEqual(
      normalizeHtmlShape('<input type="text">'),
      normalizeHtmlShape('<input type="checkbox">'),
    );
  });

  test('handles valueless attributes', () => {
    assert.equal(normalizeHtmlShape('<input disabled required>'), 'input[disabled,required]');
  });

  test('handles self-closing and bare tags', () => {
    assert.equal(normalizeHtmlShape('<img />'), 'img[]');
    assert.equal(normalizeHtmlShape('<p>'), 'p[]');
  });

  test('degrades gracefully on non-markup input', () => {
    assert.equal(normalizeHtmlShape('just text'), 'just text');
    assert.equal(normalizeHtmlShape(undefined), '');
  });
});

describe('fingerprint', () => {
  const base = {
    ruleId: 'button-name',
    selector: [['html > body > button']],
    html: '<button class="cta"></button>',
  };

  test('is a 12-character hex string', () => {
    assert.match(fingerprint(base), /^[0-9a-f]{12}$/);
  });

  test('is stable across repeated calls', () => {
    assert.equal(fingerprint(base), fingerprint({ ...base }));
  });

  test('is stable when only class values or label text change', () => {
    assert.equal(
      fingerprint(base),
      fingerprint({ ...base, html: '<button class="cta cta--large">   </button>' }),
    );
  });

  test('is stable across equivalent selector formatting', () => {
    assert.equal(
      fingerprint(base),
      fingerprint({ ...base, selector: 'html>body>button' }),
    );
  });

  test('changes when the rule changes', () => {
    assert.notEqual(fingerprint(base), fingerprint({ ...base, ruleId: 'color-contrast' }));
  });

  test('changes when the element moves', () => {
    assert.notEqual(
      fingerprint(base),
      fingerprint({ ...base, selector: [['html > body > main > button']] }),
    );
  });

  test('changes when the element type changes', () => {
    assert.notEqual(fingerprint(base), fingerprint({ ...base, html: '<div class="cta"></div>' }));
  });

  test('distinguishes two sibling elements with different selectors', () => {
    const a = fingerprint({ ...base, selector: 'button:nth-child(1)' });
    const b = fingerprint({ ...base, selector: 'button:nth-child(2)' });
    assert.notEqual(a, b);
  });

  test('survives missing html', () => {
    assert.match(fingerprint({ ruleId: 'html-has-lang', selector: 'html' }), /^[0-9a-f]{12}$/);
  });
});

// Each test below kills a mutant of src/lib/fingerprint.js that the tests above
// let survive; the comment names it. Equivalent mutants have no test here.
describe('fingerprint: mutation-tested edges', () => {
  // Kills `.trim()` dropped, `/\s+/g` → `/\s/g`, and `.filter(Boolean)` dropped:
  // whitespace and an empty frame segment must not change the selector.
  test('normalizeSelector trims, collapses runs of spaces and drops empty segments', () => {
    assert.equal(normalizeSelector('  #a  '), '#a');
    assert.equal(normalizeSelector('div    span'), 'div span');
    assert.equal(normalizeSelector(['#a', '  ']), '#a');
  });

  // Kills `.slice(0, 60)` and `.trim()` dropped on the no-tag path.
  test('a snippet with no tag is trimmed and capped at 60 characters', () => {
    assert.equal(normalizeHtmlShape(`  ${'X'.repeat(80)}`), 'x'.repeat(60));
  });

  // Kills `\s*=\s*` → `\S*=\s*`: spaces around `=` would turn the value into
  // a second attribute name.
  test('spaces around = still read the value', () => {
    assert.equal(normalizeHtmlShape('<div role = "button">'), 'div[role][role=button]');
  });

  // Kills the single-quoted alternative `'([^']*)'` → `'([^'])'` or `'([']*)'`,
  // and the unquoted alternative `([^\s"'>]+)` → `([^\s"'>])`, `([\s"'>]+)`
  // or `([^\S"'>]+)`.
  test('single-quoted and unquoted semantic values are read in full', () => {
    assert.equal(normalizeHtmlShape("<input type='checkbox'>"), 'input[type][type=checkbox]');
    assert.equal(normalizeHtmlShape('<input type=checkbox>'), 'input[type][type=checkbox]');
  });

  // Kills `value.trim().toLowerCase()` → `value` and the `?? ''` default for
  // an attribute with no value.
  test('semantic values are case- and space-insensitive; a bare attribute has an empty value', () => {
    assert.equal(normalizeHtmlShape('<div role=" Button ">'), 'div[role][role=button]');
    assert.equal(normalizeHtmlShape('<div role>'), 'div[role][role=]');
  });

  // Kills the semantic list's `.join('')` → a separator.
  test('two semantic attributes are written back to back', () => {
    assert.equal(normalizeHtmlShape('<input role="switch" type="checkbox">'), 'input[role,type][role=switch][type=checkbox]');
  });

  // Kills `.join('\u0000')` → `.join('')`: without a separator, text can slide
  // from one field into the next and two different findings hash the same.
  test('fields cannot run into each other', () => {
    assert.notEqual(
      fingerprint({ ruleId: 'a', selector: 'b', html: '' }),
      fingerprint({ ruleId: 'ab', selector: '', html: '' }),
    );
  });
});
