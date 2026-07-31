# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 0.2.0 in preparation

> `skill/a11y-loop/SKILL.md` (`metadata."a11y-loop/version"`) and `.claude-plugin/plugin.json`
> already carry `0.2.0`. `package.json` stays at the last published version until the release
> commit bumps it alongside this heading — see "Releasing" in `CONTRIBUTING.md`.

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
