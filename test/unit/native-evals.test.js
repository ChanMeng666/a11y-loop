import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import { REPO } from '../../scripts/sync-plugin.mjs';

// Structure checks for the native `claude plugin eval` suite shipped in
// plugin/evals/. They run no model: they stop a case that the evaluator would
// refuse to load ("a case without a grader fails to load") from reaching CI-less main.

const EVALS = path.join(REPO, 'plugin', 'evals');
const cases = readdirSync(EVALS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const triggers = JSON.parse(readFileSync(path.join(REPO, 'skills/a11y-loop/evals/trigger-evals.json'), 'utf8'));

describe('native plugin eval suite', () => {
  test('one trigger case per entry in trigger-evals.json', () => {
    const got = cases.filter((c) => c.startsWith('trigger-'));
    assert.equal(got.length, triggers.length);
    assert.equal(got.filter((c) => c.endsWith('-fires')).length, triggers.filter((t) => t.should_trigger).length);
    assert.equal(got.filter((c) => c.endsWith('-quiet')).length, triggers.filter((t) => !t.should_trigger).length);
  });

  test('at least six behaviour cases', () => {
    assert.ok(cases.filter((c) => c.startsWith('behaviour-')).length >= 6);
  });

  test('every case has a prompt and at least one grader with a type', () => {
    for (const c of cases) {
      assert.ok(existsSync(path.join(EVALS, c, 'prompt.md')), `${c}: prompt.md`);
      const graders = path.join(EVALS, c, 'graders');
      const files = existsSync(graders) ? readdirSync(graders).filter((f) => f.endsWith('.md')) : [];
      assert.ok(files.length > 0, `${c}: no graders`);
      for (const f of files) {
        const text = readFileSync(path.join(graders, f), 'utf8');
        assert.match(text, /^---\r?\ntype: (regex|tool_used|tool_order|file_exists|llm|baseline)\b/, `${c}/${f}: type`);
      }
    }
  });

  test('every regex grader compiles', () => {
    for (const c of cases) {
      const graders = path.join(EVALS, c, 'graders');
      for (const f of readdirSync(graders)) {
        const text = readFileSync(path.join(graders, f), 'utf8');
        for (const m of text.matchAll(/^(?:pattern|input_match): '(.*)'$/gm)) {
          assert.doesNotThrow(() => new RegExp(m[1]), `${c}/${f}: ${m[1]}`);
        }
      }
    }
  });
});
