# AGENTS.md — a11y-loop

This file provides project guidance to AI coding assistants (Claude Code, GitHub Copilot, Cursor,
Codex, etc.) working with this repository. Read it before writing or changing any code.

## Project Overview

a11y-loop — makes AI coding agents decide accessibility while the work is still being planned and
write accessible UI by default, then proves what it can prove with a real browser audit across the
states it built, and tells you exactly what it could not check. Two layers: an Agent Skill
(`skills/a11y-loop/`, open Agent Skills standard) supplying plan rules, standing generation rules
and honesty rules, and a Node CLI (`src/`) supplying `audit` / `contrast --fix` / `diff`. A third,
*optional* layer (`plugin/`, published through the root `.claude-plugin/marketplace.json`)
enforces the plan phase in Claude Code only; nothing under `skills/` may depend on it.

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
a11y-loop install-browser                                            # Chromium for a11y-loop's own Playwright
npx skills add ChanMeng666/a11y-loop -g -y                           # portable skill, any client
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

- **No `git clone` needed** — `npx skills add` fetches the skill from GitHub, and it also ships
  inside the npm package at `$(npm root -g)/a11y-loop/skills/a11y-loop` for a manual copy.
- **Claude Code one-liner (2.1.292 or later):** `claude plugin install a11y-loop --marketplace
  ChanMeng666/a11y-loop` adds the marketplace and installs the plugin in one step.
- **Install the skill or the plugin, not both.** The plugin carries its own copy. Doing both
  registers the skill twice — the model sees `a11y-loop` *and* the directory-qualified
  `a11y-loop:a11y-loop`, and pays the always-on token cost twice. If you see both names, delete
  `~/.claude/skills/a11y-loop` and keep the plugin.
- **`--scope user` is the default choice.** `--scope project` writes a committable
  `.claude/settings.json` (`extraKnownMarketplaces` + `enabledPlugins`), but project-scoped plugins
  and hooks sit behind Claude Code's workspace-trust prompt on first open. That prompt is a
  security boundary and must not be worked around — recommend user scope instead.
- **Upgrading is a different command from installing.** `claude plugin install` on an
  already-installed plugin reports "already installed" and does nothing. Use:
  ```bash
  npm i -g a11y-loop@latest
  npx skills add ChanMeng666/a11y-loop -g -y                           # if using the skill
  claude plugin marketplace update chanmeng-a11y-loop                  # if using the plugin
  claude plugin update a11y-loop@chanmeng-a11y-loop
  ```
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

- **`skills/a11y-loop/SKILL.md`** — the agent-facing standing instructions, in four sections that
  follow the lifecycle: §0 plan rules (decisions made while scoping, before any code), §1 generation
  rules, §2 the mandatory audit loop, §3 honesty rules for talking about results.
  `skills/a11y-loop/references/` holds the supporting docs (plan-phase guidance, AI-specific failure
  modes, APG patterns, manual-testing guidance, a WCAG 2.2 quick reference) loaded on demand, not
  upfront. `skills/a11y-loop/evals/` holds trigger-accuracy and behavior evals for the skill itself.
