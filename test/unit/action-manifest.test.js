import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// GitHub Marketplace validates action.yml at the release's own tag. It rejected v0.4.0 because the
// description was about 260 characters. This reads only the top-level keys it needs.
const text = readFileSync(new URL('../../action.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const lines = text.split('\n');

function topLevel(key) {
  const i = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (i < 0) return undefined;
  const rest = lines[i].slice(key.length + 1).trim();
  if (/^[>|][+-]?$/.test(rest)) {
    const body = [];
    for (let j = i + 1; j < lines.length && (lines[j] === '' || /^\s/.test(lines[j])); j++) body.push(lines[j].trim());
    return body.join(' ').trim();
  }
  return rest.replace(/^(["'])(.*)\1$/, '$2');
}

function brandingValue(key) {
  const i = lines.findIndex((l) => l.startsWith('branding:'));
  if (i < 0) return undefined;
  for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) {
    const m = lines[j].match(/^\s+([a-z-]+):\s*(.+?)\s*$/);
    if (m && m[1] === key) return m[2];
  }
  return undefined;
}

test('action.yml has a name', () => {
  assert.ok(topLevel('name'));
});

test('action.yml description fits the GitHub Marketplace limit of 125 characters', () => {
  const description = topLevel('description');
  assert.ok(description, 'description is present');
  assert.ok(description.length < 125, `description is ${description.length} characters`);
});

test('action.yml has the branding the Marketplace listing needs', () => {
  assert.ok(brandingValue('icon'), 'branding.icon is present');
  assert.ok(brandingValue('color'), 'branding.color is present');
});
