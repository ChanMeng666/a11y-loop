# a11y-loop benchmark: baseline vs. skilled generation (2026-10)

The same six UI components, built by the same model with and without the
a11y-loop skill, three runs per condition. Every file was then checked by three
engines: a11y-loop itself, IBM Equal Access, and Lighthouse. This is **not a
controlled study.** It is a small, repeated comparison from one model family.
Read it for the shape of the effect, not for a precise effect size.

The previous run is kept unchanged as
[benchmark-results-2026-07.md](benchmark-results-2026-07.md). Its files now live
under `outputs/2026-07/`, so the paths quoted inside it point one level higher
than they used to.

## What changed since 2026-07

- **Three runs per condition, not one**, so the tables show min and max as
  well as means.
- **Two engines that are not a11y-loop.** IBM Equal Access has its own rule
  engine. Lighthouse runs axe-core, the same rule engine a11y-loop uses, under
  its own configuration. So only IBM is an independent rules engine. Lighthouse
  cross-checks the harness, not the rules.
- **A clean baseline.** A probe showed that Claude Code subagents started from
  inside this repository can read its `AGENTS.md` and the project's memory
  index, both of which talk about accessibility. The as-designed baseline was
  therefore not a no-guidance condition. Both conditions were re-run from an
  empty directory outside the repository, and **those clean runs are the
  headline arms.** The contaminated runs are reported alongside them, because
  the difference is itself a finding. See
  [outputs/2026-10/contamination-probe.md](outputs/2026-10/contamination-probe.md).
- **A model review** of two converged files, labelled for what it is.

## Method

**Components.** A signup form, a pricing section, a customer-stories gallery, a
header with a mobile drawer, a newsletter modal, and a small dashboard. These
are the same six task descriptions as 2026-07, word for word.

**Model.** Claude Sonnet 5.5 (`claude-sonnet-5-5`) in both conditions, in a fresh
session per run.

**Arms.** The 2026-10 runs produced 72 HTML files across four arms.

| Arm | Harness | Context | Runs × files | Output |
|---|---|---|---|---|
| **baseline** (headline) | `claude -p --model sonnet`, Claude Code 2.1.303, started in an empty directory outside the repo | no project file, no memory index, a11y-loop plugin disabled | 3 × 6 | `outputs/2026-10/baseline/run-N/` |
| **skilled** (headline) | same | same, plus the prompt below | 3 × 6 | `outputs/2026-10/skilled/run-N/` |
| agent-tool baseline | Claude Code Agent tool, `model: "sonnet"` | inherits this repo's `AGENTS.md` and memory index | 3 × 6 | `outputs/2026-10/agent-tool/baseline/run-N/` |
| agent-tool skilled | same | same, plus the prompt below | 3 × 6 | `outputs/2026-10/agent-tool/skilled/run-N/` |

**Baseline prompt, verbatim.** Only the directory changed between runs. The
words accessibility, a11y, WCAG and ARIA do not appear in it. It is the 2026-07
baseline prompt unchanged.

