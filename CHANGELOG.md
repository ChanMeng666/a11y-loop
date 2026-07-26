# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
