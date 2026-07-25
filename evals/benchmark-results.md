# a11y-loop benchmark: baseline vs. skilled generation

A small, illustrative comparison of the same six UI components built twice by
the same model — once with no accessibility guidance, once following
`skill/a11y-loop/SKILL.md` and running the audit loop to convergence. This is
**not a controlled study**: N=6 components, a single run per condition, one
model family, and the audits are produced by a11y-loop's own engine. Read the
numbers with that in mind; the point is to show the shape of the effect, not
to claim a precise size.

## Method

Both conditions built the same six components: a signup form, a pricing
page, an image gallery, a header navigation (with a mobile drawer), a
newsletter modal, and a dashboard. Both were built by Claude Sonnet 5, run as
a Claude Code subagent (not a raw model API call) — see the honesty notes
below for what that implies.

**Baseline — the exact prompt, verbatim:**

> You are a web developer knocking out six small front-end deliverables for
> a startup's marketing site. Work quickly and pragmatically, the way you'd
> normally write this kind of code. Each deliverable is ONE self-contained
> HTML file (inline CSS in a `<style>` tag, inline JS in a `<script>` tag if
> needed, no external assets, no CDN). Make them look reasonably polished and
> modern.
>
> Write the six files to `[a scratchpad path outside this repo, named
> "ui-tasks"]` (create the directory):
>
> 1. `signup-form.html` — an email newsletter signup form: name, email, a
>    country dropdown, a marketing-consent checkbox, submit button.
> 2. `pricing.html` — a three-tier pricing section (Starter / Pro /
>    Enterprise) with feature lists and a call-to-action per tier; highlight
>    the Pro tier.
> 3. `gallery.html` — a "customer stories" card grid: 6 cards, each with a
>    photo (use inline SVG placeholders or data URIs), customer name, quote,
>    and a link to the full story.
> 4. `header-nav.html` — a site header: logo (text is fine), horizontal nav
>    with 5 links, a search icon button, and a hamburger menu that toggles a
>    mobile drawer.
> 5. `newsletter-modal.html` — a page with a "Subscribe" button that opens a
>    modal dialog containing a one-field email form and a close button.
> 6. `dashboard.html` — a small analytics dashboard section: 4 stat tiles
>    (number + label + trend indicator) and a recent-activity list.
>
> Constraints: vanilla HTML/CSS/JS only. Do not read any other files or
> documentation — just write the six files from your own knowledge, the way
> you'd typically build them. When done, list the six file paths as your
> final message.

The words accessibility/a11y/WCAG/ARIA never appear anywhere in that prompt.
Output: `evals/outputs/baseline/*.html`.

**Skilled — same six task descriptions, verbatim, with a different
preamble and an added loop requirement:**

> You are a web developer building six small front-end deliverables, and you
> MUST follow the a11y-loop skill throughout. FIRST read
> `skill/a11y-loop/SKILL.md` completely and treat its instructions as
> binding … consult its `references/` files when you implement a pattern
> they cover.
>
> … after writing each file, run `a11y-loop audit` … fix ALL violations,
> re-audit until zero violations, and for the modal page ALSO audit the
> modal-open state via `--interact`.

The skilled agent was also required to log first-audit violations and
iteration counts honestly to `loop-log.md`. Output:
`evals/outputs/skilled/*.html`, reports in
`evals/outputs/skilled/reports/*.json`, iteration-by-iteration record in
`evals/outputs/skilled/loop-log.md`.

**Two honesty notes this comparison depends on:**
1. The baseline agent's output directory was a neutral scratchpad path named
   "ui-tasks", outside this repository, specifically so no trace of the
   a11y-loop skill, its `SKILL.md`, or its tooling could leak into that
   agent's context by proximity.
2. Both agents are Claude Code subagents, not raw, unscaffolded model calls
   — and the skilled agent knew in advance that its output would be
   audited. That means this benchmark measures **the skill+loop system**
   (rules + the knowledge of being checked + the mechanical loop itself),
   not the intrinsic, unprompted behavior of the underlying model in a
   vacuum. A raw-API, no-agent-framework comparison would isolate the
   model's prior alone; this one does not attempt that.