> You are a web developer knocking out six small front-end deliverables for a
> startup's marketing site. Work quickly and pragmatically, the way you'd
> normally write this kind of code. Each deliverable is ONE self-contained HTML
> file (inline CSS in a `<style>` tag, inline JS in a `<script>` tag if needed,
> no external assets, no CDN). Make them look reasonably polished and modern.
>
> Write the six files to `D:\.claude-scratch\2026-10-20\ui-tasks-clean-N\`
> (create the directory):
>
> 1. `signup-form.html` — an email newsletter signup form: name, email, a
>    country dropdown, a marketing-consent checkbox, submit button.
> 2. `pricing.html` — a three-tier pricing section (Starter / Pro / Enterprise)
>    with feature lists and a call-to-action per tier; highlight the Pro tier.
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
> you'd typically build them. When done, list the six file paths as your final
> message.

**Skilled prompt.** It carried the same six task descriptions and the same
single-file constraints. Instead of the "work quickly" preamble, it told the
agent to read `skills/a11y-loop/SKILL.md` as binding standing instructions,
including §2. It then spelled out the loop for each file:

- audit with `a11y-loop audit --file … --out … --quiet`, adding `--interact`
  with a states module for the drawer and the modal;
- read both `violations` and `needsReview`, fix in source, re-audit, and run
  `diff` until there are zero violations and nothing NEW;
- write the report's `manualChecklist` to `<name>.checklist.md`;
- keep an honest `loop-log.md` with start and end timestamps.

The full text is in
[`outputs/2026-10/method/skilled-prompt.template.txt`](outputs/2026-10/method/skilled-prompt.template.txt).
There is no checklist output flag in 0.3.2, so the checklist was copied from the
JSON. The skill's §0 plan rules were not exercised, because each task arrived
fully specified.

**Engines and versions**

| Engine | Version | What it ran |
|---|---|---|
| a11y-loop | 0.3.2, axe-core 4.14.0, Chromium 156.0.8078.4 headless | five passes (default, dark, forced-colors, reduced-motion, 320×256 reflow) plus its own keyboard, dialog and focus probes; `--interact` states for header-nav and newsletter-modal on every arm, and for signup-form where the skilled agent wrote one |
| IBM Equal Access | `accessibility-checker` 4.0.34, policy `IBM_Accessibility`, rule archive `latest` = 2026.07.13, Puppeteer 25.14.0 driving Chromium 156.0.8078.4 | page load, one desktop viewport, no interaction |
| Lighthouse | 13.5.0, accessibility category only, its bundled axe-core 4.14.0, Chromium 156.0.8078.4 | page load, default mobile emulation (412×823), no interaction |

All pages were served over local HTTP, never `file://`. The a11y-loop audit of
every file was re-run by the benchmark operator, independently of the skilled
agents' own reports, and the two agree on every converged file. The oracle
installs were kept out of the repository.

**What the counts mean.**

- **a11y-loop:** `summary.violations`, `summary.needsReview` and
  `summary.manualChecklist`.
- **IBM:** results at level `violation`. Its `potentialviolation` level is IBM's
  equivalent of needs-review and is reported separately.
- **Lighthouse:** weighted accessibility audits with score 0 ("failed audits"),
  and the number of elements they list.

No engine's numbers are summed with another's, and no score is reported.

## Results: headline arms (clean context, N = 18 files per condition)

Per-file counts, shown as mean [min–max], with the total over 18 files after
the semicolon.

| Engine · measure | Baseline | Skilled, first audit | Skilled, converged |
|---|---|---|---|
| a11y-loop · violations | 2.50 [0–11]; 45 | 0.33 [0–3]; 6 | **0 [0–0]; 0** |
| a11y-loop · needsReview | 7.39 [0–24]; 133 | 1.44 [0–5]; 26 | 0.94 [0–5]; 17 |
| a11y-loop · manual-checklist items | 8.72 [5–11]; 157 | — | 9.33 [8–11]; 168 |
| IBM · violations | 3.39 [0–14]; 61 | not measured | **1.00 [1–1]; 18** |
| IBM · potential violations | 6.00 [2–13]; 108 | not measured | 5.72 [3–8]; 103 |
| Lighthouse · failed audits | 0.72 [0–2]; 13 | not measured | **0 [0–0]; 0** |
| Lighthouse · failing elements | 2.39 [0–12]; 43 | not measured | 0 [0–0]; 0 |
| Files with ≥1 finding: a11y-loop / IBM / Lighthouse | 8 / 9 / 10 of 18 | 2 / — / — | 0 / 18 / 0 of 18 |

The oracles saw only the converged files. Each skilled agent edited its files in
place, so the first-pass HTML does not survive, and the first-audit column comes
from the agents' own `reports/<name>.run1.json`.

**Per run (sum over six files).** The spread between runs is as large as the
spread between components.

| Run | Baseline: a11y-loop v · IBM v · LH failed audits | Skilled converged: a11y-loop v · IBM v · LH failed audits | Skilled loop iterations per file, self-reported |
|---|---|---|---|
| 1 | 18 · 20 · 4 | 0 · 6 · 0 | 1, 2, 1, 2, 3, 1 (mean 1.67) |
| 2 | 13 · 14 · 5 | 0 · 6 · 0 | 2, 2, 2, 2, 3, 2 (mean 2.17) |
| 3 | 14 · 27 · 4 | 0 · 6 · 0 | 1, 1, 1, 1, 4, 1 (mean 1.50) |

Iterations are listed in the order signup-form, pricing, gallery, header-nav,
newsletter-modal, dashboard.

**Per component, baseline, mean over three runs.** The violations are
concentrated in a few components.

