# AGENTS.md — a11y-loop

This file provides project guidance to AI coding assistants (Claude Code, GitHub Copilot, Cursor,
Codex, etc.) working with this repository. Read it before writing or changing any code.

## Project Overview

a11y-loop — makes AI coding agents decide accessibility while the work is still being planned and
write accessible UI by default, then proves what it can prove with a real browser audit across the
states it built, and tells you exactly what it could not check. Two layers: an Agent Skill
(`skill/a11y-loop/`, open Agent Skills standard) supplying plan rules, standing generation rules
and honesty rules, and a Node CLI (`src/`) supplying `audit` / `contrast --fix` / `diff`. A third,
*optional* layer (`.claude-plugin/`, `hooks/`, `commands/`) enforces the plan phase in Claude Code
only; nothing under `skill/` may depend on it.

- **Primary language / stack:** Node.js ≥ 20, ESM, Playwright + axe-core
- **Default branch:** `main`
- **Repository:** https://github.com/ChanMeng666/a11y-loop
- **Published to npm as `a11y-loop`; GitHub remote is `ChanMeng666/a11y-loop`.** A local clone is
  only needed for development — `npx a11y-loop <command>` works with no local setup.

## Installing this project for an end user

If a user asks you to install or set up a11y-loop for them, run this — every command is
non-interactive, idempotent, and needs no TTY, so do it yourself rather than handing it back:

```bash
npm i -g a11y-loop
npx playwright install chromium
mkdir -p ~/.claude/skills
cp -r "$(npm root -g)/a11y-loop/skill/a11y-loop" ~/.claude/skills/   # portable skill
claude plugin marketplace add ChanMeng666/a11y-loop                  # Claude Code only
claude plugin install a11y-loop@chanmeng-a11y-loop --scope user      # Claude Code only
```

Then verify, and report the actual output rather than asserting success:

```bash
a11y-loop --version
test -f ~/.claude/skills/a11y-loop/references/plan-phase.md && echo "skill ok"
claude plugin list | grep -A2 'a11y-loop@'    # expect: Status: ✔ enabled
```

Notes that matter when scripting this:

- **No `git clone` needed** — the skill ships inside the npm package at
  `$(npm root -g)/a11y-loop/skill/a11y-loop`.
- **Install the skill or the plugin, not both.** The plugin carries its own copy. Doing both
  registers the skill twice — the model sees `a11y-loop` *and* the directory-qualified
  `a11y-loop:a11y-loop`, and pays the always-on token cost twice. If you see both names, delete
  `~/.claude/skills/a11y-loop` and keep the plugin.
- **`--scope user` is the default choice.** `--scope project` writes a committable
  `.claude/settings.json` (`extraKnownMarketplaces` + `enabledPlugins`), but project-scoped plugins
  and hooks sit behind Claude Code's workspace-trust prompt on first open. That prompt is a
  security boundary and must not be worked around — recommend user scope instead.
- **Teardown and management are non-interactive too:** `claude plugin disable|enable|uninstall`.
  Only `uninstall --prune` needs `-y`.
- A new session is required before a newly installed skill or hook takes effect.

## Commands

```bash
# Install dependencies
npm install

# Install the Chromium build Playwright/the audit engine need — required before
# any test or CLI run that touches a real browser
npx playwright install chromium

npm test                   # full suite (node --test)
npm run test:unit          # unit tests only — no browser needed
npm run test:integration   # integration tests only — launches real Chromium

# Run the CLI directly from a checkout (no global install)
node src/cli.js audit --html "<button>hi</button>"
```

> If a command above is missing or wrong, check the project manifest (e.g. `package.json` scripts,
> `Makefile`, `pyproject.toml`) and update this file — keeping AGENTS.md accurate is part of the work.

If you keep Playwright browsers off the system drive, set `PLAYWRIGHT_BROWSERS_PATH` before both
`npx playwright install chromium` and before running tests — the two must agree on the same path
or Playwright will report a missing browser.

## Architecture & Conventions

- **`skill/a11y-loop/SKILL.md`** — the agent-facing standing instructions, in four sections that
  follow the lifecycle: §0 plan rules (decisions made while scoping, before any code), §1 generation
  rules, §2 the mandatory audit loop, §3 honesty rules for talking about results.
  `skill/a11y-loop/references/` holds the supporting docs (plan-phase guidance, AI-specific failure
  modes, APG patterns, manual-testing guidance, a WCAG 2.2 quick reference) loaded on demand, not
  upfront. `skill/a11y-loop/evals/` holds trigger-accuracy and behavior evals for the skill itself.
