# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
