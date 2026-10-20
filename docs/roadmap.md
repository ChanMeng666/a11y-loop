# Roadmap

*As of 2026-10-20, after 0.4.1.* What has shipped, what is being built, and what is planned. A row
moves to **shipped** in the same pull request that ships it, with the version, and the
[CHANGELOG](../CHANGELOG.md) entry is the record of what it actually does. Nothing in this file is
a promise of a date.

**Status values.** **shipped**: released on npm, with the version. **on main**: merged, but in no
release tag yet (no row has this status after 0.4.1; the untagged changes on `main` are a CI fix and a plan-gate false-positive fix, see [State](#state-as-of-2026-10-20)). **in progress**: being built on a branch now. **planned**: agreed direction, no
branch yet. Only **shipped** items may
be described anywhere else in this repository, in the README, the docs site, `SKILL.md`, CLI output
or a directory listing, as something a11y-loop does.

**The honesty red lines bind every item.** No item may ship with, or be described with,
"compliant", "guarantees", "fully accessible", "automatically fixes accessibility", "reduces legal
risk", "no manual testing needed", or a single accessibility score (see
[`AGENTS.md`](../AGENTS.md#gotchas--anti-patterns) and [`research/market.md`](research/market.md)
§A2). A gate that blocks on the audit is a gate on *detectable* failures in the states that ran; an
evidence tier is a statement about how a finding was obtained, not a grade of the page; a
benchmark reports its denominator, its engine version and who scored it.

## Phase 1: reach and correctness (shipped)

Released on 2026-10-19 across 0.3.0, 0.3.1 and 0.3.2. Details in the [CHANGELOG](../CHANGELOG.md).

| Item | Status |
|---|---|
| CLI runs when invoked through a symlink (every `npm i -g` / `npx` on Linux and macOS) | shipped, 0.3.0 |
| Skill at `skills/a11y-loop/`, found by `npx skills`, `gh skill` and Gemini CLI; description within the spec | shipped, 0.3.0 |
| `install-browser` and `doctor` | shipped, 0.3.0 |
| GitHub Releases created by the release workflow | shipped, 0.3.0 |
| Audit engine pinned exactly (axe-core 4.14.0, Playwright 1.64.1); SARIF written directly | shipped, 0.3.0 |
| W4A'24 and W4A'25 citations corrected | shipped, 0.3.0 |
| `plan-check`, the plan gate for any agent and any CI job | shipped, 0.3.1 |
| Plugin ships from `plugin/` and installs no packages | shipped, 0.3.1 |
| Install smoke test on Linux, macOS and Windows in CI | shipped, 0.3.1 |
| Demo count deterministic (159 at axe-core 4.14.0) | shipped, 0.3.1 |
| English README on npm; plugin icon; `PRIVACY.md`; narrower `allowed-tools` | shipped, 0.3.1 |
| Plugin README says where each part runs | shipped, 0.3.2 |
| Directory and list submissions (see [`research/distribution.md`](research/distribution.md)) | submitted 2026-10-19/20; partly resolved: GitHub Marketplace live, awesome-accessibility merged, skills.sh indexed, HelloGitHub declined, the rest pending (see [State](#state-as-of-2026-10-20)) |

## Phase 2: evidence

The project's claims rest on a self-audited N=6 benchmark run against an older skill, and on a
recording made at an older engine version. Phase 2 replaces both before anything is promoted on
the strength of them.

| Item | What done looks like | Status |
|---|---|---|
| **Benchmark re-run against an independent oracle** | The current skill (with §0) against a baseline, on more tasks and more than one run per condition, scored by something other than a11y-loop's own engine. The write-up states N, the models, the axe-core version and who or what scored it, and keeps the v0.1.x result as history rather than overwriting it. | shipped, 0.4.0: 2026-10 re-run, three runs per condition, IBM Equal Access and Lighthouse as second engines; the 2026-07 report is kept (`evals/benchmark-results-2026-07.md`) |
| **`docs/demo.gif` re-recorded** | A recording at axe-core 4.14.0 that shows the count the docs quote (159), replacing the 4.12.1 recording (163) and its caption. Rendered from captured CLI output; source in `docs/demo-gif-src/` (#30). | shipped, 0.4.0 |
| **Content pieces** | Human-written essays and talks on method (planning accessibility in, auditing states the agent built, saying what was not checked), on channels whose rules allow them. Several channels ban AI-written text; see [`research/distribution.md`](research/distribution.md). | planned |

## Phase 3: product

| Item | What done looks like | Status |
|---|---|---|
| **Stop-hook audit gate, with Codex and Cursor equivalents** | In Claude Code, a `Stop` hook that asks for an audit before a turn that changed UI ends, holding to the plan gate's invariants: it never blocks on its own failure and cannot loop. Equivalent wiring for Codex and Cursor where their hook models allow it, with any gap stated. It gates on detectable failures only, and says so. | shipped, 0.4.0, for Claude Code (#32): it checks that an audit ran after the last UI edit, not what it found. Equivalents for Codex, Cursor, Copilot and Gemini CLI, and the CI route for clients with no usable hook, are documented in [`docs/agent-gates.md`](agent-gates.md); not yet run inside those clients |
| **GitHub Action** | A composite action (`action.yml` at the root) that installs the CLI and the headless shell, runs `doctor` and `audit`, optionally `diff` against a baseline, writes a step summary and an optional sticky PR comment, and fails on the documented exit codes (#29). `uses: ChanMeng666/a11y-loop@<tag>` resolves only once a release tag contains it. | shipped, 0.4.0 (#29): `uses: ChanMeng666/a11y-loop@v0.4.1`. Listed on the GitHub Marketplace from v0.4.1; v0.4.0 failed the Marketplace's `action.yml` check (a description over 125 characters) |
| **Plugin evals** | Evals that drive the installed plugin (skill, command and hook together), next to the skill's own trigger and behaviour evals in `skills/a11y-loop/evals/`. | shipped, 0.4.0: `plugin/evals/`, run with `npm run eval:skill` |
| **Evidence tiers, root-cause clustering, forced-colors routing** | Each finding says how it was obtained (axe rule, a11y-loop's own check, needs-review). Findings that share one cause, such as one token on fifty elements, are grouped so a fix is planned once. The known forced-colors `color-contrast` false positive (see [overview, Field Notes](overview.md#-field-notes)) is routed to needs-review by rule id and pass, with its own measurement and release note, because it changes the exit code. | shipped, 0.4.0: `evidence` on every finding, `clusters`, `schemaVersion: 2`, and the forced-colors `color-contrast` rows routed to needs-review (an exit-code change, noted in the CHANGELOG) |
| **Route-change focus and live-region checks** | Checks that focus moves sensibly after a client-side route change, and that status messages reach a live region (SC 4.1.3), with fixtures in `test/fixtures/manifest.json`. | shipped, 0.4.0: `route-change-focus-lost`, `status-message-not-announced` and `live-region-injected-late`, run on `--interact` states only, with the `dialog-focus-not-returned` trigger fix from the 2026-10 benchmark |
| **Thin MCP server** | An MCP server that exposes the existing CLI subcommands as tools, adding no logic of its own, for clients that prefer MCP to a shell. | shipped, 0.4.0 (#31): `a11y-loop mcp`, six tools over stdio. Not yet submitted to the MCP registry, which lists no `a11y-loop` server on 2026-10-20 (`docs/overview.md` has the `server.json`) |
| **Release-branch tracking for the plugin directory** | The Anthropic directory submission tracks a release branch instead of a tag, so a release reaches the listing without re-pointing the submission by hand (see [`AGENTS.md`](../AGENTS.md#the-anthropic-plugin-directory)). `release.yml` fast-forwards `release` to each tag (#28); switching the submission's tracked ref to it is a manual step in the portal, not done yet. | shipped, 0.4.0: `release.yml` fast-forwards `release` to each tag (#28). The v0.4.1 run checked out shallow, was refused and only warned, so `release` was pushed to v0.4.1 by hand; the full-checkout fix is on `main` (CHANGELOG `[Unreleased]`) and first runs on the next tag. Switching the directory submission's tracked ref to `release` is a manual step in the portal, blocked while the submission is in review |
| **SARIF messages** | SARIF results carry a non-empty `message.text`. It has been empty since the converter era, a gap 0.3.0 left for its own change. | shipped, 0.4.0 |
| **Research refresh** | The July 2026 briefings in `docs/research/` brought up to date with dated, appended sections, and the distribution briefing kept current as submissions resolve. | shipped, 2026-10: dated sections appended in each briefing (#35); the distribution briefing is updated as submissions resolve |

## State as of 2026-10-20

Checked against npm, GitHub and the code. Replace this section, with its date, when a line changes.

| What | State |
|---|---|
| npm | `a11y-loop@0.4.1` is `latest`, published by `release.yml` with provenance |
| Releases | 0.4.0 (tag at `d3a91f1`) and 0.4.1 (`30017df`), both 2026-10-20 local time (22:10 and 22:50 UTC on 2026-10-19). GitHub Release v0.4.1 is Latest |
| 0.4.0 shipped | evidence tiers, root-cause clusters, forced-colors contrast routed to needs-review (an exit-code change), `schemaVersion: 2`, `diff` RECLASSIFIED, summary-first output, SARIF messages, the Stop-hook audit gate, the GitHub Action, `a11y-loop mcp`, plugin evals, three `--interact` checks, the dialog-opener fix |
| 0.4.1 shipped | the action's `description` cut to 116 characters for the Marketplace, held by `test/unit/action-manifest.test.js` |
| On `main`, untagged | `release.yml` checks out full history and fails a refused fast-forward; `plan-check` and the plan gate ignore a foreclosing risk the plan rules out, such as "no drag-only controls" (#45). Both in CHANGELOG `[Unreleased]` |
| `release` branch | at v0.4.1, pushed by hand after the v0.4.1 run only warned |
| Tests, fixtures, demo | 647 tests pass; 32 fixtures in the manifest; the demo reports 159 violations at axe-core 4.14.0 and converges to 0 |
| GitHub Marketplace | live from v0.4.1, categories Code quality and Testing: <https://github.com/marketplace/actions/a11y-loop-audit> |
| Anthropic plugin directory | In review for v0.3.2, plugin path `plugin`, auto-publish on, ref checked about every 6 hours (no webhook). The tracked ref is locked during review |
| Lists | skills.sh indexed; awesome-accessibility #113 merged; awesome-a11y #341 and ruanyf/weekly #12549 open; HelloGitHub declined |
| Submitted by hand, outcome unknown | W3C WAI tools list, awesome-copilot, axe-con 2027 call for speakers |
| MCP registry | not submitted |

**Pending, and on whom.**
- **The maintainer:** switch the directory's tracked ref to `release` once the review ends; tick
  "Publish this release to the GitHub Marketplace" on each new Release; publish to the MCP registry
  if wanted.
- **The next release:** the first run of the full-checkout `release.yml`; `release` must move with
  no hand push.
- **Others:** the directory review, awesome-a11y #341, ruanyf/weekly #12549, the W3C list,
  awesome-copilot, and axe-con (notification by 13 November).

## How to use this file

- **Before starting work,** check the status column. An **in progress** row has a branch; ask before
  starting a second one.
- **When an item ships,** set its status to `shipped, x.y.z` in the release PR, and describe it in
  the README, docs site or `SKILL.md` only from that release on.
- **When an item is dropped,** delete the row and say why in the CHANGELOG's next entry. Do not
  leave a row that nobody is building marked **in progress**.
