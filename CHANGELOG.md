# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **A `Stop` hook that declines ending a session with unaudited UI changes, once.** The skill's §2
  says the audit loop is mandatory after any UI change; until now nothing enforced it. The plugin's
  new `hooks/audit-gate.mjs` reads the session transcript when Claude is about to finish. If UI
  files were written (`.html`, `.htm`, `.jsx`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.css`,
  `.scss`, `.mdx`, or `.js`/`.ts` whose new content touches the DOM) and no `a11y-loop audit`
  ran after the last one, it returns `decision: "block"` with the files and the exact `audit` and
  `diff` commands. It blocks at most once per session, never while `stop_hook_active` is true,
  and on any failure of its own lets the session end. `A11Y_LOOP_AUDIT_GATE=off` turns it off.
  `Stop` fires under `claude -p`, so unlike the plan gate its full round trip runs headlessly.
  The decision lives in `src/lib/audit-gate.js`, copied into the plugin by `npm run sync-plugin`.
  It runs only in Claude Code. Other clients rely on the skill text plus `a11y-loop audit` in CI.
- **Native plugin evals.** `plugin/evals/` is a suite for `claude plugin eval` (Claude Code 2.1.269 or later): one trigger case per prompt in `trigger-evals.json` (21 should-trigger, 11 should-not) and 7 behaviour cases with graders for the plan, the APG modal and tabs contracts, the audit loop, and the honesty rules. Hand-written cases live in `skills/a11y-loop/evals/native/`; `npm run sync-plugin` generates the rest. `npm run eval:skill` runs it with and without the plugin and prints the delta. First measured results are in `evals/skill-eval-report-2026-10.md`.
- **A composite GitHub Action** (`action.yml` at the repository root, usable as
  `uses: ChanMeng666/a11y-loop@<tag>`). It installs the CLI at the action ref's own version and the
  headless-shell browser, runs `doctor` and `audit`, and writes a step summary with the totals, the
  first violations, the manual-check count and the sentence about what a clean report means. Inputs:
  `target`, `interact`, `baseline`, `fail-on` (`violations`, `new` or `never`), `sarif`, `pr-comment`,
  `version`, `browser`, `playwright-browsers-path`. Outputs: `violations`, `needs-review`, `manual`,
  `new`, `fixed`, `remaining`, `report-path`, `sarif-path`, `exit-code`. With `baseline` it runs
  `diff` and `fail-on: new` fails only on regressions; a missing baseline file is a notice, not an
  error. A tool error (exit code 2) always fails the step. With `pr-comment: 'true'` it keeps one
  comment on the pull request, found by a hidden marker and edited in place, using `gh api` and no
  third-party action. It never posts a score or badge, and it does not upload SARIF.
- `examples/github-action/audit.yml`: browser cache, baseline taken from the latest run on `main`,
  and the PR comment.
- `.github/workflows/action-selftest.yml` runs the action on Ubuntu and Windows against the demo
  pages and asserts its outputs.
- **A `release` branch for the plugin directory to track.** The release workflow now fast-forwards
  (or creates) `release` to each tagged release, so a directory listing tracking that branch picks
  up new versions without a manual re-validate. The branch only ever points at tagged commits.
- **An evidence tier on every finding.** `evidence` is `measured` (a value read off the page
  against a threshold or a required attribute: every axe violation and the static own checks),
  `inferred` (a conclusion from a driven, bounded probe: `keyboard-unreachable`, the `dialog-*`
  rules, `role-button-keyboard-activation`, `div-button`) or `needs-review` (every needsReview
  row). It never changes severity or the exit code. When the probe behind a row ran out of budget
  the row also carries `confidence: { level: "reduced", reason }`: `keyboard-unreachable` when the
  Tab walk used all 60 presses without wrapping, `dialog-focus-not-trapped` when the verdict came
  from the wrap budget rather than from focus reaching real content.
- **Root-cause clusters.** A new top-level `clusters` array groups rows within a bucket and state
  that share a cause: (rule, foreground, background, required ratio) for contrast, from the values
  axe measured, and (rule, selector with every `:nth-child`/`:nth-of-type` index replaced) for
  everything else. Each cluster has a stable `id`, `count`, `cause` and `causeText`, a
  representative row, its members' fingerprints, the passes they appeared in, and for contrast the
  suggestion and the `a11y-loop contrast … --fix` command once. Clusters need two members, and a
  row belongs to at most one. Every row stays in `findings`. On `demo/before`: 12 colour pairs
  account for the 104 contrast violations, and 20 clusters cover 135 of the 159 violations.
- **Measured contrast values on contrast findings,** as `data.contrast` (`fgColor`, `bgColor`,
  `contrastRatio`, `expectedContrastRatio`, `fontSize`, `fontWeight`, and axe's `messageKey` when
  it could not measure).
- **`schemaVersion: 2` on the JSON report.** Reports without the field are version 1. Version 2
  only adds: the finding fields above, `clusters`, and `summary.evidence`, `summary.clusters` and
  `summary.colourPairs`. Nothing was renamed or removed. Fingerprints are unchanged, so `diff`
  matches across versions.
- **SARIF results carry a message.** `message.text` and `message.markdown` hold the finding's own
  message, the measured contrast pair when the message does not already name it, the passes and
  state, the evidence tier, and any confidence caveat or note. The converter this writer replaced
  left them empty. Each result also has a `properties` bag with its fingerprint and evidence tier.
  Rule ids, kinds, levels and locations are unchanged and still checked against the golden file.
  Logs from `demo/before` (200 results), the new fixture, an `--html` fragment and an `--interact`
  dialog fixture validate against the SARIF 2.1.0 schema, with no empty messages.

- **`route-change-focus-lost` (SC 2.4.3), a check on focus after a client-side route change.** In
  an `--interact` state, a11y-loop now notices when the action changed the route without a page
  load (the path, the query or a hash route changed, or every child of `<main>` was replaced) and
  checks where focus went. It reports when focus was on a control the new view removed and fell to
  `<body>`, or was moved off a surviving control to `<body>`, and no live region that was already
  in the page announced the change. A changed URL makes the row a violation, evidence `inferred`; a
  view swapped with the URL unchanged is needs-review, because a tab set or a wizard step can look
  the same. Out of scope, on purpose: a real navigation (a full load resets focus), an in-page
  `#anchor`, a route changed from script with nothing focused or clicked, and focus left on a nav
  link that survives the change. New fixtures `fixture-route-focus-lost.html` (reports the row) and
  `fixture-route-focus-managed.html` (moves focus to the new `<h1>`, reports nothing).
- **Status-message checks (SC 4.1.3).** `status-message-not-announced`: text that appeared after a
  state's action, outside any `aria-live`, `role="status"`, `role="alert"`, `role="log"` or
  `<output>` region that was in the page beforehand, with focus not moved to it or to a field that
  names it with `aria-describedby` or `aria-errormessage`. It is a violation, evidence `inferred`,
  only when the text is short, reads like a status in English ("saved", "error", "required",
  "3 results") and appeared next to the control the state activated; anything weaker is
  needs-review. Text inside a dialog that just opened, disclosed content (`aria-expanded` with
  `aria-controls`, menus, listboxes, tab panels, open `<details>`, popovers), anything with a
  heading, landmark, table or two controls in it, and every state that changed the route are not
  reported. `live-region-injected-late`: a live region inserted already holding its text, seen by a
  `MutationObserver` installed before the state runs. Always needs-review, because whether its
  first text is read out depends on the browser and screen reader. New fixtures
  `fixture-status-not-announced.html`, `fixture-status-announced.html` (a live region and a
  disclosure, reports nothing) and `fixture-live-region-late.html`. A new `mustNotReport` field in
  `test/fixtures/manifest.json` makes a fixture fail when a named rule produces a row in any
  bucket. Measured at axe-core 4.14.0: `demo/before` and `demo/after`, with their `--interact`
  states, report the same counts in every bucket as before, so the demo still reports 159
  violations and still converges to 0. These checks only run on `--interact` states; a page-load
  audit cannot see what an action did.

### Changed
- **`audit --out` and `--sarif` create missing parent directories.** Before, writing to
  `.a11y/run-1.json` in a project with no `.a11y/` failed with ENOENT after the audit had run, and the
  run was lost. The skill's own examples use that path.
- **The skill description now names planning and discussion, small edits, and alt text.** Measured on the new eval suite, should-trigger prompts fire the skill 74% of the time (31 of 42 runs) instead of 52% (11 of 21), with no false trigger on the should-not prompts.
- **`docs/demo.gif` is re-recorded at 0.3.2.** It showed 163 failures from axe-core 4.12.1. It now shows the real output at the pinned 4.14.0: 159 failures converging to 0, ending in `Converged: all 159 violations fixed, none introduced`. The GIF is rendered from captured CLI text, and the source is in `docs/demo-gif-src/`.
- **Documentation synchronised with 0.3.2, read end to end against the code.** `AGENTS.md` now
  describes the three layers, every CLI subcommand with its exit codes, the CI workflows, the
  install routes for the skill, the Claude Code plugin and Codex (one or the other, not both, which
  the old agent-runnable block contradicted), the Anthropic plugin directory facts, and a release
  checklist; its gotchas gain the Playwright-on-PATH mismatch, the npm README rule, the
  plugin-root scan, the demo ticker and the W4A'25 misreading. `docs/overview.md`, `llms.txt`,
  `CONTRIBUTING.md` and the docs site's guide drop stale statements (424 tests, "three commands",
  a hook that "defers", a release workflow that "only publishes", no `plan-check`, `doctor` or
  `install-browser` on the CLI and CI pages). New: `docs/roadmap.md` (shipped, in progress and
  planned work) and `docs/research/distribution.md` (channels, their rules and what was
  submitted, as of 2026-10). `docs/research/market.md` and `tooling.md` gain a dated
  "Update 2026-10" section. `docs/research/standards.md` corrects the DOJ ADA Title II extension
  to 20 April 2026 (91 FR 20902) and records that HHS extended its Section 504 deadlines too.
