# AGENTS.md — a11y-loop

This file provides project guidance to AI coding assistants (Claude Code, GitHub Copilot, Cursor,
Codex, etc.) working with this repository. Read it before writing or changing any code.

## Project Overview

a11y-loop — makes AI coding agents decide accessibility while the work is still being planned and
write accessible UI by default, then proves what it can prove with a real browser audit across the
states it built, and tells you exactly what it could not check. Three layers:

1. **An Agent Skill** (`skills/a11y-loop/`, open Agent Skills standard) supplying plan rules,
   standing generation rules and honesty rules. It is text and runs nothing.
2. **A Node CLI** (`src/`, the npm package) supplying `audit`, `contrast --fix`, `diff`,
   `plan-check`, `doctor`, `install-browser` and `mcp`, which serves the same commands as MCP tools
   (see [CLI subcommands](#cli-subcommands)).
3. **An *optional* Claude Code plugin** (`plugin/`, published through the root
   `.claude-plugin/marketplace.json`) that carries a copy of the skill, the `/a11y-plan` command and
   a plan-mode hook. Nothing under `skills/` may depend on it.

The hook runs only in Claude Code (CLI and desktop). The Anthropic plugin directory also lists the
plugin on Cowork and the Claude apps, where hooks do not run and there is no Node or browser for
the audit: there the skill's rules apply, but nothing is verified. `plugin/README.md`, section
"Where each part works", says this to users.

What is shipped and what is only planned is tracked in [`docs/roadmap.md`](docs/roadmap.md). Do not
describe a planned or in-progress item (an MCP server) as existing, and do not describe something
merged on `main` but not yet tagged (the GitHub Action and the Stop-hook audit gate, as of this
writing) as usable from a release.

- **Primary language / stack:** Node.js ≥ 20, ESM, Playwright + axe-core
- **Default branch:** `main`
- **Repository:** https://github.com/ChanMeng666/a11y-loop
- **Published to npm as `a11y-loop`; GitHub remote is `ChanMeng666/a11y-loop`.** A local clone is
  only needed for development — `npx a11y-loop <command>` works with no local setup.

## Installing this project for an end user

If a user asks you to install or set up a11y-loop for them, run this — every command is
non-interactive, idempotent, and needs no TTY, so do it yourself rather than handing it back:

```bash
# 1. The CLI and its browser. Every route needs these for the audit.
npm i -g a11y-loop
a11y-loop install-browser       # Chromium for a11y-loop's own Playwright (~700 MB on disk)
a11y-loop doctor                # exit 0: an audit can run here; exit 2: it cannot, and why

# 2a. The skill, for any Agent Skills client (Claude Code, Codex, Cursor, Copilot, Gemini CLI)
npx skills add ChanMeng666/a11y-loop -g -y

# 2b. OR, on Claude Code, the plugin instead of 2a (it carries its own copy of the skill)
claude plugin install a11y-loop --marketplace ChanMeng666/a11y-loop    # Claude Code 2.1.292+
#     older Claude Code, two steps:
claude plugin marketplace add ChanMeng666/a11y-loop
claude plugin install a11y-loop@chanmeng-a11y-loop --scope user

# 2c. OR, on Codex, its plugin
codex plugin marketplace add ChanMeng666/a11y-loop
codex plugin add a11y-loop@chanmeng-a11y-loop
```

Inside a Claude Code session the same one-liner is `/plugin install a11y-loop --marketplace
ChanMeng666/a11y-loop`; an agent should prefer the terminal form.

Then verify, and report the actual output rather than asserting success:

```bash
a11y-loop --version
a11y-loop doctor                              # also lists skill copies, the plugin, double registration
test -f ~/.claude/skills/a11y-loop/references/plan-phase.md && echo "skill ok"   # skill route
claude plugin list | grep -A2 'a11y-loop@'    # plugin route; expect: Status: ✔ enabled
```

Notes that matter when scripting this:

- **No `git clone` needed** — `npx skills add` fetches the skill from GitHub, and it also ships
  inside the npm package at `$(npm root -g)/a11y-loop/skills/a11y-loop` for a manual copy.
- **Windows.** Every install command above works as written in PowerShell, Windows PowerShell and Git Bash;
  cmd.exe is not supported. A manual skill copy in PowerShell is
  `New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null` followed by
  `Copy-Item -Recurse -Force "$(npm root -g)\a11y-loop\skills\a11y-loop" "$HOME\.claude\skills\"`.
- **Never copy over a skill that `npx skills add` installed.** `npx skills add -g` makes
  `~/.claude/skills/a11y-loop` a symlink, so a later `cp -r` onto it fails, and the skill is
  already there. Upgrade it by re-running `npx skills add`.
- **`PLAYWRIGHT_BROWSERS_PATH`.** If browsers live off the system drive, set it before
  `a11y-loop install-browser` and keep it set for every audit. The two must agree, or the audit
  reports a missing browser. `doctor` prints the value it sees.
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

# Install the Chromium build the audit engine needs — required before any test or CLI run
# that touches a real browser. Inside a checkout `npx playwright install chromium` resolves the
# same local Playwright and works too; outside one it may not (see Gotchas).
node src/cli.js install-browser
node src/cli.js doctor          # exit 0 when an audit can run here

npm test                   # full suite (node --test)
npm run test:unit          # unit tests only — no browser needed
npm run test:integration   # integration tests only — launches real Chromium

# Run the CLI directly from a checkout (no global install)
node src/cli.js audit --html "<button>hi</button>"

# Regenerate the plugin's copies after editing skills/, src/lib/plan-gate.js or LICENSE
npm run sync-plugin             # node scripts/sync-plugin.mjs --check reports drift, exits 1

# The docs site (VitePress; deploy-docs.yml publishes it from main)
cd website && npm ci && npm run docs:build
```

> If a command above is missing or wrong, check the project manifest (e.g. `package.json` scripts,
> `Makefile`, `pyproject.toml`) and update this file — keeping AGENTS.md accurate is part of the work.

If you keep Playwright browsers off the system drive, set `PLAYWRIGHT_BROWSERS_PATH` before both
the browser install and before running tests — the two must agree on the same path or Playwright
will report a missing browser.

### CLI subcommands

`src/cli.js` parses and dispatches; each subcommand lives in `src/commands/<name>.js`. Exit codes
are `EXIT.OK=0`, `EXIT.FINDINGS=1`, `EXIT.ERROR=2`, a stable contract — don't repurpose them.
`a11y-loop --help` is the authoritative reference.

| Subcommand | What it does | Exit 0 | Exit 1 | Exit 2 |
|---|---|---|---|---|
| `audit <url>`, `--file`, `--html` | axe-core plus a11y-loop's own checks across five rendering passes; `--interact` drives built states; `--json`, `--out`, `--sarif`, `--quiet` | no violations | violations found | tool error, e.g. no browser |
| `contrast <fg> <bg>` | WCAG 2.x ratio; `--large`, `--ui`, `--fix` (OKLCh suggestions); no browser | threshold met | threshold missed | usage error |
| `diff --before a.json --after b.json` | FIXED / NEW / REMAINING by fingerprint | no regression | a NEW violation | usage or input error |
| `plan-check` with `--file`, `--text` or piped stdin | the plan gate's decision; stateless, never prompts; `--json` | plan carries a11y content, is not UI work, or is too short to assess | UI plan with thin or absent a11y content | usage or input error, or stdin held open with no data for 3 s (`A11Y_LOOP_STDIN_IDLE_MS`) |
| `doctor` | Node, the bundled Playwright and its Chromium (judged by a real headless launch), `PLAYWRIGHT_BROWSERS_PATH`, axe-core version, skill copies, plugin, double registration; `--json` | an audit can run here | never | an audit cannot run here |
| `mcp` | stdio MCP server: the commands above as six tools, each returning the matching `--json` report (see `src/commands/mcp.js` below); stdout is the protocol channel | the client closed stdin | never | never; a tool failure is an `isError` tool result |
| `install-browser` | runs the *bundled* Playwright's installer for Chromium; extra arguments pass through (`--only-shell`, `--with-deps`, `--dry-run`); stdin ignored | installed | never | installer failed |

`A11Y_LOOP_DEBUG=1` prints a stack trace on a tool error.

### CI workflows

- **`.github/workflows/ci.yml`** — on every push to `main` and every PR. `npm test` on Ubuntu with
  Node 22 and the headless shell, plus an `install-smoke` matrix (Ubuntu with Node 20 and 22, macOS,
  Windows) that packs the tarball, installs it with `npm i -g` and runs the installed binary from
  PATH: `--version`, `install-browser --only-shell`, `doctor`, and an `audit` that must print a
  report. It asserts output, not only the exit code, because the 0.2.x failure was exit 0 with no
  output.
- **`.github/workflows/release.yml`** — on a `v*` tag. Publishes to npm by trusted publishing (OIDC,
  provenance, no token anywhere), skipping a version already on the registry, then creates the
  GitHub Release from the matching `## [x.y.z]` section of `CHANGELOG.md` and fails loudly if that
  section is missing, then fast-forwards the `release` branch to the tag for the plugin directory.
  Do not rename the file: its name is part of the npm trusted-publisher contract.
- **`.github/workflows/action-selftest.yml`** — runs the composite action (`uses: ./`) on Ubuntu and
  Windows against the demo pages and asserts its outputs.
- **`.github/workflows/deploy-docs.yml`** — builds the VitePress site in `website/` and deploys it to
  GitHub Pages on pushes to `main` that touch it.

## Architecture & Conventions

- **`skills/a11y-loop/SKILL.md`** — the agent-facing standing instructions, in four sections that
  follow the lifecycle: §0 plan rules (decisions made while scoping, before any code), §1 generation
  rules, §2 the mandatory audit loop, §3 honesty rules for talking about results.
  `skills/a11y-loop/references/` holds the supporting docs (plan-phase guidance, AI-specific failure
  modes, APG patterns, manual-testing guidance, a WCAG 2.2 quick reference) loaded on demand, not
  upfront. `skills/a11y-loop/evals/` holds the skill's own evals: `trigger-evals.json` (the prompts that should and should not trigger it) and `evals.json` (skill-creator behaviour cases) are the readable sources, and `native/` holds the hand-written behaviour cases of the native `claude plugin eval` suite.
- **`plugin/`** — an *optional* Claude-Code-only layer, and the plugin root: an installed plugin
  gets this folder and nothing else. `plugin/.claude-plugin/plugin.json` (+ `icon.png`) is the
  manifest, `plugin/hooks/` the hook, `plugin/commands/` the `/a11y-plan` command. The root
  `.claude-plugin/marketplace.json` makes the repo installable
  (`claude plugin marketplace add ChanMeng666/a11y-loop`) with `plugins[0].source` = `./plugin`,
  and is why the marketplace is named `chanmeng-a11y-loop` while the plugin inside it is
  `a11y-loop` — installs are `a11y-loop@chanmeng-a11y-loop`. `plugin/hooks/plan-gate.mjs` is a
  `PreToolUse` hook on `ExitPlanMode` that declines a plan changing UI work with no
  accessibility content in it. `plugin/hooks/audit-gate.mjs` is a `Stop` hook that declines, once
  per session, to end a session whose transcript shows UI files written after the last
  `a11y-loop audit` run; its decision is `src/lib/audit-gate.js`. Five things in `plugin/` are
  generated copies, never edited by hand: `plugin/skills/a11y-loop/` (from `skills/a11y-loop/`,
  minus `evals/`), `plugin/evals/` (the native eval suite: `skills/a11y-loop/evals/native/` plus one trigger case per entry of `trigger-evals.json`, generated by the sync script),
  `plugin/hooks/lib/plan-gate.mjs` (from `src/lib/plan-gate.js`),
  `plugin/hooks/lib/audit-gate.mjs` (from `src/lib/audit-gate.js`) and `plugin/LICENSE`. Edit the
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
  `src/commands/{audit,contrast,diff,doctor,install-browser,mcp,plan-check}.js` (table under
  [CLI subcommands](#cli-subcommands)). It ends with an entry guard, `isEntryPoint()`, so tests can
  import `main(argv, io)` without running it (see Gotchas).
- **`scripts/sync-plugin.mjs`** — writes the three generated copies inside `plugin/` (above).
  `npm run sync-plugin` writes them; `node scripts/sync-plugin.mjs --check` reports drift and
  exits 1.
- **`src/commands/mcp.js`** — `a11y-loop mcp`, a stdio MCP server on `@modelcontextprotocol/server`
  (SDK v2). It is a protocol layer and nothing more: each tool calls the function its CLI command
  calls (`buildAuditReport`, `diffReports`, `checkedContrastResult`, `planCheck`,
  `collectDoctorReport`), so a tool result is the `--json` report, trimmed only in how many findings
  it lists. Never put a decision about what counts as a finding in this file; put it in the
  command or `src/lib/` so the CLI gets it too. stdout is the protocol channel: nothing else may
  write to it while the server runs. Timeouts go through `runAudit`'s `signal`, which closes the
  browser; racing a promise without aborting would leave Chromium running behind a tool error.
  **This reverses a July note on purpose.** `docs/research/market.md` says "do not ship another axe
  MCP server", and that still holds for a server that wraps `axe.run()`. This one exposes
  a11y-loop's own loop: five rendering passes plus scripted states, the checks axe cannot run,
  fingerprint diff to convergence, the manual checklist, contrast fixes and the plan check. It
  reaches clients that load only MCP servers and lists the project in the MCP registries. If a
  change would make it a thinner axe wrapper than that, the July note applies again.
- **`src/lib/`** — the engine: `axe-runner.js` (Playwright + axe-core orchestration across the
  five rendering passes), `checks/` (a11y-loop's own checks that axe can't run — dialog focus
  trap, div-button, focus-visible, keyboard, link-text, reduced-motion, reflow, target-size),
  `contrast-math.js` + `suggest-color.js` (WCAG contrast + OKLCh fix suggestions), `fingerprint.js`
  (stable finding IDs for `diff`), `diff.js` (FIXED/NEW/REMAINING classification), `finding.js`
  (the shared finding shape), `format/` (`json.js`, `human.js`, `sarif.js`, `checklist.js` — one
  serializer per output format), `wcag-map.js` (rule → WCAG SC + ACT ID mapping), `serve.js` and
  `browser-utils.js` (local static serving for `--file`/`--html`, and Playwright lifecycle helpers),
  and `plan-gate.js` — the plan gate's pure decision (is this UI work, does it carry accessibility
  content), shared by `plugin/hooks/plan-gate.mjs` (through its copy) and `a11y-loop plan-check`.
  It may import only `node:` built-ins, because the copy has to run on its own. No I/O, no state, nothing
  Claude-Code-specific: the loop guard, session cap and kill switch stay in the hook, and the CLI
  is stateless.
- **`action.yml`, `action/`, `examples/github-action/`** — the composite GitHub Action. `action.yml`
  sits at the repo root so `uses: ChanMeng666/a11y-loop@vX.Y.Z` works; it installs the published CLI
  at the ref's own `package.json` version (so the action and the CLI release together), audits, and
  hands the JSON report to `action/report.mjs`, which writes the step summary, the PR comment body and
  the step outputs from the pure functions in `action/lib.mjs`. Inputs reach shell steps through
  `env:`, never interpolated into the script. `test/unit/action-report.test.js` holds that text to the
  red-line list, and `.github/workflows/action-selftest.yml` runs the action (`uses: ./`) on Ubuntu and
  Windows against the demo pages. Exit code 2 always fails the step, whatever `fail-on` says. The
  action must keep to the honesty rules: no score, no badge, no "compliant".
- **`demo/before/` and `demo/after/`** — the seeded-violation fixture and its fixed counterpart
  that back the README's headline claim and `test/integration/demo.test.js`. `VIOLATIONS.md` and
  `FIXES.md` are the finding-by-finding record — keep them in sync with the actual markup if you
  touch these files.
- **`test/fixtures/manifest.json`** — the fixture matrix driving `test/integration/fixtures.test.js`:
  one seeded-violation HTML fixture per failure class (19 today), declared in the manifest rather
  than hardcoded per-test, so adding a fixture means adding a manifest entry plus the HTML file.
- **`test/`** — `node --test`, unit and integration. Besides the engine's own tests, several guard
  the release itself and are worth knowing by name: `unit/plugin-sync.test.js` (copies, versions,
  no `../` or `package.json` in `plugin/`), `unit/skill-frontmatter.test.js` (Agent Skills spec
  limits, no `paths:`), `unit/text-encoding.test.js` (no BOM, invalid UTF-8 or raw control byte in
  shipped text and docs), `unit/non-interactive.test.js` (every subcommand and the hook exit with a
  documented code, and none hangs, with stdin closed), `integration/symlink-entry.test.js` (the CLI
  and the hook run through a symlink and a junction) and `integration/missing-browser.test.js`
  (`--file` and `--html` exit 2 instead of hanging when there is no browser).
- **Skill evals (`claude plugin eval`)** — run `npm run eval:skill` (needs Claude Code >= 2.1.269, a logged-in account, and spends real API money: roughly the cost recorded in `evals/skill-eval-report-2026-10.md`). It runs `plugin/evals/` with and without the plugin and prints the with-minus-without delta. Add a prompt to `trigger-evals.json` or a case folder under `skills/a11y-loop/evals/native/`, then `npm run sync-plugin`; `test/unit/native-evals.test.js` checks the structure without a model. `tool_used: Skill` graders are a plugin-fired indicator in the with-without run, not part of the score. Native Windows has no sandbox backend, so keep `allowed_tools` read-only.
- **`evals/`** — the baseline-vs-skilled benchmark (`benchmark-results.md` + `outputs/baseline/`,
  `outputs/skilled/`), run against the skill as it stood at v0.1.x. This is evidence, not fixtures —
  don't regenerate `outputs/` casually; a real regeneration means re-running both generation
  conditions and re-auditing. A 2026-10 re-run is in progress (see [`docs/roadmap.md`](docs/roadmap.md)).
- **`docs/research/`** — the market/competitive, tooling, standards/regulatory and distribution
  briefings that ground the tool's claims and citations (coverage percentages, WCAG version
  mapping, credibility red lines, where the project is listed and on what rules). Each carries its
  research date; later findings are appended as dated sections, never written over the old text.
  Consult before changing any claim in README, SKILL.md, or CLI output about what the tool covers.
- **`docs/roadmap.md`** — what is planned, in progress and shipped. Update its status column in the
  same PR that ships an item.

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
  forced white background and every line on a dark surface is reported. If this is ever to be
  handled in code rather than in prose, `findingsFromAxeResult()` in `src/lib/axe-runner.js`
  already downgrades one rule (`target-size`) to `needsReview` by id; the same shape keyed on rule
  id **and** `passName === 'forced-colors'` would route these to needs-review. That is a
  recommendation, not a decision — it changes what counts as a violation and therefore the exit
  code, so it needs its own measurement and its own release note.
- **An entry guard must realpath `process.argv[1]` before comparing it with `import.meta.url`.**
  *(Fixed in 0.3.0; the lesson stands for every new entry point.)*
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
  treatment; `plugin/hooks/plan-gate.mjs` got it in the same release.
- **`npx playwright install chromium` outside a checkout can install the wrong browser.** It runs
  whichever Playwright comes first on PATH or in the npx cache. If that version differs from the one
  a11y-loop bundles (pinned exactly, 1.64.1 today), it installs a Chromium build this copy cannot
  launch, and the audit then printed the same install hint again — a loop with no way out. That is
  why `a11y-loop install-browser` exists: it runs the bundled Playwright's own `cli.js` with
  `process.execPath`. Point users at it, never at `npx playwright`. Inside this checkout the two are
  the same Playwright.
- **`doctor` judges by launching, not by looking for files.** Its first version gated on the full
  browser executable existing, so after `install-browser --only-shell` (where audits work) it said
  they could not. Linux CI, which installs only the headless shell, caught it. Any readiness check
  you add must do the real thing.
- **npm serves whichever root `README*` it finds first.** npm picks the package readme from the
  first file in the package root matching `README` or `README.*` and force-includes every such file
  in the tarball, whatever `files` says. With `README.zh-CN.md` beside `README.md`, 0.3.0 showed the
  Chinese one on the registry. Translations live in `docs/` (`docs/README.zh-CN.md`). Never put a
  second `README*` in the root, and after a release check which language npmjs.com shows.
- **The demo count is deterministic, and the reason is a ten-second delay.** The demo reports 159
  violations at axe-core 4.14.0 on every run (163 at 4.12.1). `docs/demo.gif` is rendered from
  captured CLI output, with its source in `docs/demo-gif-src/`, so re-render it when the count
  moves. Up to 0.3.0 it was 159 or 160: the seeded B14 sponsor ticker is a CSS animation,
  and whether its tenth name was in the viewport when axe read the page depended on timing.
  `demo/before/style.css` gives the ticker a 10 s `animation-delay`, so every pass reads the
  unscrolled frame, while it still starts on its own and cannot be paused (SC 2.2.2 is still
  seeded). `test/integration/demo.test.js` asserts the exact count, 9 ticker findings, `diff`
  convergence and the figure the docs quote, so it goes red when the axe pin moves. When it does,
  update every quoted count in the same PR, and never quote a count without its axe-core version.
- **Never cite W4A'25 as "prompting doesn't work".** Gurita and Vatavu,
  [10.1145/3744257.3744266](https://doi.org/10.1145/3744257.3744266). Earlier text in this repo
  took one cell of its Table 2 (one automated tool, MAUVE++: 17.32% vs 15.93%) as the finding. The
  paper's own reading: with accessibility-oriented prompts, expert-judged violation rates fell from
  58% to 19% and average severity from 1.53 to 0.30, but barriers persisted, particularly in
  semantic structure. Scope: one task, two models, 40 first-pass UIs, and no verification loop
  measured. The correct short form is "prompting helps substantially, barriers persist, no loop
  was measured". W4A'24's 84% covers ChatGPT (GPT-3.5) in one 2024 study, not "AI-generated pages".

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
- **The plugin root is everything the directory scans, so keep it small and plain.** With the whole
  repository as the root, 0.3.0 was 232 files and drew 12 policy holds and 5 warnings: the lockfile
  install, the `../../src/cli.js` entry in `allowed-tools`, six "image or font file the plugin's
  code could run" holds for docs and website files that named `docs/demo.gif` and the site's
  images, three likely-false "uses a credential" holds from prose, a test and a brand SVG,
  `fingerprint.js` classed as binary, and "download-and-run" warnings for install instructions in
  three Markdown files. From `plugin/`, 0.3.1 and 0.3.2 are 21 files with 1 hold and 4 warnings: the
  hook is a `node` script the validator does not follow (`COMMAND_SCRIPT_NOT_FOLLOWED`), which goes
  to a human reviewer, plus three unknown-key notes for `documentationUrl`, `privacyPolicyUrl` and
  `supportUrl` (which the directory itself reads) and the uninspected hook output. Anything you add
  to `plugin/` is scanned as plugin code, including prose.
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
- **`Stop` does fire under `claude -p`, so the audit gate's round trip *is* verifiable headlessly.**
  `claude --plugin-dir ./plugin -p "<write an HTML file>" --allowedTools Write --output-format
  stream-json --verbose` shows the block arrive as `Stop hook feedback:`, then Claude running the
  audit, and a second Stop that passes. The block also raises a "Stop hook error occurred"
  notification; that is how Claude Code labels any `decision: "block"` from a Stop hook, not a
  failure of the hook. The hooks reference says `hookSpecificOutput.additionalContext` continues
  the turn without that label; switching to it is a one-line change in `main()`.
- **The audit gate reads Claude Code's transcript JSONL, which is not a published contract.** It
  relies on assistant lines carrying `message.content[]` blocks of `{ type: "tool_use", name,
  input }`, with `Write`/`Edit`/`MultiEdit`/`NotebookEdit` paths in `file_path` or
  `notebook_path` and shell commands in `input.command` (`Bash`, and `PowerShell` on Windows).
  If that shape changes, `scanTranscript()` finds no tool calls and the gate passes silently: it
  fails open, never closed. Check a fresh transcript when bumping the supported Claude Code
  version. Files written by a shell command, and edits made inside a subagent, are not seen.
- **The `release` branch exists only for the Anthropic plugin directory and always equals the latest
  tagged release.** `release.yml` fast-forwards it on every `v*` tag push and nothing else should
  ever write to it. When the maintainer next edits the directory submission, switch the tracked ref
  from the tag to the `release` branch and keep auto-publish on, so new releases are picked up
  without a manual re-validate.

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

The audit gate takes a Stop payload whose `transcript_path` points at a JSONL file. A one-line
transcript with a `Write` to an `.html` file and no audit gets a `"block"`; a second run with
the same `session_id` and `CLAUDE_PLUGIN_DATA` prints nothing, which is the once-per-session cap:

```bash
d="$(mktemp -d)"
echo '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"index.html","content":"<button>x</button>"}}]}}' > "$d/t.jsonl"
echo "{\"session_id\":\"s1\",\"transcript_path\":\"$d/t.jsonl\",\"stop_hook_active\":false}" \
  | CLAUDE_PLUGIN_DATA="$d" node plugin/hooks/audit-gate.mjs
```

To test as a real install instead, register the checkout as a marketplace — `claude plugin
marketplace add ./` — so the plugin tracks your edits rather than the published repo. A local
marketplace reads `plugin/` in place (`claude plugin list` shows `Read from:` the checkout). To see what a user's install actually copies, install from a
pushed branch (`claude plugin marketplace add ChanMeng666/a11y-loop#<branch>`) into a throwaway
`CLAUDE_CONFIG_DIR` and list `plugins/cache/` there.

### The Anthropic plugin directory

Facts from the submission portal (`claude.ai/directory/manage`) and Anthropic's submission docs,
read on 2026-10-19 and 2026-10-20. Distribution channels in general are in
[`docs/research/distribution.md`](docs/research/distribution.md).

- **Plugin path: `plugin`.** "If the plugin is one folder in a larger repository, give that folder
  as the plugin path when you submit; the directory reads and scans only that folder"
  (claude.com/docs/plugins/submit). The path cannot be changed after submitting.
- **It tracks the ref you submit, and a tag never moves.** The portal tracks a branch or a tag; new
  commits on a branch are picked up and re-scanned, while a tag stays on its commit. The submission
  was made against a release tag. `release.yml` now fast-forwards a `release` branch to every tag
  (see the gotcha above), but that only helps once the maintainer switches the submission's tracked
  ref to `release`, which is a manual edit in the portal. Until then, **every release needs the
  tracked ref moved to the new tag** and re-validated, or the listing stays on the old version.
- **The listing icon is read once.** The directory takes `plugin/.claude-plugin/icon.png` (square
  PNG or JPEG, 512 to 2048 px, under 2 MB; SVG and WebP are refused) only the first time the plugin
  is saved or submitted. Replacing the file later does not change the listing.
- **Hooks do not run in Cowork or the Claude apps.** The portal lists the plugin there and says
  "Not used here: hooks. Slash commands load as skills here." Only Claude Code runs the plan gate.
  Never describe the hook as working on those surfaces.
- **Every version is scanned, and a person reviews a new listing** before it goes live. A hold is a
  reviewer-read item, not a rejection.

## Release checklist

The version moves in six files (see [above](#skill-frontmatter-and-the-plugin-layer)); nothing
publishes until a tag is pushed, and publishing is the one irreversible step.

1. **Bump the six files** on a `chore/release-x.y.z` branch: `package.json`, both fields of
   `package-lock.json`, `plugin/.claude-plugin/plugin.json`, both fields of
   `.claude-plugin/marketplace.json`, and `skills/a11y-loop/SKILL.md`'s
   `metadata."a11y-loop/version"`.
2. **`npm run sync-plugin`**, so `plugin/skills/a11y-loop/SKILL.md` follows; then `npm test`.
   `plugin-sync.test.js` fails on any disagreement except the lockfile, so also run
   `git grep -n '<old-version>' -- package.json package-lock.json .claude-plugin plugin skills`.
3. **Move `## [Unreleased]` in `CHANGELOG.md` to `## [x.y.z] - YYYY-MM-DD`.** The release workflow
   copies that exact section into the GitHub Release and fails without it.
4. **Open the PR, wait for CI** (tests plus the three-OS install smoke), and merge.
5. **Tag `main` and push the tag:** `git tag vX.Y.Z && git push origin vX.Y.Z`. `release.yml`
   publishes to npm with provenance and creates the GitHub Release. Check both:
   `npm view a11y-loop version` and `gh release view vX.Y.Z`.
6. **Check the Anthropic directory listing.** `release.yml` fast-forwards `release` to the tag. If
   the submission tracks `release`, confirm the portal picked up the new commit; if it still tracks
   a tag, move it to the new tag and re-validate. Either way, read the hold and warning counts.
   On the first release that contains `action.yml`, also tick "Publish this Action to the GitHub
   Marketplace" on the GitHub Release (see `CONTRIBUTING.md`).
7. **Check what users get:** that npmjs.com shows the English README, that
   `npx skills add ChanMeng666/a11y-loop -g -y` reports `Found 1 skill` and skills.sh lists it, that
   `gh skill` finds it, and that `claude plugin marketplace update chanmeng-a11y-loop` followed by
   `claude plugin update a11y-loop@chanmeng-a11y-loop` reports the new version.

A failed publish is re-run with `gh workflow run release.yml`; a wrong version is corrected by
releasing another, never by unpublishing. If npm reports an authentication error, re-register the
trusted publisher by hand (see `CONTRIBUTING.md`); never add a token.

## Reading Order

When onboarding to this repo, read in this order:
1. `README.md` (one screen), then `docs/overview.md` — what the project is and how to run it
2. This `AGENTS.md` — how to work in it
3. `skills/a11y-loop/SKILL.md` — the product's actual contract with an agent; §3 also governs how
   anything in this repo is allowed to describe its own results
4. `CONTRIBUTING.md` — contribution workflow and quality gates
5. `docs/roadmap.md` — what is shipped, in progress and planned, so you do not build or describe
   something twice

## Conventions for Changes

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Run the project's lint/test commands before proposing changes.
- Keep this file up to date when you change build steps, structure, or conventions.
