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