- **The baseline-vs-skilled benchmark was re-run (2026-10) with three runs per condition and two
  engines besides a11y-loop.** Claude Sonnet 5.5 built the same six components with the same
  prompts. Each file was checked by a11y-loop 0.3.2, IBM Equal Access (`accessibility-checker`
  4.0.34) and Lighthouse 13.5.0. The baseline had 45 a11y-loop violations across 18 files. The
  converged skilled runs had none, and no failed Lighthouse audits. IBM still flags one finding
  in every converged file: a skip link outside any landmark. Lighthouse uses the same axe-core
  rules as a11y-loop, so only IBM is an independent engine. Subagents started inside this repo
  can read `AGENTS.md`, and that alone removed every a11y-loop violation from the baseline, so the
  headline arms ran from a clean directory. The contaminated runs are reported as well. The
  2026-07 report and outputs are kept unchanged in `evals/benchmark-results-2026-07.md` and
  `evals/outputs/2026-07/`.
- **`color-contrast` and `color-contrast-enhanced` rows from the forced-colors pass are now
  reported under `needsReview`, not as violations.** This changes the exit code for a page whose only violations were those rows: it
  now exits 0 where it used to exit 1. axe-core reads the foreground from `-webkit-text-fill-color`
  before `color`, and Chromium's forced-colors emulation leaves that at the author's value, so
  light-on-dark text was compared against a forced white background (the Field Note in
  `docs/overview.md`). A `color-contrast` or `color-contrast-enhanced` violation from the
  `forced-colors` pass, and only from that pass, is routed by rule id and pass name through the
  mechanism that already downgraded `target-size`. `color-contrast-enhanced` is AAA and not in the
  default run; it is routed because it reads the foreground the same way. Each routed row keeps its place in the report and carries `routedFrom:
  "violation"`, a `note` with the explanation and a `noteUrl` to the Field Note. It no longer
  carries a colour suggestion, because one computed from that pair fails in the default pass. The
  same element failing in any other pass is still a violation. Measured at axe-core 4.14.0 across
  `demo/before`, `demo/after` (each with and without `--interact`) and all 19 existing fixtures:
  **0 rows moved**, because every forced-colors contrast failure there also fails in another pass.
  The demo count stays 159 and its per-pass counts are unchanged. A new fixture,
  `fixture-forced-colors-dark-surface.html`, reproduces the Field Note: on 0.3.2 it reported 1
  violation and exited 1; now it reports 0 violations and 1 needs-review row, and exits 0.
  **`diff` reports these rows as RECLASSIFIED, never FIXED.** A before-violation whose
  fingerprint is among the after report's needs-review rows with `routedFrom` set is counted in a
  new `reclassified[]` array and `summary.reclassified`. It is listed as `RECLASSIFIED` in the
  table and left out of the fixed count. So diffing a 0.3.2 report against a new one says, for
  example, `Converged: no violations fixed, 1 reclassified to needs-review, none introduced`
  rather than claiming a fix nobody made. The `dedupeFindings` guard that stopped a lone
  forced-colors contrast violation overriding the other passes was removed: the routing now
  handles every such row before dedupe, so no audit could reach it. The gradient regression test
  still passes, now through the routing, and fails when the routing is disabled.
- **The terminal report prints a summary first.** Before any finding it states what the exit code
  means, violations by evidence tier, the needs-review, best-practice and manual-check counts, and
  how many colour pairs and clusters account for the violations. Each bucket then lists its
  clusters, one example each with `+N more like this`, before the rows no cluster explains.
  `demo/before` prints 356 lines instead of 565 for the same 159 violations. The new `--verbose`
  flag lists every member of every cluster (457 lines on the demo). `--json`, `--out` and
  `--quiet` output are unchanged apart from the additive fields below.