| Component | a11y-loop v | IBM v | LH failed audits | What the engines flagged |
|---|---|---|---|---|
| dashboard | 11.0 | 12.7 | 2.0 | Muted text contrast in all three runs, flagged by all three engines; no `<main>` |
| gallery | 3.0 | 5.3 | 1.0 | Link `aria-label` not containing the visible text (a11y-loop `label-content-name-mismatch`, IBM `label_name_visible`); a card overflowing at 320px (a11y-loop's own reflow check, which neither oracle runs); no `<main>` |
| pricing | 0.7 | 2.3 | 1.0 | Contrast in one run; no `<main>` |
| signup-form | 0.3 | 0 | 0.3 | One small-print contrast failure in one run |
| header-nav | 0 | 0 | 0 | — |
| newsletter-modal | 0 | 0 | 0 | — |

On the a11y-loop side, the baseline's missing `<main>` appears under
best-practice (`landmark-one-main`), not as a violation. Lighthouse counts the
same axe rule as a weighted failure, which explains most of its baseline
failures.

## What a converged run still leaves, according to the oracles

This is the honest headline: what is left after a11y-loop reports zero
violations, as judged by engines other than a11y-loop's own.

- **Lighthouse: nothing.** All 36 converged skilled files had zero failed
  audits. That includes the agent-tool arm. Lighthouse shares a11y-loop's rules
  engine, so this agreement is expected and is weak evidence.
- **IBM Equal Access: exactly one violation in every converged file, all 36.**
  It is `aria_content_in_landmark` on the skip link, `<a href="#main"
  class="skip">`. The skill asks for a skip link to `<main>` on full pages, and
  every agent placed it as the first child of `<body>`, outside any landmark.
  IBM requires all content, including a skip link, to sit inside a
  landmark. axe does not apply that to skip links. The fix is cheap: put the
  skip link inside the `<header>` landmark. Whether this is a barrier or a
  ruleset difference is for a human to judge. It is reported here as IBM
  reports it.
- **IBM potential violations barely move.** The converged skilled files average
  5.72 per file against the baseline's 6.00. These are IBM's review items: focus
  visibility on styled controls, text that may be a heading, a missing
  `<blockquote cite>`, and colour as the only cue. The skill also adds a new
  review item IBM does not raise on the baseline: a skip link that is invisible
  until focused (`element_tabbable_visible`, 18 files). a11y-loop's needsReview
  falls much further, from 7.39 to 0.94, partly because the loop drives it down
  directly. The other engine's uncertain items stay roughly constant. This
  suggests the loop reduces the uncertainty a11y-loop can see more than
  uncertainty in general.
- **a11y-loop's own leftovers.** The 17 needsReview rows left after convergence
  are all `color-contrast` in the forced-colors pass, on light text over a
  coloured fill. They match the known forced-colors false positive documented
  in `docs/overview.md` § Field Notes. The agents left them visible rather than
  suppressing them, as §3 requires.

**The manual checklist** averaged 9.33 items per converged skilled file, 168 in
total. That is slightly more than the baseline's 8.72, because the skilled pages
contain more of the things the checklist asks about, such as forms with error
states. Automated checks reach a minority of WCAG failures: Deque puts it at 57%
of issues by volume of individual instances. The checklist is the part of each
file no engine above judged.

## First audit vs. converged (skilled)

Six first-audit violations appeared across the 18 headline skilled files.

- **Three were real.** All three were in header-nav run 1: the drawer took no
  initial focus, did not trap focus, and did not close on Escape. The agent
  fixed them in source.
- **Three were a tool artifact.** Each was `dialog-focus-not-returned` on
  newsletter-modal, one per run. a11y-loop 0.3.2 treats the last clicked element
  as the dialog's trigger. A validation-error state that clicks the dialog's own
  submit button therefore makes the probe expect focus to return to that
  button. All three agents traced this and changed their states module rather
  than the page, by calling `requestSubmit()` or tabbing out of the field. The
  2026-07 skilled log records the same artifact. The engine was fixed in 0.4.0:
  the opener is now recorded when the dialog opens, so a click on the dialog's
  own submit button no longer counts as its trigger (see the CHANGELOG).

The same artifact hit the benchmark operator's own baseline states module. Its
first version clicked the submit button and produced one false violation per
baseline modal. The baseline numbers above use a `requestSubmit()` driver, which
is the shape the skilled agents converged on. The click-driven reports are kept
as `audit/newsletter-modal.click-driver.json` in the agent-tool baseline runs.
Counting this artifact as a real defect would overstate both conditions.

## The contaminated arms: the context effect

Before they could see a project file about accessibility, the baseline runs
averaged 15 a11y-loop violations per six-file set. With `AGENTS.md` and the
memory index in context, they averaged **zero**.

| Engine · measure (N = 18 per arm) | Clean baseline | Agent-tool baseline | Agent-tool skilled, converged |
|---|---|---|---|
| a11y-loop · violations | 2.50 [0–11]; 45 | **0 [0–0]; 0** | 0 [0–0]; 0 |
| a11y-loop · needsReview | 7.39 [0–24]; 133 | 3.28 [0–10]; 59 | 0.83 [0–5]; 15 |
| IBM · violations | 3.39 [0–14]; 61 | 1.94 [0–8]; 35 | 1.00 [1–1]; 18 |
| Lighthouse · failed audits | 0.72 [0–2]; 13 | 0.72 [0–1]; 13 | 0 [0–0]; 0 |

The agent-tool baseline's remaining oracle findings are all landmark rules:
`landmark-one-main` in Lighthouse, and `aria_content_in_landmark` plus
`skip_main_exists` in IBM. It had no contrast failures at all. The agent-tool
skilled arm's first audits had seven violations: two contrast, two
label-in-name, and three of the dialog-trigger artifact. Its loops took 1 to 6
iterations per file, means of 2.67, 2.00 and 1.50 per run.

This is an uncontrolled observation: one prompt and three runs per arm. It still
says something useful. **An accessibility-minded project instruction file,
never mentioned in the prompt, removed every a11y-loop violation from this
model's baseline output.** It did not remove the landmark findings that the
other two engines flag. Whether the 2026-07 baseline was exposed the same way
cannot be established now.

## The 2026-07 files under today's engines

The twelve 2026-07 files were re-audited with a11y-loop 0.3.2 and checked by
both oracles. Their reports are in `outputs/2026-10/reaudit-2026-07/`.

| Engine · measure (N = 6 per arm) | 2026-07 baseline | 2026-07 skilled, converged |
|---|---|---|
| a11y-loop · violations | 5.83 [0–24]; 35 | 0 [0–0]; 0 |
| a11y-loop · needsReview | 5.83 [2–13]; 35 | 0.33 [0–2]; 2 |
| IBM · violations | 10.17 [1–22]; 61 | 0.17 [0–1]; 1 |
| Lighthouse · failed audits | 1.33 [1–2]; 8 | 0 [0–0]; 0 |

On axe-core 4.14.0, a11y-loop finds the same 35 baseline violations it found on
4.12.1 in July. needsReview is 35, not 36, because one `focus-indicator-contrast`
row on the modal no longer appears. Only one 2026-07 skilled file, header-nav,
has a skip link. Its single IBM finding is the same `aria_content_in_landmark`
on that skip link. The 2026-10 skilled files put a skip link in every file, so
they carry that finding in every file.

## What no engine can see

One Claude Opus 5.5 subagent read two converged headline files, `skilled/run-1`
newsletter-modal and header-nav, against
`skills/a11y-loop/references/manual-testing.md`. **This was a model reading
code, not a human review and not an assistive-technology test.** Its notes are
in [outputs/2026-10/model-review.md](outputs/2026-10/model-review.md).

The one item it rated likely was in header-nav. Below 760px only the list is
hidden, so the "Main" navigation landmark stays in the accessibility tree,
empty. The items it rated possible include these:

- an error message that is both an alert and the field's description, spoken
  twice or cut off;
- a success status filled after focus has already moved, so it may go
  unannounced;
- focus dropping to `<body>` when the viewport widens with the drawer open,
  which no audited state does;
- the drawer's current-page link marked by colour and weight only.

None of these appear in any engine's output above. Each needs a person, and
ideally a screen reader such as NVDA (free on Windows) or VoiceOver (built into
macOS and iOS), to confirm or dismiss.

## Relation to published work

W4A'25 (Gurita and Vatavu, [doi:10.1145/3744257.3744266](https://doi.org/10.1145/3744257.3744266))
is the only study cited here, and only like this. It was a one-task study
(a banking-app homepage) of two models, with 40 first-pass UIs. Accessibility-
oriented prompts cut expert-judged violation rates from 58% to 19%, while one
automated tool (MAUVE++) showed 17.32% against 15.93%. Barriers persisted,
particularly in semantic structure.

That is not directly comparable to this benchmark. The tasks, models, metrics
and sample sizes all differ. W4A'25's prompt was one sentence naming WCAG 2.1 AA
requirements, where SKILL.md is an itemized rule set with an audit loop, and no
verification loop was tested there. The persistent semantic-structure barriers
are at least consistent with what remains here: landmark placement in every
converged file, and an empty navigation landmark in the model review.

## Honesty notes and threats to validity

- **Not a controlled study.** There are three runs per condition and six
  components. The run-to-run spread is wide (13 to 18 baseline violations per
  set on a11y-loop, 14 to 27 on IBM), and there are no confidence intervals.
- **Same model family on every side.** Sonnet 5.5 generated everything. The
  model review used Opus 5.5 from the same family, and the benchmark operator
  was a Claude agent too. Nothing here was produced by a person.
- **a11y-loop is one of the three engines, and the loop optimizes for it.**
  Zero a11y-loop violations after convergence holds by construction. Lighthouse
  shares a11y-loop's axe-core rules, so its agreement is close to circular. IBM
  Equal Access is the only independent rules engine here. The one thing it
  consistently disagrees on is the skip link.
- **The oracles saw less than a11y-loop did.** IBM and Lighthouse checked the
  load state at one viewport each. They saw no dark mode, no forced colors, no
  reflow, no drawer and no open dialog. Findings that exist only in those states
  are invisible to them on both sides.
- **States were not symmetric.** The benchmark operator wrote the baseline
  states modules: drawer and search for header-nav, open and error for the
  modal. The skilled agents wrote their own, and some added signup-form error
  states. That gives a11y-loop more surface to find problems on the skilled
  side, not less.
- **The headline arms and the specified design differ.** The specified design
  used the Agent tool for both conditions. That design is still reported, as
  the agent-tool arms, but its baseline turned out to be contaminated. The clean
  arms use a different harness, `claude -p`, with the same model, the same
  prompts and the same user-level instructions, which say nothing about
  accessibility.
- **The contamination probe is a self-report.** A model answered a question
  about its own context. The behavioural gap between the clean and agent-tool
  baselines is the stronger evidence.
- **Fixture-style pages.** These are single-file static demos with no routing,
  real data or backend.
- **No accessibility verdict.** Nothing in this report says any of these files
  is accessible or conforms to WCAG. a11y-loop found no automatically
  detectable failures in the states it drove on the converged files. The other
  engines' remaining findings and each file's manual checklist say what is
  still open.

## Cost

| Arm | Wall time per run (s) | Tokens per run |
|---|---|---|
| baseline (clean) | 68, 72, 60 | 10.4k–12.9k output; $0.19–0.23 list |
| skilled (clean) | 308, 275, 383 | 27.1k–31.6k output, 1.0M–1.6M cache reads; $0.62–0.80 list |
| agent-tool baseline | 108, 104, 90 | 58k–61k subagent tokens |
| agent-tool skilled | 925, 374, 472 | 102k–126k subagent tokens |
| model review (Opus) | 66 | 72k subagent tokens |

Per-run detail is in `outputs/2026-10/method/generation-runs.json`. A skilled
run cost about three to five times its clean baseline in wall time.

## Files

- `outputs/2026-10/{baseline,skilled}/run-N/` holds each run's HTML and states
  modules. The skilled runs also hold the agent's `reports/` (each iteration's
  raw a11y-loop JSON and CLI output), `loop-log.md` and `<name>.checklist.md`.
  `audit/` holds the operator's independent raw a11y-loop JSON for the final
  files.
- `outputs/2026-10/agent-tool/{baseline,skilled}/run-N/` has the same layout for
  the contaminated arms.
- `outputs/2026-10/oracles/ibm-equal-access.json` and `lighthouse.json` are
  trimmed to the counts and findings the tables use, keyed by published path.
- `outputs/2026-10/reaudit-2026-07/` holds a11y-loop 0.3.2 reports for the
  2026-07 files.
- `outputs/2026-10/method/` holds the prompts, the serve, audit, oracle and
  aggregation scripts, the IBM config, the aggregated per-file data
  (`aggregate.json`, which uses scratch arm names: `baseline-clean` means
  `baseline`, and `baseline` means `agent-tool/baseline`) and the run costs.
