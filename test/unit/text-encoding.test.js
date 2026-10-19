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
const ROOTS = ['src', 'plugin', 'skills', 'scripts'];
const TEXT = /\.(m?js|json|md|txt)$|(^|[\\/])LICENSE$/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (TEXT.test(entry.name)) out.push(full);
  }
  return out;
}

test('shipped text files are UTF-8 without a BOM or stray control bytes', () => {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const files = ROOTS.flatMap((r) => walk(path.join(REPO, r)));
  assert.ok(files.length > 20, `scanned ${files.length} files`);
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