- **Field Note figures corrected.** The forced-colors table gave 4.9:1 and 14:1 for the two
  default-pass pairs; a11y-loop's own contrast math gives 5.34:1 and 15.04:1, which the new
  fixture now pins.

### Fixed
- **`dialog-focus-not-returned` no longer treats a button inside the dialog as its trigger.** Up to
  0.3.2 the trigger was the last clicked element. A state that opened a dialog and clicked the
  dialog's own Submit made Submit the "trigger", so when Escape closed the dialog and focus
  correctly went back to the opener, the row was reported anyway. The 2026-10 benchmark found it
  on every newsletter-modal run. The trigger is now the last control activated or focused outside
  the dialog before it opened, recorded while the state runs, and focus is compared by element
  identity rather than CSS path. When nothing identifies the opener and focus falls to the body,
  the row is needs-review rather than a violation. A dialog that the state's own action closes is
  now checked as well: focus left on the body is reported (a violation when the opener is known,
  needs-review when it is not), and focus on the opener or anywhere else real is not. With the old
  rule restored, the new `fixture-dialog-submit-inside.html` reports one false violation; with the
  fix it reports none. `fixture-dialog-focus-lost.html`, where Submit removes the dialog and focus
  really is lost, still reports the row.

## [0.3.2] - 2026-10-19

Documentation only. No behaviour change, no change to the report shape.

### Changed
- **The plugin README now says where each part runs.** The Anthropic plugin directory shows
  `plugin/README.md` as the listing README and lists the plugin on Claude Code, Cowork and the
  Claude apps. Its own form notes that hooks do not run outside Claude Code. A new "Where each part
  works" section says that Claude Code (CLI and desktop) gets the skill, the `/a11y-plan` command
  and the plan-mode hook. Cowork and the Claude apps (web, desktop, mobile) get the skill's plan,
  generation and reporting rules only: the hook does not run there, and the audit loop cannot,
  because it needs Node and a browser. There the rules apply, but nothing is verified.