- **`plugin/`** — an *optional* Claude-Code-only layer, and the plugin root: an installed plugin
  gets this folder and nothing else. `plugin/.claude-plugin/plugin.json` (+ `icon.png`) is the
  manifest, `plugin/hooks/` the hook, `plugin/commands/` the `/a11y-plan` command. The root
  `.claude-plugin/marketplace.json` makes the repo installable
  (`claude plugin marketplace add ChanMeng666/a11y-loop`) with `plugins[0].source` = `./plugin`,
  and is why the marketplace is named `chanmeng-a11y-loop` while the plugin inside it is
  `a11y-loop` — installs are `a11y-loop@chanmeng-a11y-loop`. `plugin/hooks/plan-gate.mjs` is a
  `PreToolUse` hook on `ExitPlanMode` that declines a plan changing UI work with no
  accessibility content in it. Three things in `plugin/` are generated copies, never edited by
  hand: `plugin/skills/a11y-loop/` (from `skills/a11y-loop/`, minus `evals/`),
  `plugin/hooks/lib/plan-gate.mjs` (from `src/lib/plan-gate.js`) and `plugin/LICENSE`. Edit the
  original and run `npm run sync-plugin` (`scripts/sync-plugin.mjs`);
  `test/unit/plugin-sync.test.js` fails while any copy differs, and also fails if anything in
  `plugin/` names a `../` path or `${CLAUDE_SKILL_DIR}`, or if a `package.json` or lockfile
  appears there. `plugin/README.md` is hand-written and is what the plugin directory and
  `claude plugin details` read. Nothing in `skills/`
  may depend on this layer, and nothing in this layer may appear in `SKILL.md` or `references/` —
  the skill has to stay portable across the 40+ clients that implement the Agent Skills standard.
  The hook's own invariants are documented in its header comment; the load-bearing ones are that it
  never blocks on its own failure, never returns `allow` (off the deny path it returns
  `additionalContext` with no `permissionDecision` at all, so the user's plan-approval prompt still
  appears), and declines a given plan at most once. The hook holds none of the decision itself: it
  dynamically imports its copy `./lib/plan-gate.mjs` of `src/lib/plan-gate.js` (see below), and
  if that copy is missing or throws it exits 0 with no verdict.
- **`src/cli.js`** — argument parsing and dispatch only; each subcommand's logic lives in
  `src/commands/{audit,contrast,diff,doctor,install-browser,plan-check}.js`. Exit codes (`EXIT.OK=0`, `EXIT.FINDINGS=1`,
  `EXIT.ERROR=2`) are a stable contract — don't repurpose them.
- **`src/lib/`** — the engine: `axe-runner.js` (Playwright + axe-core orchestration across the
  five rendering passes), `checks/` (a11y-loop's own checks that axe can't run — dialog focus
  trap, div-button, focus-visible, keyboard, link-text, reduced-motion, reflow, target-size),
  `contrast-math.js` + `suggest-color.js` (WCAG contrast + OKLCh fix suggestions), `fingerprint.js`
  (stable finding IDs for `diff`), `diff.js` (FIXED/NEW/REMAINING classification), `finding.js`
  (the shared finding shape, including the `evidence` tier), `cluster.js` (root-cause clusters:
  colour pair for contrast, selector pattern otherwise; additive, every row stays in `findings`),
  `format/` (`json.js`, `human.js`, `sarif.js`, `checklist.js` — one
  serializer per output format), `wcag-map.js` (rule → WCAG SC + ACT ID mapping), `serve.js` and
  `browser-utils.js` (local static serving for `--file`/`--html`, and Playwright lifecycle helpers),
  and `plan-gate.js` — the plan gate's pure decision (is this UI work, does it carry accessibility
  content), shared by `plugin/hooks/plan-gate.mjs` (through its copy) and `a11y-loop plan-check`.
  It may import only `node:` built-ins, because the copy has to run on its own. No I/O, no state, nothing
  Claude-Code-specific: the loop guard, session cap and kill switch stay in the hook, and the CLI
  is stateless.
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
- **`:modal` is not "is a dialog open".** It matches ONLY a native `<dialog>` opened with
  `showModal()`. Every React popup library ships a portalled `<div role="dialog">` instead —
  usually with no `aria-modal` attribute at all, hiding the rest of the page with `aria-hidden` on
  the siblings — so anything gated on `:modal` silently treats an open sheet as no dialog at all.
  `modalDialogRoot()` in `src/lib/browser-utils.js` is the one place that reads that shape; go
  through it rather than adding another `:modal` query. This cost a release: the survey root fell
  back to `document.body`, the focus sentinel landed outside the open dialog, and a perfectly
  trapped sheet was reported `keyboard-unreachable` and `dialog-focus-not-trapped` — the better the
  trap, the worse the report. See the 0.2.5 entry in `CHANGELOG.md`.
