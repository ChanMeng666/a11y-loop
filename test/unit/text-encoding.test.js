import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The Anthropic plugin directory classed src/lib/fingerprint.js as binary, and so
// uninspectable, because a string literal held a raw NUL byte. Anything shipped as
// code or instructions has to read as plain text: valid UTF-8, no byte-order mark,
// and no control characters other than tab, line feed and carriage return
// (`core.autocrlf` checkouts carry CRLF).
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Whole trees scanned for every text file in them; images and other binaries are skipped by extension. */
const ROOTS = ['src', 'plugin', 'skills', 'scripts'];
const TEXT = /\.(m?js|json|md|txt)$|^LICENSE$/;

function walk(dir, match = TEXT) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, match));
    else if (match.test(entry.name)) out.push(full);
  }
  return out;
}

/** Files directly in `dir` (not below it) whose name matches. */
const shallow = (dir, match) =>
  readdirSync(path.join(REPO, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && match.test(e.name))
    .map((e) => path.join(REPO, dir, e.name));

/**
 * Prose is scanned too: a raw NUL slipped into AGENTS.md and CHANGELOG.md while
 * this test was being written. Root-level Markdown and llms.txt, all Markdown
 * under docs/, and the marketplace manifest.
 */
const extra = () => [
  ...shallow('.', /\.md$|^llms\.txt$/),
  ...walk(path.join(REPO, 'docs'), /\.md$/),
  ...shallow('.claude-plugin', /\.json$/),
];

test('shipped text files are UTF-8 without a BOM or stray control bytes', () => {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const files = [...ROOTS.flatMap((r) => walk(path.join(REPO, r))), ...extra()];
  for (const must of ['AGENTS.md', 'CHANGELOG.md', path.join('docs', 'overview.md'), path.join('.claude-plugin', 'marketplace.json'), path.join('plugin', 'README.md')]) {
    assert.ok(files.includes(path.join(REPO, must)), `${must} is scanned`);
  }
  const problems = [];
  for (const file of files) {
    const bytes = readFileSync(file);
    const rel = path.relative(REPO, file);
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) problems.push(`${rel}: byte-order mark`);
    try {
      decoder.decode(bytes);
    } catch {
      problems.push(`${rel}: not valid UTF-8`);
    }
    const bad = bytes.findIndex((b) => (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) || b === 0x7f);
    if (bad !== -1) problems.push(`${rel}: control byte 0x${bytes[bad].toString(16)} at offset ${bad}; write it as an escape`);
  }
  assert.deepEqual(problems, []);
});