- **The plugin README's install block matches the main README.** The `/plugin install a11y-loop
  --marketplace ChanMeng666/a11y-loop` one-liner comes first, then the terminal form for Claude
  Code 2.1.292 or later, then the two-step form for older versions.
- **The note on `plugin/`'s generated copies moved to `CONTRIBUTING.md`**, and the plugin README
  points there in one line.

## [0.3.1] - 2026-10-19

Three things, in order of how much they change for you. **The Claude Code plugin now ships from
`plugin/`, and installing it fetches nothing**; installing the 0.3.0 plugin ran `npm ci` in Claude
Code's plugin cache and left 24 MB of packages the plugin never uses. **`a11y-loop plan-check`**
brings the plan gate to any agent and any CI job, not only interactive Claude Code. The rest are
smaller: a CI install check on three operating systems, a demo count that no longer changes between
runs, the English README back on npm, a plugin icon, a narrower `allowed-tools`, a source file that
no longer reads as binary, and a `PRIVACY.md`.

### Changed
- **BREAKING (for anyone who points at plugin files by path): the Claude Code plugin now ships from
  `plugin/`, not from the repository root.** Installing it copies only that folder: the skill, the
  `/a11y-plan` command, the hook, the hook's decision logic, a README and the license. The install
  commands and the plugin name are unchanged. Two reasons, both from the Anthropic plugin
  directory's validation of 0.3.0. First, the plugin root was the whole repository, 232 files, so
  `docs/`, `test/`, `website/` and `evals/` were scanned as plugin content and produced most of
  the twelve review holds. Second, the root's `package.json` and `package-lock.json` made Claude
  Code install dependencies at plugin install time, which the README did not disclose. **Installing
  the 0.3.0 plugin ran `npm ci` in Claude Code's plugin cache:** a real install on 2026-10-19 left a
  24 MB `node_modules` there (`axe-core`, `@axe-core/playwright`, `playwright`, `playwright-core`,
  `culori`, `tabbable`; lifecycle scripts disabled, so no browser), none of which the plugin uses.
  This version's plugin folder has no `package.json`, and its install fetches nothing.
  - `.claude-plugin/marketplace.json` stays at the root with `source: "./plugin"`. The root
    `.claude-plugin/plugin.json`, `hooks/` and `commands/` are gone, and the npm package no longer
    includes them.
  - `skills/a11y-loop/` and `src/lib/plan-gate.js` stay the canonical sources, and `plugin/` holds
    generated copies. `npm run sync-plugin` (`scripts/sync-plugin.mjs`) writes them, and
    `test/unit/plugin-sync.test.js` keeps them identical to their sources. The test fails on drift,
    on a `../` path or `${CLAUDE_SKILL_DIR}` inside `plugin/`, on a `package.json` or lockfile
    there, and on the version disagreeing across `package.json`, the plugin manifest, both
    marketplace fields and `SKILL.md`.
  - The hook now loads its logic from `plugin/hooks/lib/plan-gate.mjs`, and still exits 0 with no
    verdict when that file is missing or throws.
  - `AGENTS.md` and `CONTRIBUTING.md` now list all six files the version lives in, including the
    lockfile and the generated `plugin/skills/a11y-loop/SKILL.md`.

### Added
- **`a11y-loop plan-check`, the plan gate for any agent and any CI job.** The plan gate used to
  exist only as a Claude Code `PreToolUse` hook on `ExitPlanMode`, a tool that exists only in
  interactive Claude Code sessions, so Codex, Cursor, Copilot, CI and headless Claude Code runs
  could not use it at all. `plan-check` runs the same decision on a plan from `--file`, `--text`
  or a piped stdin and exits `0` (the plan carries accessibility content, is not UI work, or is
  too short to assess), `1` (a UI plan with thin or absent accessibility content), or `2` (usage
  or input error). `--json` returns the verdict, `isUiWork`, `hasA11yContent`, the missing items
  and the SKILL.md §0 plan rule each one stands for. It never prompts: stdin is read only when it
  is not a TTY, and a pipe held open with no data gives up with `2` after 3 seconds
  (`A11Y_LOOP_STDIN_IDLE_MS` overrides). It is stateless, with no loop guard and no session cap,
  so the same plan always gets the same answer. It checks that the questions were asked in the
  plan, not that the answers are any good.
  - The decision logic moved from `hooks/plan-gate.mjs` to `src/lib/plan-gate.js`, shared by the
    hook and `plan-check`. The hook keeps its stdin/stdout protocol, its once-per-plan guard, its
    session cap and `A11Y_LOOP_PLAN_GATE=off` unchanged, and re-exports the detectors it used to
    define. A plan the hook denied before is denied now, and vice versa.
  - SKILL.md §0 now ends with: run `plan-check` on the written plan and address what it names
    before building.
  - `test/unit/non-interactive.test.js`: every subcommand, and the hook with an empty stdin, run
    as a child process with stdin closed and a hard timeout, asserting each exits with a
    documented code and none hangs.
- **CI now installs the packed tarball with `npm i -g` on Ubuntu (Node 20 and 22), macOS and Windows
  and runs the installed binary from PATH** — `--version`, `install-browser --only-shell`, `doctor`
  and an `audit` that must print a report. The 0.3.0 symlink fix had only been reproduced on
  Windows and in a test; this checks a real install on each OS on every PR.
- **`plugin/.claude-plugin/icon.png`**, a 1024×1024 PNG rendered from the brand logo, so the Claude
  Code plugin directory has a listing icon. The directory reads it only the first time a plugin is
  saved or submitted there, so it has to ship in the release that is submitted.
- **`PRIVACY.md`.** a11y-loop collects nothing and sends nothing to its author; the file says what
  each part reads and writes on your machine, and what goes over the network (only Chromium's
  download by `install-browser`, from Playwright's CDN). It is linked from the README, `llms.txt`
  and the plugin manifest's new `privacyPolicyUrl`. The manifest now also carries the docs site as
  `homepage`, plus `documentationUrl` and `supportUrl`: the Anthropic plugin directory had
  reported 3 of 6 link fields filled. `termsOfServiceUrl` stays empty, because there is no
  terms-of-service document and the MIT license is not one.
- `test/unit/text-encoding.test.js` fails on a BOM, invalid UTF-8 or a raw control byte in `src/`,
  `plugin/`, `skills/`, `scripts/`, root and `docs/` Markdown, `llms.txt` or the marketplace
  manifest.

### Fixed
- **The demo count no longer changes between runs: it is 159 on every run at axe-core 4.14.0.** In
  0.3.0 it was 159 or 160 depending on timing. The seeded B14 sponsor ticker is a CSS animation, and
  whether its tenth name was inside the viewport when axe read the page depended on how far the
  track had scrolled. `demo/before/style.css` now gives the ticker a 10-second `animation-delay`, so
  every pass reads the unscrolled frame: nine names at 1280px, three at 320px. The ticker still
  starts on its own, runs forever and cannot be paused, and `reduced-motion-ignored` (SC 2.2.2)
  still reports it. Twenty consecutive audits gave 159 with an identical set of findings, against
  160 seven times and 159 three times in ten runs before the change, and `diff` converges on all
  159. `demo.test.js` now asserts exactly 9 ticker findings instead of 9 or 10.
- **npm served the Chinese README.** npm picks the package readme from the first file matching
  `README` or `README.*` in the package root whose name ends in `.md`, in glob order, and
  force-includes every such file in the tarball. With `README.zh-CN.md` beside `README.md`, 0.3.0
  showed the Chinese one on the registry. The Chinese README now lives at `docs/README.zh-CN.md`,
  outside the package root.
- **The skill pre-approved a command path that climbs out of its folder.** `allowed-tools` in
  `SKILL.md` included `Bash(node ${CLAUDE_SKILL_DIR}/../../src/cli.js *)`, for running the CLI
  from a checkout. It now pre-approves only `Bash(a11y-loop *)` and `Bash(npx a11y-loop *)`. From a
  checkout, `node src/cli.js` asks before each call, or `npm link` makes `a11y-loop` resolve to it.
- **`src/lib/fingerprint.js` read as a binary file.** The separator in its fingerprint string was a
  raw NUL byte inside a string literal, so git and the Anthropic plugin directory treated the file
  as binary and the directory held it as uninspectable. It is now the `'\u0000'` escape: the same
  string at run time, so every fingerprint, and every `diff` against an older report, is
  unchanged. `test/unit/plan-gate.test.js` had the same raw byte and got the same fix.

## [0.3.0] - 2026-10-19

Almost certainly the first release that runs at all from an `npm i -g` or `npx` install on Linux
and macOS (inferred from how npm links bins, reproduced through a symlink on Windows), and the
first whose skill sits where standard skill installers look. **One change breaks manual skill
copies:** the skill moved from `skill/a11y-loop` to `skills/a11y-loop` (see Changed).

### Fixed
- **0.2.x invoked through a symlink exited 0 with no output, which means `npm i -g a11y-loop` and
  `npx a11y-loop` on Linux and macOS almost certainly did nothing at all.** The guard at the end of
  `src/cli.js` compared `import.meta.url`, which Node resolves through symlinks and junctions to
  the real path, with `process.argv[1]`, which keeps the path as invoked. npm installs the bin as a
  symlink (`<prefix>/bin/a11y-loop -> ../lib/node_modules/a11y-loop/src/cli.js`) and `npx` links
  into `node_modules/.bin` the same way, so the guard was false and the process ended silently —
  which reads like a pass. The 0.2.6 field note about Windows junctions described this same bug
  as a junction quirk; it was the general case. Windows npm installs were not affected, because
  their `.cmd` shims pass the real path, which is why it went unseen. The Linux/macOS impact is
  inferred from how npm links bins and reproduced through a symlink on Windows; it was not run on
  a real Linux install. `isEntryPoint()` now resolves `argv[1]` with `realpathSync` before
  comparing, falling back to the raw path if that throws. `test/integration/symlink-entry.test.js`
  runs `--version` and a real `audit --html` through a file symlink (the shape npm creates;
  skipped only on EPERM) and through a directory junction; without the fix both fail with
  "printed nothing".
- **The plan-gate hook had the same guard and the same bug.** If the plugin root was ever reached
  through a link, `hooks/plan-gate.mjs` silently did nothing and the plan passed ungated. Same fix,
  with the hook's own invariant kept: the realpath step falls back and never throws, so the hook
  still never blocks on its own failure. New tests drive the hook through a symlink and a junction
  with a realistic payload and expect `deny`; both fail with the old comparison.
- **A missing browser no longer hangs `--file` and `--html` audits.** `runAudit()` started the local
  HTTP server and launched Chromium outside its `try/finally`, so when the launch threw, the server
  stayed listening and the CLI printed its error and never exited. URL targets were unaffected,
  because their `close` is a no-op. Both resources now open inside the `try`, and the `finally`
  closes whichever exists — the server even if closing the browser throws. With an empty
  `PLAYWRIGHT_BROWSERS_PATH`, `--html` and `--file` now exit 2 in about a second; before, `--html`
  had to be killed by a 20-second timeout. `missing-browser.test.js` fails by timeout when the fix
  is reverted.
- **The plan-gate reminder now reaches the model.** On its reminder path the hook returned
  `permissionDecision: "defer"` with `additionalContext`. Per the Claude Code hooks reference,
  `defer` is honoured only under `-p` (interactively it is logged and ignored), and
  `additionalContext` is ignored alongside `defer`. `ExitPlanMode` exists only interactively, so
  the reminder never arrived anywhere it could matter. It is now sent as `additionalContext` with
  no `permissionDecision` key at all; the silent path is unchanged and the hook still never returns
  `allow`. Not verified end to end: `ExitPlanMode` does not exist under `claude -p`, so the
  decision logic, the emitted JSON and plugin loading are tested, not the interactive round trip.

### Added
- **`a11y-loop install-browser`** installs Chromium with a11y-loop's own bundled Playwright
  (`process.execPath <bundled playwright>/cli.js install chromium`). The old hint,
  `npx playwright install chromium`, resolved whichever Playwright came first on PATH; a different
  version installs a build this copy cannot launch, and the audit then printed the same hint again.
  Extra arguments pass through (`--with-deps`, `--dry-run`, `--only-shell`); stdin is ignored, so
  `--with-deps` cannot answer a sudo prompt. The missing-browser message now names this command.
- **`a11y-loop doctor [--json]`** reports plain facts and exits 0 when an audit can run here, 2 when
  it cannot, never 1: Node against `engines`, the bundled Playwright version, its Chromium build,
  `PLAYWRIGHT_BROWSERS_PATH`, the axe-core version actually resolved, skill copies under
  `~/.claude/skills` and `~/.agents/skills`, the plugin (from `installed_plugins.json`, or "could
  not check" when that undocumented file is missing), and a double-registration warning. **The
  verdict comes from a real headless launch**, not from whether the full browser file exists, so
  after `install-browser --only-shell`, where audits work, doctor agrees. Gating on the file was a
  real bug, caught by Linux CI, which installs only the headless shell.
- **GitHub Releases are created by the release workflow.** `release.yml` published to npm only, so
  GitHub's "Latest" had stopped at 0.2.4 while npm was at 0.2.6. On a tag push it now extracts the
  matching `## [x.y.z]` section of this file (failing loudly if it is missing) and creates the
  Release. It also runs when the npm publish was skipped because the version already exists, so a
  re-run can backfill a missing Release.