- **A survey that drives the keyboard must not outrun the page, and must not judge the wreckage of
  the survey before it.** Two lessons from the same bug. Traps built on `requestAnimationFrame`
  (floating-ui's `enqueueFocus`, so Base UI's and Radix's) cancel a pending hand-back when another
  arrives, so synthetic Tab presses faster than a frame keep focus parked outside the dialog and
  the probe then reports the page for not keeping up. And the dialog probe runs last, after three
  other surveys have each walked the page and left focus wherever they finished — on a portalled
  dialog, focus resting outside is itself enough for the library to begin tearing the modal
  treatment down. Re-establish the precondition before measuring, and let the page settle.
- **Not every defensive change earns its place.** A wrap-tolerant Tab walk was written for this
  same fix, looked obviously right, and changed no measured outcome on either the fixture matrix or
  a live page — the symptom it targeted was a consequence of the wrong survey root and disappeared
  with it. It was removed rather than shipped. Mutate the code and watch the test go red; if
  nothing goes red anywhere, that is an answer, not a gap in the tests.
- **Fixture tests are manifest-driven.** Adding a new seeded-violation fixture without a
  corresponding `test/fixtures/manifest.json` entry means it's inert — it won't be picked up by
  `test/integration/fixtures.test.js`.
- **Known false positives are documented, never suppressed — and if that ever changes, the
  mechanism already exists.** `docs/overview.md` § Field Notes and
  `skills/a11y-loop/references/manual-testing.md` carry the rows a production run produces that are
  not defects. The loudest by far is `color-contrast` in the forced-colors pass: axe-core 4.12.1
  reads an element's foreground from `-webkit-text-fill-color` before `color` (`getTextColor()`),
  and Chromium's forced-colors emulation forces `color` and the background but leaves
  `-webkit-text-fill-color` at the author's value, so light-on-dark text is compared against a
  forced white background and every line on a dark surface is reported. This one is now handled
  in code: `reviewRouting()` in `src/lib/axe-runner.js` routes a contrast-rule violation from the
  `forced-colors` pass, and only that pass, to `needsReview` with `routedFrom`, `note` and
  `noteUrl`, and drops its colour suggestion. It is the same mechanism that always downgrades
  `target-size`. `test/fixtures/fixture-forced-colors-dark-surface.html` is its regression target:
  exit 1 without the routing, exit 0 with it. On the demo and every other fixture no row moved,
  because each forced-colors contrast failure there also fails in another pass and
  `dedupeFindings()` lets a violation from any pass win. Adding another rule to the routing
  changes what counts as a violation and therefore the exit code, so it needs the same: a fixture,
  a before/after measurement across the matrix and the demo, and its own release note.
- **An entry guard must realpath `process.argv[1]` before comparing it with `import.meta.url`.**
  `src/cli.js` ends with an entry guard so tests can import `main` freely. Node resolves
  `import.meta.url` through a junction or symlink to the real path while `process.argv[1]` keeps
  the path as invoked. Up to 0.2.x the guard compared the two raw values, so the CLI exited
  **0 with no output** — which reads like a pass — whenever it was started through a link: a
  Windows worktree reached through a junction, and every `npm i -g` / `npx` install on Linux and
  macOS, where npm installs the bin as a symlink into `lib/node_modules` (Windows got `.cmd` shims
  that pass the real path, which is why it went unnoticed). Fixed in 0.3.0: `isEntryPoint()`
  resolves `argv[1]` with `realpathSync` first, falling back to the raw path if that throws.
  `test/integration/symlink-entry.test.js` runs `--version` and a real `audit` through a file
  symlink and a directory junction. Any new entry point (a second bin, a hook script) needs the same
  treatment.

### Skill frontmatter and the plugin layer

Each of these was learned the expensive way — by shipping the mistake — so they are recorded here
rather than left to be rediscovered.

- **Never re-add `paths:` to `SKILL.md`.** It reads like a filter that narrows an always-listed
  skill. It is not: Claude Code partitions skills on load, and one declaring a non-empty `paths`
  goes into a separate `conditionalSkills` registry, held *out* of the model-visible listing until
  a matching file is touched (`[skills] Activated conditional skill '<name>' (matched path: …)`).
  The frontmatter's own doc string says so — *"The skill only loads when the model touches matching
  files."* This skill must fire while planning, before any UI file exists, and on audit requests
  that name only a URL. `paths` made both unreachable. Solve over-triggering in the `description`'s
  negative clauses and in `evals/trigger-evals.json` instead.
- **`plugin.json` names no `skills` key, on purpose.** The skill lives in `skills/a11y-loop/` at the
  repo root and in `plugin/skills/a11y-loop/` inside the plugin, the conventional folder in both,
  so Claude Code, Codex, `npx skills`, `gh skill` and the Agent Plugins standard all find it with
  no manifest help. `npx skills add` on the repo still finds one skill, not two (checked
  2026-10-19). This repo used to keep it in `skill/`, which needed
  a `skills` manifest key and hid it from every standard installer. Observed on Claude Code 2.1.x
  (2026-10-19): a `skills` key *adds* to the default `skills/` folder rather than replacing it
  (a probe plugin with `skills/alpha` plus `"skills": "./extra/"` loaded both). Do not re-add the
  key pointing at a second location: it is unneeded and would risk registering a skill twice.
  The older belief that component keys replace the default folder is not true for skills. The
  `hooks` case is different and fatal: declaring `"hooks": "./hooks/hooks.json"` or
  `"commands": "./commands/"` re-registers what Claude Code already loads by convention
  (*"Duplicate hooks file detected"*) and takes the whole plugin down with it.
- **`claude plugin validate --strict` passes on manifests that fail to load.** It validated the
  broken manifest above cleanly. It checks shape, not loadability. Treat it as a linter, never as
  proof: the only real check is installing the plugin and reading `claude plugin list` for
  `Status: ✔ enabled`.
- **The version lives in six files, eight fields, and they must move together:** `package.json`;
  `package-lock.json` (twice — the top-level `version` and `packages[""].version`);
  `plugin/.claude-plugin/plugin.json`; `.claude-plugin/marketplace.json` (twice —
  `metadata.version` and `plugins[0].version`); `skills/a11y-loop/SKILL.md`'s
  `metadata."a11y-loop/version"`; and its generated copy `plugin/skills/a11y-loop/SKILL.md`. Edit
  the first five by hand, then run `npm run sync-plugin` (`scripts/sync-plugin.mjs`) so the plugin's
  copy follows. `test/unit/plugin-sync.test.js` fails when `package.json`, `plugin.json`, both
  marketplace fields and the skill disagree, or when the plugin copy drifts from its source; nothing
  checks the lockfile, so `npm ls --depth=0` is the check there. When `node_modules` is shared
  through a junction, edit the lockfile's two fields by hand rather than running
  `npm install --package-lock-only`. A quick sweep:
  `git grep -n '<old-version>' -- package.json package-lock.json .claude-plugin plugin skills`.
- **A `package.json` plus a lockfile in the plugin root makes Claude Code install dependencies at
  plugin install time,** with no way to turn it off (code.claude.com/docs/en/plugins/loading,
  "Node.js package dependencies"). Up to 0.3.0 the plugin root was the whole repository, so
  installing the plugin ran a scripts-disabled `npm ci` in the plugin cache and put about 24 MB of
  `node_modules` (axe-core, Playwright, culori, tabbable) there that nothing in the plugin used. It
  also made the Anthropic plugin directory scan all of `docs/`, `test/` and `website/` as plugin
  content. That is why the plugin is `plugin/`. Never add a `package.json` there.
- **The skill pre-approves only `Bash(a11y-loop *)` and `Bash(npx a11y-loop *)`.** It used to
  pre-approve `node ${CLAUDE_SKILL_DIR}/../../src/cli.js *` for checkouts, a path that climbs out
  of the skill's folder and that the plugin directory holds for review. Working from a checkout,
  approve each `node src/cli.js` call, or run `npm link` once so `a11y-loop` resolves to it.
- **Shipped text must be plain text.** A raw NUL inside a string literal made the plugin directory
  class `src/lib/fingerprint.js` as binary and hold it as uninspectable. Write control characters
  as escapes (`'\u0000'`); `test/unit/text-encoding.test.js` scans `src/`, `plugin/`, `skills/`, `scripts/`, root and
  `docs/` Markdown, `llms.txt` and the marketplace manifest.
- **`ExitPlanMode` does not exist under `claude -p`.** It is absent from the toolset in print mode,
  so the hook's full round trip — Claude Code fires the hook, the hook denies, Claude revises and
  calls `ExitPlanMode` again — cannot be exercised headlessly, only in an interactive session.
  What *is* covered headlessly: the hook's decision logic (`test/unit/plan-gate.test.js`, including
  invoking the script over stdin with realistic payloads), and that the plugin loads and registers
  the hook (`claude plugin details a11y-loop` → `Hooks (1) PreToolUse`). Don't claim the round trip
  is verified on the strength of those. The equivalent non-interactive path is `a11y-loop
  plan-check`: the same decision function, drivable from any agent or CI job, and covered by
  `test/unit/plan-check.test.js` and `test/unit/non-interactive.test.js`.