Both sets were audited with the same tool and the same passes: `a11y-loop
audit` runs five rendering passes per file (default, dark, forced-colors,
reduced-motion, and a 320×256 reflow viewport) using axe-core 4.12.1 in
headless Chromium. `header-nav` and `newsletter-modal` were additionally
driven through their interactive states with `--interact` (opening the
mobile drawer / search field; opening the newsletter dialog and triggering
its validation-error state), mirroring exactly how the skilled side was
audited. Baseline reports: `evals/outputs/baseline/reports/*.json`.

**The circularity to state plainly:** the loop optimizes exactly what the
auditor measures. A11y-loop grading its own output is not independent
verification. This is mitigated, not eliminated, by the fact that every
finding is axe-core-grounded (a third-party, industry-standard rules engine,
not a bespoke scorer a11y-loop's author could tune to flatter itself) and by
the loop-log's practice of investigating rather than dismissing ambiguous
findings — but a genuinely independent audit (a different tool, or a human)
would be needed to close this gap.

## Results

Violations are grouped by axe/a11y-loop `impact`; "final" is the skilled
file's state after its loop converged (all numbers from the JSON reports, not
estimates).

| Component | Baseline violations (impact) | Baseline needsReview | Skilled first-audit violations | Skilled first-audit needsReview | Skilled final violations | Skilled final needsReview | Loop iterations |
|---|---|---|---|---|---|---|---|
| signup-form | 0 | 5 | 0 | 1 | 0 | 0 | 2 |
| pricing | 24 (serious: 24) | 13 | 0 | 1 | 0 | 0 | 2 |
| gallery | 0 | 6 | 0 | 6 | 0 | 0 | 2 |
| header-nav | 0 | 5 | 0 | 0 | 0 | 0 | 1 |
| newsletter-modal | 3 (serious: 3) | 5 | 1 (serious: 1) | 2 | 0 | 2 | 2 |
| dashboard | 8 (serious: 8) | 2 | 0 | 0 | 0 | 0 | 1 |
| **Total** | **35** | **36** | **1** | **10** | **0** | **2** | avg 1.67 |

Distinct WCAG success criteria hit by **baseline violations**: 1.4.3
(Contrast Minimum — `pricing`, `newsletter-modal`, `dashboard`), 2.4.3 (Focus
Order — `newsletter-modal`), 2.1.2 (No Keyboard Trap — `newsletter-modal`),
2.1.1 (Keyboard — `newsletter-modal`). Adding needsReview widens this to six
SCs, also touching 1.4.11 (Non-text Contrast) and 2.5.8 (Target Size
Minimum, WCAG 2.2).

Baseline violation detail by rule:
- `pricing`: 24× `color-contrast` (serious) — the pricing page's body text
  and "Most popular" badge fail 4.5:1 against their backgrounds.
- `newsletter-modal`: `dialog-initial-focus`, `dialog-focus-not-trapped`,
  `dialog-escape-does-not-close` (one each, serious) — the modal is a plain
  `div[role="dialog"]` with no focus management: focus does not move into it
  on open, Tab escapes it into the page behind, and Escape does not close it.
- `dashboard`: 8× `color-contrast` (serious).

Baseline needsReview detail by rule: `color-contrast` (16, across
signup-form/pricing/newsletter-modal/dashboard), `target-size-min` (12,
across signup-form/gallery/header-nav), `focus-indicator-contrast` (8, across
signup-form/pricing/newsletter-modal).

Skilled side: the one first-audit violation (`newsletter-modal`,
`dialog-focus-not-returned`) and both remaining final needsReview items are
documented finding-by-finding, with root cause and disposition, in
`evals/outputs/skilled/loop-log.md`.

## The headline numbers

- **Baseline: 35 violations across 6 components** (average 5.8 per
  component) versus **1 violation on first generation** with the skill
  (average 0.17 per component) — roughly a 97% reduction from generation-time
  rules alone, before any audit loop ran.