- **`README.zh-CN.md`**, a Simplified Chinese version of the one-screen README. The honesty
  sentences are translated literally ("a clean report … is never a conformance claim"), and the
  headline demo number is deliberately not copied.
- **README install section, one line per agent.** The skills route comes first
  (`npx skills add ChanMeng666/a11y-loop -g -y`, for any agent that reads Agent Skills), then the
  CLI with `a11y-loop install-browser` and `a11y-loop doctor`. Claude Code gets the plugin as an
  alternative to the skill (`/plugin install a11y-loop --marketplace ChanMeng666/a11y-loop`, with
  the terminal form for 2.1.292+ and the two-step form for older versions), Codex gets its plugin
  commands, and Windows gets PowerShell and Git Bash copy commands. **`npx skills add -g` installs
  `~/.claude/skills/a11y-loop` as a symlink**, so the manual copy block fails on that link
  afterwards; the README now warns not to copy over a skill `npx skills add` already linked, since
  the skill is already there.
- **"What it runs on your machine"**, a plain disclosure in the README. The skill is text and runs
  nothing. The hook runs `node hooks/plan-gate.mjs` before Claude Code leaves plan mode, writes one
  small state file, makes no network requests, and turns off with `A11Y_LOOP_PLAN_GATE=off`. The
  CLI launches a local Chromium, serves `--file`/`--html` targets on a localhost port, opens only
  the URL you give it, and sends no telemetry. `install-browser` downloads about 700 MB from
  Playwright's CDN. In claude.ai chat only the skill's rules apply.
- **The docs site** puts the skills install command in its hero, gets an og:description that makes
  no claim the tool cannot back, and loses a dead `#-introduction` link. `npx playwright install
  chromium` is replaced by `a11y-loop install-browser` in the end-user docs, `llms.txt` and the
  end-user section of `AGENTS.md`.

### Changed
- **BREAKING for manual skill copies: the skill moved from `skill/` to `skills/`.** `gh skill`,
  `npx skills`, Gemini CLI and the Agent Plugins standard only scan `skills/<name>/SKILL.md`, so
  none of them found the skill before. Manual installs now copy
  `$(npm root -g)/a11y-loop/skills/a11y-loop` (was `.../skill/a11y-loop`). `npx skills add` now
  reports `Found 1 skill`. Plugin installs need no action.
  - **`plugin.json` drops its `"skills"` key**, because `skills/` is the default folder. A probe on
    Claude Code 2.1.x settled what that key does: a plugin with `skills/alpha` and
    `"skills": "./extra/"` loaded **both** skills, so for skills the key *adds* to the default
    folder rather than replacing it. `AGENTS.md`'s earlier "replaces, not adds" gotcha was wrong
    for skills and has been rewritten; the fatal duplicate-hooks case it described still stands.
- **The `SKILL.md` description fits the Agent Skills spec**: 1,373 → 937 characters, against the
  spec's 1,024 limit; `skills-ref validate` rejected the old one. Only the "Supplies …" inventory
  moved into the body. Every should-trigger concept and the negative clause are still named, and
  no `paths:` was added. A new `skill-frontmatter.test.js` fails on the old file. The always-on
  token estimate reported by `claude --plugin-dir . plugin details` drops from ~599 to ~450.
- **`SKILL.md` §2's audit commands now use `--out <file> --quiet`**, so each loop iteration prints
  one short line instead of the full report into the agent's context; details are read from the
  file. `compatibility` now names `a11y-loop install-browser` and `a11y-loop doctor`.
