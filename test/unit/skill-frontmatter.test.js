import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Agent Skills specification limits (https://agentskills.io/specification).
// A description over 1024 characters makes `skills-ref validate` fail, and
// installers that enforce the spec reject or truncate the skill.
const SKILL_DIR = path.dirname(fileURLToPath(new URL('../../skills/a11y-loop/SKILL.md', import.meta.url)));
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md');

/**
 * Read the top-level scalar fields of the frontmatter. Handles plain values and
 * folded (`>-`) blocks, which is all SKILL.md uses for the fields tested here.
 * A folded block joins its lines with single spaces, as YAML does.
 */
function readFrontmatter(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  assert.equal(lines[0], '---', 'SKILL.md must start with a frontmatter fence');
  const end = lines.indexOf('---', 1);
  assert.ok(end > 0, 'frontmatter must be closed by a second --- fence');
  const fields = {};
  for (let i = 1; i < end; i++) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    let [, key, value] = m;
    if (/^[>|][-+]?$/.test(value)) {
      const parts = [];
      while (i + 1 < end && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(' ');
    } else {
      value = value.replace(/^(['"])(.*)\1$/, '$2');
    }
    fields[key] = value;
  }
  return fields;
}

describe('SKILL.md frontmatter against the Agent Skills specification', () => {
  const fm = readFrontmatter(readFileSync(SKILL_FILE, 'utf8'));

  test('name matches its directory and the spec name rules', () => {
    assert.equal(fm.name, path.basename(SKILL_DIR));
    assert.ok(fm.name.length >= 1 && fm.name.length <= 64, 'name is 1-64 characters');
    assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase alphanumerics and single hyphens, none at either end');
  });

  test('description is 1-1024 characters', () => {
    assert.ok(fm.description, 'description is present and non-empty');
    assert.ok(
      fm.description.length <= 1024,
      `description is ${fm.description.length} characters, the spec maximum is 1024`,
    );
  });

  test('description keeps the plan, generation and audit triggers and the negative clause', () => {
    for (const phrase of ['planning', 'generating or modifying', 'accessibility audit', 'Not for backend-only work with no UI']) {
      assert.ok(fm.description.includes(phrase), `description names "${phrase}"`);
    }
  });

  test('compatibility is at most 500 characters and names the bundled browser installer', () => {
    assert.ok(fm.compatibility, 'compatibility is present');
    assert.ok(
      fm.compatibility.length <= 500,
      `compatibility is ${fm.compatibility.length} characters, the spec maximum is 500`,
    );
    assert.match(fm.compatibility, /a11y-loop install-browser/);
    assert.doesNotMatch(fm.compatibility, /npx playwright install/);
  });
});