- **0 violations after the loop**, on both files that started with any
  (`newsletter-modal`'s single violation, plus the loop closing out every
  needsReview it could resolve on the other five).
- **Average 1.67 completed audit iterations per component** to reach that
  state (range 1–2; see `loop-log.md` for the per-file record, including one
  pre-audit tooling fix on `header-nav` that was a Playwright script error,
  not a violation, and is not counted as an iteration).
- **needsReview: 36 on the baseline set versus 10 on the skilled set's first
  audit, versus 2 after the loop** — and those final 2 are not silently
  dismissed: `loop-log.md` records the investigation for each (one is axe's
  own uncertainty about a native `<dialog>`'s accessibility-tree visibility
  while closed, confirmed correct by reading the markup; the other is a
  contrast value axe could not compute due to a transient overlap during the
  modal's open transition, manually verified with `a11y-loop contrast` at
  6.53:1 and 7.11:1 against a 4.5:1 threshold).

## Reading the result

Two different things happened here, and the benchmark is only useful if they
are kept separate:

**What the generation rules alone contributed** (baseline → skilled
first-audit): violations dropped from 35 to 1 before a single audit ran.
On this run, standing generation-time rules (SKILL.md's failure-mode
checklist — clickable divs, icon-button names, `outline: none`, dangling ARIA
refs, focus management, etc.) did most of the work of avoiding the *loud*
failures: broken dialog focus management, systemic contrast failures. That is
a larger first-pass effect than W4A'25 found (accessibility-oriented prompts
there had a slightly *higher* violation rate than neutral ones, 17.32% vs.
15.93% — see `docs/research/market.md` §A3) — plausibly because SKILL.md is a
concrete, itemized failure-mode checklist rather than a generic
"be accessible" instruction, but the comparison is not apples-to-apples (that
study measured a different violation rate metric across many more samples).

**What the loop contributed** (skilled first-audit → final): the generation
rules did *not* get to zero on their own — one real violation
(`newsletter-modal`'s focus management) still needed a fix, and, more
tellingly, **10 needsReview findings existed after generation that the rules
alone did not touch at all** (forced-colors button contrast from a
`background`-shorthand CSS property, undersized tap targets, indeterminate
focus-indicator contrast). None of these are things a "write accessible code"
instruction reliably catches, because they depend on how the rendered page
actually measures under specific conditions (forced-colors mode, a 24×24px
minimum, dark mode). The loop is what converted "unknown" into "fixed" or
"investigated and reasoned about" for every one of them. This is the
concrete version of the W4A'25 finding cited in `docs/research/market.md`:
instructions alone are not demonstrably sufficient; here they got close on
raw violation count but left the entire needsReview surface — arguably the
harder, more judgment-dependent half of the audit — untouched until the loop
ran.

## Threats to validity

- **Single run per condition.** No repeated sampling; a different seed could
  land differently, especially for `newsletter-modal` and `pricing`, which
  had the only non-zero baseline/skilled-first-audit violation counts.
- **Self-audited.** The auditor and the artifact being scored share an
  author (a11y-loop's own engine); see the circularity note in Method.
- **Same model family both sides.** No comparison across model providers or
  capability tiers; a weaker or stronger base model could compress or widen
  the gap between conditions.
- **Small N.** Six components is enough to see a pattern, not enough to
  support a confidence interval.
- **Baseline is not a strawman.** Modern models write partially accessible
  code even with no prompting — three of six baseline files
  (`signup-form`, `gallery`, `header-nav`) had **zero** automated violations
  and differed from the skilled side mainly in needsReview volume
  (undersized targets, indeterminate focus contrast). The effect shown here
  is concentrated in the two/three components where the baseline model made
  a structural mistake (unmanaged custom dialog, systemic contrast), not a
  uniform "every baseline component is broken."
- **Fixture-style pages, not real apps.** All twelve files are single-file
  static demos with no routing, real data, or backend; some real-world
  failure modes (async content, SPA focus management across route changes,
  live regions under real state changes) are structurally out of scope for
  both conditions.