- **The audit engine is pinned exactly**: `@axe-core/playwright` 4.14.0, a direct `axe-core`
  4.14.0 (which dedupes with the wrapper's `~4.14.0`, so a patch release cannot move the engine),
  and `playwright` 1.64.1. Caret ranges had let fresh installs pick up axe-core 4.14.0 silently.
- **The demo count is 159 at axe-core 4.14.0; 163 was the count at 4.12.1.** The README card,
  card SVG and overview had kept saying 163 after installs moved to 4.14.0, and no test caught it.
  `demo.test.js` now asserts the count, the `diff` convergence and the figure the docs quote, and
  goes red when the pin moves. `docs/demo.gif` is a raster recording and still shows 163; it is
  captioned as recorded at 4.12.1. **The count varies by one between runs, and the cause is the
  page, not the engine:** the seeded B14 ticker is a CSS animation, and whether its tenth name is
  in the viewport when axe reads the page depends on timing. At 4.14.0, nine runs gave 159 and five
  gave 160; at 4.12.1 the same effect gave 163 or 164, so the old documented 163 was the lower of
  two values too. Everything outside the ticker is stable (150 at 4.14.0, 154 at 4.12.1), and
  `diff` converges at either count.
- **SARIF is written directly** in `src/lib/format/sarif.js`, in the shape `axe-sarif-converter`
  produced, with three deliberate, tested differences. There is no `conversion` block, since no
  converter ran. The taxonomy is WCAG 2.2, built from the same success-criterion table as the rest
  of the report, so 2.5.8 and other 2.2-only criteria now get relationships, 4.1.1 is gone, and
  2.5.5 is named "Target Size (Enhanced)". An `--html` fragment is stored as artifact `contents`;
  the converter wrote the raw HTML as the URI, which failed the schema's `uri-reference` format.
  Output validates against the SARIF 2.1.0 schema for `--file` and `--html`. Result
  `message.text` is still empty, as it was with the converter; that is left for its own change.
- **`npm audit --omit=dev`: 7 high and 1 moderate → 0.** All of them arrived through the
  converter's `@puppeteer/browsers` dependency, for a code path that only builds JSON.
- **EN 301 549 timing.** The plan-phase guidance, WCAG quick reference, overview and standards
  briefing now say that V4.1.1 was published on 2026-09-02, with its Official Journal citation
  expected on 2026-11-30 or 2026-12-16 (sources differ), as of 2026-10.
- **The W4A'24 and W4A'25 citations are corrected. The earlier text misread W4A'25** (Gurita and
  Vatavu, [10.1145/3744257.3744266](https://doi.org/10.1145/3744257.3744266)). It said
  accessibility-oriented prompts measured a *slightly higher* violation rate (17.32% vs 15.93%)
  and that prompting alone does not work. That figure is one cell of the paper's Table 2, from a
  single automated tool (MAUVE++). The paper's own reading: with accessibility-oriented prompts,
  expert-judged violation rates fell from 58% to 19% and average severity from 1.53 to 0.30, but
  barriers persisted, particularly in semantic structure. Its scope is one task (a banking-app
  homepage), two models (Claude 3.5 Haiku and GPT-4-turbo) and 40 first-pass UIs, and it measured
  no verification loop. The corrected reading is now the same in all twelve places it appeared
  (SKILL.md, the AI-failure-modes reference, the overview, the docs site, the market briefing and
  the benchmark write-up): prompting helps substantially, barriers persist, and no loop was
  measured. **W4A'24's 84%** is accurate but covers ChatGPT (GPT-3.5) in one 2024 study, and is
  now narrowed to that everywhere instead of standing for "AI-generated pages". `SKILL.md` §1's
  ARIA sentence and the APG reference also now carry WebAIM's own caveat that ARIA did not
  necessarily introduce the errors it correlates with.

### Removed
- **`axe-sarif-converter`** and its section of `THIRD-PARTY-NOTICES.md`.
- **The `"skills"` key in `.claude-plugin/plugin.json`** (see Changed).

## [0.2.6] - 2026-09-13

Documentation only. No behaviour change, no change to the report shape.

### Added
- **Field notes from production use** — a new README section (mirrored as a docs-site page and
  indexed in `llms.txt`) for the rows a real report produces that are not defects. Each was
  reproduced from a checkout before being written down:
  - **`color-contrast` in the forced-colors pass.** axe-core 4.12.1 reads an element's foreground
    from `-webkit-text-fill-color` before `color` (`getTextColor()`), and Chromium's forced-colors
    emulation forces `color` and the background but leaves `-webkit-text-fill-color` at the
    author's value — on every element, including ones that never declared it. So the pass compares
    the author's foreground against the forced background. Dark-on-light text survives that;
    light-on-dark text collapses. Measured on a two-paragraph fixture: `#6d6975` on `#ffffff`
    stays silent, while `#e8e6ef` on a `#141218` card reports 1.23:1, *"foreground color:
    #e8e6ef, background color: #ffffff"* — and the suggestion derived from that pair proposes a
    color that fails in the default pass. On one production page this cluster was the large majority
    of a 153-finding run.
  - **`div-button` on `<body>` or a portal root** is how popup libraries dismiss on an outside
    press. The keyboard equivalent is Escape, wired separately, so `dialog-escape-does-not-close`
    is the row that actually answers the question.
  - **Contrast sampled mid-animation measures one frame.** `#6d6975` at opacity 0.917 reads as
    `#797580`. `openPage()` waits 120 ms for webfonts and short entrance animations; a longer
    reveal outlives it.
  - **`keyboard-unreachable` can mean the Tab budget ran out** — the walk is bounded at
    `MAX_TAB_STEPS` (60), and past that the tail of the document is reported unreachable because
    the walk ended.
  - **Invoking the CLI through a Windows junction silently does nothing.** Node resolves
    `import.meta.url` through the junction to the real path while `process.argv[1]` keeps the
    literal path, so `src/cli.js`'s entry guard is false and the process exits 0 with no output —
    which reads like a pass. Use the real path or the exported `main(argv, io)`.
- **Automating a screen-reader pass** — a new subsection in
  `skill/a11y-loop/references/manual-testing.md`: drive a portable screen reader with its language
  pinned and a `silence` synthesizer, and take live-region claims from the screen reader's own
  debug log rather than a driver's relay log, which carries focus speech only. Copy the log out
  before stopping the screen reader — `nvda.stop()` deletes the config directory it lives in. It
  buys a detectable regression and a quotable transcript, not a judgment about usability.

### Changed
- **The docs now describe the 0.2.5 dialog survey root.** The README's own-checks feature, the
  architecture diagrams in the README and on the docs site, and the docs-site home page all said
  "dialog focus trap" without saying which dialogs; they now name the portalled shape that 0.2.5
  taught the survey to recognise. `SKILL.md` §2 gains the consequence an agent can see: while a
  modal dialog is open the keyboard survey is scoped to that dialog, so the page behind it needs
  its own `--interact` state to be audited.
- **`SKILL.md` §2 and `references/manual-testing.md` now say that not every row is a defect** —
  with the tell for each of the four above, and the rule that checking a row against its
  explanation is part of the loop while disabling a rule never is. §3 is unchanged: nothing here
  permits suppressing a finding, and no row may be called verified without saying how.
- **`AGENTS.md`** records the two maintainer-facing findings: the forced-colors false positive
  together with the existing per-rule downgrade mechanism (`findingsFromAxeResult()` already
  downgrades `target-size` to `needsReview` by id) as a *recommendation* rather than a decision,
  since routing rows to needs-review changes the exit code; and the junction entry-guard no-op.

## [0.2.5] - 2026-09-13

### Fixed
- **A correctly trapped portalled dialog is no longer reported as broken.** `tabbableRoot()` was
  `document.querySelector(':modal') || document.body`, and `:modal` matches ONLY a native
  `<dialog>` opened with `showModal()`. Every React popup library — Base UI, Radix, Headless UI,
  anything on floating-ui — ships a portalled `<div role="dialog">` instead, usually with **no
  `aria-modal` attribute at all**, hiding the rest of the page with `aria-hidden` on the siblings.
  So the survey root fell back to `document.body` and the keyboard survey planted its focus
  sentinel at `body.firstChild`: outside the open dialog, in the exact region the focus trap exists
  to keep focus out of. The walk then spent its budget fighting the trap and reported everything it
  had not reached as `keyboard-unreachable` — **the better the trap, the earlier the walk ended** —
  while the trap probe reported `dialog-focus-not-trapped` on a dialog that traps perfectly.

  Four changes, each one measured before and after:
  - `modalDialogRoot()` recognises the portalled shape — a visible dialog-role element that either
    declares `aria-modal="true"` or has hidden the page around it — and the LAST one in document
    order wins, because a portal appends to `<body>`. `tabbableRoot()` uses it, so the survey is
    scoped to the dialog and the sentinel lands inside it.
  - The focus-trap probe stops asking `:modal` before forgiving the one tick every modal spends
    outside itself while wrapping, and recognises a **focus guard** — an empty, unexposed,
    focusable element — as well as `document.body`. Emptiness is what separates a guard from the
    page behind the dialog, which is also `aria-hidden` but is full of real content: focus landing
    there is still a trap that failed, and is still reported.
  - A wrap is a CHAIN, not a single tick. Measured on a live Base UI sheet: guard → body → back
    inside, two presses out in two runs of three. Allowing exactly one press failed a working trap
    about two runs in three, which is what made the row look flaky rather than wrong. Now bounded
    by `MAX_WRAP_TICKS`, and only counted once focus has been inside at least once.
  - The probe now **starts inside the dialog**. It asks whether Tab can take focus out, so it has
    to begin in. By the time it runs, three other surveys have each walked the page with real Tab
    presses and left focus wherever they finished; on a portalled dialog, focus sitting outside is
    itself enough for the library's focus-out handling to start dismantling the modal treatment,
    after which the probe walks a page that is no longer behind a modal. Measured over ten runs:
    four began outside, and all four reported the trap broken. With the re-entry, ten of ten began
    inside and none did.

  Measured against a live Base UI sheet (`archcanvas.uk`'s mobile menu), `mobile-menu-open` state:

  | | `keyboard-unreachable` | `dialog-focus-not-trapped` | `focus-order-diverges` |
  |---|---|---|---|
  | 0.2.4, three runs | 2, 2, 2 | 1, 1, — | 1, 1, 1 |
  | 0.2.5, five runs | 0 every run | 0 every run | 0 every run |

  None of it weakens the checks: `fixture-modal-no-trap.html`, the dialog that manages nothing,
  still reports all three of its failures.

### Added
- **`test/fixtures/fixture-portalled-dialog.html`** — the inverse of the no-trap fixture: a
  portalled dialog whose focus management is correct in every respect, so no a11y-loop dialog or
  keyboard rule may fire on it. It is a regression guard for the survey root rather than for a
  defect. Its focus guards hand focus back on the NEXT Tab rather than one animation frame later
  (floating-ui's `enqueueFocus`) — same shape, same code path, but deterministic where a frame is a
  race. Reverting the root selection, the probe's guard tolerance, or the wrap bound each turns it
  red; the probe re-entry is the one change only a real page can prove, and the numbers above are
  that proof.

## [0.2.4] - 2026-08-01

### Changed
- **Moved the plugin-layer knowledge out of this changelog and into `AGENTS.md`.** A changelog is a
  release log; `AGENTS.md` is what an agent actually loads before working in the repo. Several
  findings that cost real debugging were recorded only here, where nobody reads them in time. Now
  documented as gotchas, each with the reason it is not obvious:
  - `paths:` in `SKILL.md` gates the skill out of the model-visible listing rather than narrowing
    it — never re-add it.
  - A manifest component key **replaces** the default folder rather than adding to it, so
    `plugin.json` must only name non-standard locations. Declaring `hooks/hooks.json` is fatal.
  - `claude plugin validate --strict` **passes on manifests that fail to load**. It checks shape,
    not loadability; the only real check is installing and reading `claude plugin list`.
  - The version lives in **four** files that nothing keeps in sync (also added to `CONTRIBUTING.md`
    as a pre-tag checklist).
  - `ExitPlanMode` does not exist under `claude -p`, so the hook's full deny-and-revise round trip
    cannot be exercised headlessly — and should not be described as verified.
- **Added a "Testing the plugin layer" section**, since `npm test` covers the hook's logic but not
  its wiring: `claude --plugin-dir .` to load a working copy session-scoped, `claude plugin details`
  to see what it contributes, and driving `hooks/plan-gate.mjs` over stdin.
- **Corrected the hook example in the README and `AGENTS.md`.** The plan it used was 38 characters,
  below the gate's 40-character floor, so it silently demonstrated the pass path. Both now use a
  plan that produces a `deny`, and both note the two ways the command misleads you: silence is the
  normal answer, and re-running the same plan returns `defer` because the loop guard spends each
  plan's hash once.

## [0.2.3] - 2026-08-01

### Added
- **The upgrade path**, which 0.2.2 documented installation without. `claude plugin install` on an
  already-installed plugin reports "already installed" and does nothing — upgrading needs
  `claude plugin marketplace update` followed by `claude plugin update`. Now documented in the
  README, the getting-started guide, `AGENTS.md` and `llms.txt`, alongside re-running the skill
  copy and `npm i -g a11y-loop@latest`. Non-interactive, like everything else.

## [0.2.2] - 2026-08-01

### Changed
- **Installation is now something an agent can do end to end.** Every install, verify and teardown
  instruction across the README, the docs site, `AGENTS.md` and `llms.txt` is a non-interactive CLI
  command — no slash commands, no TTY, no prompts, no menus. Each was run verbatim with stdin
  closed, from a clean machine, and again to confirm it is idempotent.
  - README, the getting-started guide, `AGENTS.md` and `llms.txt` lead with a single copy-pasteable
    block that installs the CLI, Chromium, the skill and the plugin, plus a verification block.
  - **No `git clone` required.** The skill ships inside the npm package, so the source is
    `$(npm root -g)/a11y-loop/skill/a11y-loop`. The old instructions assumed a checkout.
  - `website/guide/planning.md` still carried `/plugin install .` — the form that fails with
    "Marketplace not found". Corrected.
  - Documented the declarative alternative: `--scope project` writes a committable
    `.claude/settings.json`, after which a clone needs no install commands at all.
  - Documented that installing the portable skill *and* the plugin registers the skill twice — the
    model sees both `a11y-loop` and the directory-qualified `a11y-loop:a11y-loop` — with the fix.
  - Documented the one step an agent cannot take: project-scoped plugins and hooks sit behind Claude
    Code's workspace-trust prompt on first open. That is a security boundary, not a gap to work
    around; `--scope user` avoids it.

## [0.2.1] - 2026-07-31

### Fixed
- **The plugin manifest failed to load.** `plugin.json` declared `"hooks": "./hooks/hooks.json"`,
  but `hooks/hooks.json` is a convention path that Claude Code loads automatically — naming it in
  the manifest registered it twice and the whole plugin was rejected with *"Duplicate hooks file
  detected"*. A manifest component key **replaces** the default folder rather than adding to it, so
  it should only ever point at a non-standard location. `"commands": "./commands/"` was redundant
  for the same reason and has also been dropped; `"skills": "./skill/"` stays, because this
  repository keeps its skill in `skill/`, not the conventional `skills/`.
  Anyone who installed 0.2.0 as a plugin saw `Status: ✘ failed to load`. `claude plugin validate
  --strict` did **not** catch this — it passed on the broken manifest. The npm package and the
  portable skill were unaffected.

### Added
- **`.claude-plugin/marketplace.json`**, so the plugin can actually be installed. Without it the
  only route was cloning the repository and passing `--plugin-dir` per session:
  ```bash
  claude plugin marketplace add ChanMeng666/a11y-loop
  claude plugin install a11y-loop@chanmeng-a11y-loop
  ```

## [0.2.0] - 2026-07-31

### Added
- **§0 Plan rules in the skill** — accessibility is now a decision made while scoping and designing,
  not only while writing UI code. §0 covers setting the conformance target, writing accessibility as
  plan items rather than a trailing "accessibility pass", naming the product decisions that foreclose
  accessibility while they are still free to change, fixing the color system before components exist,
  deciding structure once, and planning the verification. It ends with the `### Accessibility` section
  a plan touching UI is asked to carry.
- **`skill/a11y-loop/references/plan-phase.md`** — the plan-phase companion: jurisdictional
  conformance targets with primary sources, paste-ready acceptance criteria per component family,
  design-time pattern selection, the expanded foreclosing-decisions list, color-token planning with
  `contrast --fix`, a component-library vetting checklist, structural decisions, and how to size the
  manual-testing budget. The jurisdiction research previously lived only in `docs/research/` and was
  never shipped with the skill.
- **Optional Claude Code plugin layer** — `.claude-plugin/plugin.json`, a `PreToolUse` hook matched
  to `ExitPlanMode` (`hooks/plan-gate.mjs`), and a `/a11y-plan` command. When a plan changes UI work
  and says nothing about accessibility, the gate declines it once and hands back the section to fill
  in. It defers rather than allows on every other path, so the user's own plan approval is never
  suppressed; it denies a given plan at most once; and `A11Y_LOOP_PLAN_GATE=off` turns it off. The
  portable skill does not depend on any of this.
- Plan-phase trigger and behavioral evals, including planning-shaped prompts that must *not* trigger
  (API design, CLI tools, schema migrations, CI setup, ETL pipelines).

### Changed
- Skill `description` rewritten to add planning and design triggers without weakening the existing
  generation and audit triggers.
- The standing-instruction preamble now names three phases (§0 planning, §1 generation, §2
  verification) instead of two.

### Removed
- **The `paths:` frontmatter block**, which listed UI source globs. In Claude Code it does not add
  an activation channel — it gates one. A skill declaring `paths:` is held in a separate
  "conditional skills" registry and kept *out* of the skill listing the model can see until a
  matching file is touched. That is the wrong trade for this skill twice over: planning happens
  before any UI file exists (so §0 would never be reachable on a greenfield project), and an
  audit request naming only a URL touches no source file either. The `description` is the trigger,
  and it works in every Agent Skills client rather than one.

## [0.1.2] - 2026-07-26

### Changed
- Project description repositioned: a11y-loop is a personal open-source project aimed at making
  accessibility a default of the development workflow rather than an after-the-fact compliance
  check. The README introduction now states that motivation directly.
- Docs cleanup: neutralized framing in `docs/research/standards.md` that tied jurisdictional facts
  to a specific audience. The standards research itself is unchanged — New Zealand still has the
  strictest baseline (WCAG 2.2 AA, mandatory since 17 March 2025).

## [0.1.1] - 2026-07-26

### Changed
- Release pipeline: npm publishes now happen from GitHub Actions via npm OIDC trusted
  publishing with provenance (sigstore attestation). No npm token exists on any machine or in
  any CI secret; pushing a `vX.Y.Z` tag is the publish button.

### Added
- npm version badge in the README badge row.

## [0.1.0] - 2026-07-26

Initial release.

### Added
- **Agent Skill** (`skill/a11y-loop/`) implementing the open
  [Agent Skills](https://agentskills.io/specification) standard: standing generation rules
  (semantic HTML first, ARIA discipline, APG keyboard contracts, labels, focus visibility, AA
  contrast in light and dark, reduced motion, 24×24 targets) plus a mandatory audit-fix-re-audit
  loop, with `references/` covering AI-specific failure modes, APG patterns, manual testing, and a
  WCAG 2.2 quick reference.
- **`a11y-loop audit`** — five rendering passes per run (default 1280×720, dark mode,
  forced-colors, reduced-motion, 320×256 reflow) using axe-core in headless Chromium, plus
  a11y-loop's own checks invisible to axe (tab order, focus visibility including focus-ring
  contrast, dialog focus trap / Escape / focus-return, target size, reduced-motion effectiveness,
  ambiguous link text, div-as-button, positive `tabindex`). `--interact` drives built states (modal
  open, form error, menu expanded) through the same passes.
- **`a11y-loop contrast --fix`** — checks a color pair against WCAG 2.x (1.4.3, 1.4.11) and
  suggests passing colors, lighter and darker, in OKLCh.
- **`a11y-loop diff`** — matches findings across two audit reports by stable fingerprint (rule +
  selector + WCAG success criterion) and classifies each as FIXED, NEW (a regression), or
  REMAINING.
- **Reporting** — JSON as the primary output (per-finding WCAG success criterion + ACT rule ID,
  provenance block, generated manual-review checklist), SARIF v2.1 as a secondary format with its
  GitHub Code Scanning limitation documented rather than hidden, and exit codes 0/1/2 as a stable
  CI contract.
- **Standards target:** WCAG 2.2 Level AA (86 success criteria, 55 at AA) and WAI-ARIA 1.2, with
  findings tagged to the lowest WCAG version that contains them for jurisdictional filtering (NZ
  2.2 AA · EU 2.1 → 2.2 · US 2.1 and 2.0).
- **Demo** (`demo/`) — a seeded-violation fixture page with 163 detectable failures, converging to
  0 after the loop, with a finding-by-finding record in `VIOLATIONS.md` / `FIXES.md` and a recorded
  GIF at `docs/demo.gif`.
- **Benchmark** (`evals/benchmark-results.md`) — a small, illustrative baseline-vs-skilled
  comparison (N=6 components, self-audited, caveats stated in full).
- **Tests** — 337+ tests across unit and integration suites, including an 18-fixture
  seeded-violation matrix, a demo end-to-end run, and a forced-colors gradient regression test.
- Research briefings (`docs/research/`) on the competitive landscape, overlay-tool credibility
  requirements, and current accessibility standards and regulations, used to ground the tool's
  claims and citations.
