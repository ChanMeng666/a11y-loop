#!/usr/bin/env node
/**
 * Regenerate the copies inside `plugin/` from their canonical sources.
 *
 * The Claude Code plugin ships from `plugin/`, and an installed plugin gets only
 * that folder: nothing it runs may reach outside it. Two things it needs live
 * canonically elsewhere in the repo, so they are copied in:
 *
 *   - `skills/a11y-loop/evals/native/` + `trigger-evals.json` -> `plugin/evals/`
 *                                   (the native `claude plugin eval` suite)
 *   - `skills/a11y-loop/`        -> `plugin/skills/a11y-loop/`  (minus `evals/`,
 *                                   which is development material the skill
 *                                   never loads)
 *   - `src/lib/plan-gate.js`     -> `plugin/hooks/lib/plan-gate.mjs`
 *   - `LICENSE`                  -> `plugin/LICENSE`
 *
 * Edit the canonical file, then run `npm run sync-plugin`. Never edit a copy:
 * `test/unit/plugin-sync.test.js` fails whenever a copy differs from its source.
 *
 * `--check` reports drift and exits 1 instead of writing.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Directories copied whole, and the subdirectories of each that stay out of the plugin. */
const DIRS = [
  { from: 'skills/a11y-loop', to: 'plugin/skills/a11y-loop', exclude: ['evals'] },
  // The hand-written behaviour cases of the native `claude plugin eval` suite.
  // The trigger cases are generated from trigger-evals.json (see `generatedFiles`).
  { from: 'skills/a11y-loop/evals/native', to: 'plugin/evals', exclude: [], generated: true },
];

/** Single files copied as they are. */
const FILES = [
  { from: 'src/lib/plan-gate.js', to: 'plugin/hooks/lib/plan-gate.mjs' },
  { from: 'LICENSE', to: 'plugin/LICENSE' },
];

/**
 * The trigger-accuracy cases of the native eval suite, built from
 * `trigger-evals.json` so the prompts have one source. Returns
 * `{ [path relative to plugin/evals]: file text }`.
 *
 * A should-trigger case asserts the `a11y-loop` skill fires; with-only, because
 * the no-plugin arm cannot fire a skill it does not have, so the grader is a
 * plugin-fired indicator rather than part of the score. A should-not-trigger
 * case asserts it does not, in both arms.
 */
export function generatedFiles(root = REPO) {
  const queries = JSON.parse(readFileSync(path.join(root, 'skills/a11y-loop/evals/trigger-evals.json'), 'utf8'));
  const out = {};
  queries.forEach((q, i) => {
    const id = `trigger-${String(i + 1).padStart(2, '0')}-${q.should_trigger ? 'fires' : 'quiet'}`;
    out[`${id}/prompt.md`] =
      `---
name: ${id}
tags: [trigger, ${q.should_trigger ? 'should-trigger' : 'should-not-trigger'}]
runs: 1
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

${q.query}
`;
    out[`${id}/graders/skill-fired.md`] = q.should_trigger
      ? `---
type: tool_used
tool: Skill
input_match: '"skill"\\s*:\\s*"(?:[\\w-]+:)?a11y-loop"'
arm: with-only
---

The a11y-loop skill is invoked for this prompt.
`
      : `---
type: tool_used
tool: Skill
input_match: '"skill"\\s*:\\s*"(?:[\\w-]+:)?a11y-loop"'
min: 0
max: 0
arm: both
---

The a11y-loop skill is NOT invoked for this prompt.
`;
  });
  return out;
}

/** Every file under `dir`, relative to it, with forward slashes. */
function walk(dir, exclude = [], prefix = '') {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!prefix && exclude.includes(entry.name)) continue;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), exclude, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out.sort();
}

/**
 * The full copy plan: every `{ from, to }` pair that should exist, and every
 * file inside a copied directory that should not (a stale copy of something
 * since deleted or renamed at the source). Paths are relative to the repo.
 *
 * @returns {{ pairs: {from:string,to:string}[], stale: string[] }}
 */
export function copyPlan(root = REPO) {
  const pairs = [...FILES];
  const stale = [];
  for (const d of DIRS) {
    const sources = walk(path.join(root, d.from), d.exclude);
    for (const rel of sources) pairs.push({ from: `${d.from}/${rel}`, to: `${d.to}/${rel}` });
    const wanted = new Set(sources);
    if (d.generated) {
      for (const [rel, content] of Object.entries(generatedFiles(root))) {
        pairs.push({ from: 'skills/a11y-loop/evals/trigger-evals.json', to: `${d.to}/${rel}`, content });
        wanted.add(rel);
      }
    }
    for (const rel of walk(path.join(root, d.to))) if (!wanted.has(rel)) stale.push(`${d.to}/${rel}`);
  }
  return { pairs, stale };
}

/**
 * Compare contents with line endings normalised: the repo is checked out with
 * `core.autocrlf` on some machines and not others, and a copy that differs only
 * in CRLF is the same file once git has normalised it.
 */
const normalise = (buf) => buf.toString('utf8').replace(/\r\n/g, '\n');

/** @returns {string[]} one line per drifted, missing or stale copy */
export function drift(root = REPO) {
  const { pairs, stale } = copyPlan(root);
  const problems = [];
  for (const { from, to, content } of pairs) {
    const dest = path.join(root, to);
    if (!existsSync(dest)) problems.push(`missing: ${to} (copy of ${from})`);
    else if (normalise(content ?? readFileSync(path.join(root, from))) !== normalise(readFileSync(dest)))
      problems.push(`differs: ${to} (copy of ${from})`);
  }
  for (const s of stale) problems.push(`stale: ${s} (no longer in its source)`);
  return problems;
}

export function sync(root = REPO) {
  const { pairs, stale } = copyPlan(root);
  for (const { from, to, content } of pairs) {
    const dest = path.join(root, to);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, content ?? readFileSync(path.join(root, from)));
  }
  for (const s of stale) {
    rmSync(path.join(root, s));
    // Drop directories the removal left empty, up to the copy's own root.
    let dir = path.dirname(path.join(root, s));
    while (dir.startsWith(path.join(root, 'plugin')) && statSync(dir).isDirectory() && readdirSync(dir).length === 0) {
      rmSync(dir, { recursive: true });
      dir = path.dirname(dir);
    }
  }
  return { copied: pairs.length, removed: stale.length };
}

/** Entry check that survives a junction or symlink (see AGENTS.md on `src/cli.js`). */
function isMain() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  if (process.argv.includes('--check')) {
    const problems = drift();
    for (const p of problems) console.error(p);
    if (problems.length) {
      console.error('plugin/ is out of date with its sources. Run: npm run sync-plugin');
      process.exitCode = 1;
    } else {
      console.log('plugin/ copies match their sources.');
    }
  } else {
    const { copied, removed } = sync();
    console.log(`plugin/: ${copied} file(s) copied, ${removed} stale file(s) removed.`);
  }
}