## Testing the plugin layer

`npm test` covers the hook's logic but not its wiring. For the wiring, load the working copy into a
session without installing it:

```bash
# Session-scoped: loads this checkout's plugin, skill, hook and command
npm run sync-plugin
claude --plugin-dir ./plugin -p "…"

# Inspect what a plugin actually contributes, plus its always-on token cost
claude --plugin-dir ./plugin plugin details a11y-loop

# Drive the hook directly with a realistic payload — expect a "deny" verdict
echo '{"session_id":"s1","tool_name":"ExitPlanMode","tool_input":{"plan":"Add a settings page in React: a modal dialog, a members table with row actions, tabs, and a dark mode toggle styled with Tailwind CSS."}}' \
  | node plugin/hooks/plan-gate.mjs
```

Two ways that command misleads you if you are not careful:

- **Silence and exit 0 is the gate's normal answer**, so an example that prints nothing proves
  nothing. The plan has to clear 40 characters and be unambiguously about UI, or you are testing
  the pass path by accident.
- **The second run of the same plan returns `additionalContext` only, not `deny`** — the loop guard
  spends each plan's hash once, on purpose, and the reminder is demoted to context with no
  `permissionDecision` key. That is correct behavior, not a broken hook. (`defer` is not used: Claude
  Code honors it only under `-p` and ignores `additionalContext` alongside it.) Point
  `CLAUDE_PLUGIN_DATA` at a fresh directory to get a clean verdict:
  ```bash
  echo "$payload" | CLAUDE_PLUGIN_DATA="$(mktemp -d)" node plugin/hooks/plan-gate.mjs
  ```

To test as a real install instead, register the checkout as a marketplace — `claude plugin
marketplace add ./` — so the plugin tracks your edits rather than the published repo. A local
marketplace reads `plugin/` in place (`claude plugin list` shows `Read from:` the checkout). To see what a user's install actually copies, install from a
pushed branch (`claude plugin marketplace add ChanMeng666/a11y-loop#<branch>`) into a throwaway
`CLAUDE_CONFIG_DIR` and list `plugins/cache/` there.

The plugin directory submission must name `plugin` as the plugin path: "If the plugin is one
folder in a larger repository, give that folder as the plugin path when you submit; the directory
reads and scans only that folder" (claude.com/docs/plugins/submit). The path cannot be changed
after submitting.

## Reading Order

When onboarding to this repo, read in this order:
1. `README.md` (one screen), then `docs/overview.md` — what the project is and how to run it
2. This `AGENTS.md` — how to work in it
3. `skills/a11y-loop/SKILL.md` — the product's actual contract with an agent; §3 also governs how
   anything in this repo is allowed to describe its own results
4. `CONTRIBUTING.md` — contribution workflow and quality gates

## Conventions for Changes

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Run the project's lint/test commands before proposing changes.
- Keep this file up to date when you change build steps, structure, or conventions.