- **`.claude-plugin/`, `hooks/`, `commands/`** — an *optional* Claude-Code-only layer. `hooks/
  plan-gate.mjs` is a `PreToolUse` hook on `ExitPlanMode` that declines a plan changing UI work with
  no accessibility content in it. Nothing in `skill/` may depend on this layer, and nothing in this
  layer may appear in `SKILL.md` or `references/` — the skill has to stay portable across the 40+
  clients that implement the Agent Skills standard. The hook's own invariants are documented in its
  header comment; the load-bearing ones are that it never blocks on its own failure, defers rather
  than allows, and declines a given plan at most once.
- **`src/cli.js`** — argument parsing and dispatch only; each subcommand's logic lives in
  `src/commands/{audit,contrast,diff}.js`. Exit codes (`EXIT.OK=0`, `EXIT.FINDINGS=1`,
  `EXIT.ERROR=2`) are a stable contract — don't repurpose them.
- **`src/lib/`** — the engine: `axe-runner.js` (Playwright + axe-core orchestration across the
  five rendering passes), `checks/` (a11y-loop's own checks that axe can't run — dialog focus
  trap, div-button, focus-visible, keyboard, link-text, reduced-motion, reflow, target-size),
  `contrast-math.js` + `suggest-color.js` (WCAG contrast + OKLCh fix suggestions), `fingerprint.js`
  (stable finding IDs for `diff`), `diff.js` (FIXED/NEW/REMAINING classification), `finding.js`
  (the shared finding shape), `format/` (`json.js`, `human.js`, `sarif.js`, `checklist.js` — one
  serializer per output format), `wcag-map.js` (rule → WCAG SC + ACT ID mapping), `serve.js` and
  `browser-utils.js` (local static serving for `--file`/`--html`, and Playwright lifecycle helpers).
- **`demo/before/` and `demo/after/`** — the seeded-violation fixture and its fixed counterpart
  that back the README's headline claim and `test/integration/demo.test.js`. `VIOLATIONS.md` and
  `FIXES.md` are the finding-by-finding record — keep them in sync with the actual markup if you
  touch these files.
- **`test/fixtures/manifest.json`** — the fixture matrix driving `test/integration/fixtures.test.js`:
  one seeded-violation HTML fixture per failure class, declared in the manifest rather than
  hardcoded per-test, so adding a fixture means adding a manifest entry plus the HTML file.
- **`evals/`** — the baseline-vs-skilled benchmark (`benchmark-results.md` + `outputs/baseline/`,
  `outputs/skilled/`). This is evidence, not fixtures — don't regenerate `outputs/` casually; a
  real regeneration means re-running both generation conditions and re-auditing.
- **`docs/research/`** — the market/competitive and standards/regulatory briefings that ground the
  tool's claims and citations (coverage percentages, WCAG version mapping, credibility red lines).
  Consult before changing any claim in README, SKILL.md, or CLI output about what the tool covers.

## Gotchas & Anti-patterns

- **Never weaken the honesty language.** No "compliant", "guarantees", "fully accessible",
  "automatically fixes accessibility", "reduces legal risk", "no manual testing needed", or a
  single accessibility score — anywhere: README, SKILL.md, CLI output, commit messages describing
  the tool. This is a deliberate, researched red line (see `docs/research/market.md` §A2), not house
  style you can relax for convenience.
- **Don't audit over `file://`.** `--file` and `--html` serve content over local HTTP first —
  axe-core and some browser APIs behave differently (or refuse to run) over `file://`.
- **The `--interact` loop discipline:** when you touch demo pages or add interaction-state
  fixtures, re-run the full audit-fix-re-audit loop to convergence (0 violations, `diff` reports
  "Converged") before considering the change done — a partially-fixed demo undermines the tool's
  own headline claim.
- **axe tags are not cumulative.** `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` must each
  be listed explicitly wherever axe options are configured; omitting one silently drops that tier's
  coverage rather than erroring.
- **The W3C ACT-rules-to-axe-core report is stale** (per `docs/research/standards.md` §4) — derive
  ACT rule ID mappings from axe-core's own rule metadata at the pinned version, not from that
  report.
- **SARIF is secondary, and deliberately so** — see `src/lib/format/sarif.js`'s own comment on why
  GitHub Code Scanning drops URL+selector-located results. Don't "fix" this by inventing fake file
  paths to satisfy Code Scanning; that would misrepresent the findings' actual location.
- **Fixture tests are manifest-driven.** Adding a new seeded-violation fixture without a
  corresponding `test/fixtures/manifest.json` entry means it's inert — it won't be picked up by
  `test/integration/fixtures.test.js`.

## Reading Order

When onboarding to this repo, read in this order:
1. `README.md` — what the project is and how to run it
2. This `AGENTS.md` — how to work in it
3. `skill/a11y-loop/SKILL.md` — the product's actual contract with an agent; §3 also governs how
   anything in this repo is allowed to describe its own results
4. `CONTRIBUTING.md` — contribution workflow and quality gates

## Conventions for Changes

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Run the project's lint/test commands before proposing changes.
- Keep this file up to date when you change build steps, structure, or conventions.
