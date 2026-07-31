---
name: a11y-loop
description: >-
  Make accessibility a decision in the plan, accessible markup the default when
  writing UI, then verify it in a real browser instead of assuming. Use when
  planning, scoping or designing anything with a user interface — a new app or
  page, a design system, a component library choice, a brand palette, a feature
  roadmap — and whenever generating or modifying user interface code (HTML,
  JSX/TSX, Vue, Svelte, Astro, CSS): forms, modals, menus, tabs, tables,
  navigation, pricing pages, dark mode, colors. Also whenever the user asks for
  an accessibility audit, an a11y check or fix, a WCAG review, a contrast fix,
  or help with screen readers, keyboard navigation, focus order, ARIA, alt
  text. Supplies plan-phase rules (conformance target, per-component acceptance
  criteria, product decisions that foreclose accessibility, color-token and
  structure planning), standing generation rules (semantic HTML first, ARIA
  discipline, APG keyboard contracts, labels, focus visibility, AA contrast in
  light and dark, reduced motion, 24x24 targets), a mandatory
  audit-fix-re-audit loop driven by the `a11y-loop` CLI (axe-core in Chromium
  across default, dark, forced-colors, reduced-motion and 320px passes), and
  honest reporting of what automation cannot judge. Keywords: accessibility,
  a11y, WCAG 2.2 AA, ARIA, axe-core, contrast ratio, screen reader. Not for
  backend-only work with no UI.
license: MIT
compatibility: >-
  Verification needs Node.js >= 20 and Playwright Chromium. Install with
  `npm i -g a11y-loop && npx playwright install chromium` (set
  PLAYWRIGHT_BROWSERS_PATH first if you keep browsers off the system drive).
  The generation and honesty rules apply with or without the CLI; every step
  that says "audit" requires it.
metadata:
  "a11y-loop/version": "0.2.0"
allowed-tools: 'Bash(a11y-loop *) Bash(npx a11y-loop *) Bash(node ${CLAUDE_SKILL_DIR}/../../src/cli.js *)'
---

# a11y-loop

These are standing instructions. **For the remainder of this session: when you
are planning UI work apply §0, when you write or modify UI code apply §1 as you
write it, run §2 before you call the work done, and speak about the result only
in the terms allowed by §3.** They stay in force across turns — you do not need
to be reminded.

Prompting alone does not work. UIs generated from accessibility-oriented
prompts measure *slightly worse* than accessibility-agnostic ones (W4A'25,
17.32% vs 15.93% violation rate). §1 is the setup; §2 is the product. Skipping
the loop reverts you to the baseline where 84% of AI-generated pages carry
accessibility failures.

## Resolving the CLI

Resolve once per session, first form that answers `--version` wins. Call the
result `A11Y` below.

1. `a11y-loop --version` — installed globally or as a project dependency.
2. `npx a11y-loop --version` — no install needed.
3. `node ${CLAUDE_SKILL_DIR}/../../src/cli.js --version` — this skill sitting
   inside a checkout of the a11y-loop repo.

```
A11Y audit <url>                     # dev server — primary loop path
A11Y audit --file path/to/page.html  # served over 127.0.0.1 (never file://)
A11Y audit --html "<fragment>"       # wrap + serve generated markup
    --json --out report.json --sarif out.sarif --interact states.mjs
    --headed --no-best-practice --quiet
A11Y contrast <fg> <bg> [--large] [--ui] [--fix] [--json]
A11Y diff --before before.json --after after.json
```

Exit codes: `0` no violations · `1` violations found · `2` tool error.

Every audit runs five passes automatically: default 1280x720, dark mode,
forced-colors, reduced-motion, and 320x256 (the WCAG-sanctioned equivalent of
400% zoom for SC 1.4.10). Dark-mode contrast failures are common and invisible
to a single default-mode scan, so never hand-roll a single-pass axe call
instead.

JSON report shape: `findings.violations`, `findings.needsReview`,
`findings.bestPractice`, `manualChecklist`, `summary`; each finding carries a
stable `fingerprint`, a `wcag` block (`sc`, `name`, `level`, `minVersion`,
`wcag22Only`), `act[]` rule IDs, and — for contrast — concrete
`suggestions[]` with hex values and before/after ratios.

---

## §0 Plan rules

Apply while scoping, designing, or estimating — before any code exists.

**Set the conformance target first and write it down.** Default to **WCAG 2.2
Level AA**: 2.2 is backward compatible, so it satisfies every major jurisdiction
at once — NZ Standard 1.2 and UK public sector at 2.2 AA, EU EN 301 549 v3.2.1
and US ADA Title II at 2.1 AA, US Section 508 at 2.0 AA. If the user's
jurisdiction, sector, or contract demands otherwise, ask once and record the
answer. Version table and sources: [references/plan-phase.md](references/plan-phase.md).

**Write accessibility as plan items, never as a final "accessibility pass."**
Each UI component in the plan carries its success criteria and its keyboard
contract alongside the rest of its scope. A plan whose last step is "then run an
accessibility audit" is exactly the pattern this skill exists to eliminate — it
defers the decisions §1 depends on until changing them costs a rewrite.

**Name the decisions that foreclose accessibility while they are still free to
change**, and propose the alternative in the same breath: drag-only reordering
(SC 2.5.7 — add move up/down or a "move to" menu), hover-only menus (SC 1.4.13 —
open on click, dismissible and hoverable), infinite scroll with no pagination
fallback, canvas/WebGL data with no DOM or table equivalent, timed flows (SC
2.2.1), autoplaying media (SC 1.4.2), CAPTCHA (SC 1.1.1 + 3.3.8 — a
non-cognitive path alongside it), and any custom widget where a native element
or an APG pattern would serve. Each is a product decision, not a CSS bug; after
launch it is re-architecture.

**Fix the color system before the components exist.** Run
`A11Y contrast <fg> <bg> --fix` on every pair the design intends — body, muted,
link, error, disabled, focus ring, control border — in **light and dark**, and
let the passing values become the tokens. Unlike §2 it needs no browser, no
render, and no code, so it is genuinely usable at plan time; low-contrast text
is the most common failure in the wild (83.9% of pages) and the cheapest to
never introduce.

**Vet a component library before adopting it**, not after — checklist in
[references/plan-phase.md](references/plan-phase.md).

**Decide the structure once**, in the plan: heading outline, landmark map, focus
order and keyboard map, skip links, and where focus lands on an SPA route
change. Left to per-component decisions later, these always drift.

**Plan the verification too.** List the states that will need an `--interact`
module — every modal, error state, route, expanded menu, and async list is a
state — say where the audit gates sit (per component, before merge, in CI), and
budget the manual testing §3 requires. It is neither optional nor free.

**Before you present a plan that touches UI, check it:** target written down?
every component carrying its criteria and keyboard contract? foreclosing
decisions named with alternatives? color pairs run through `contrast --fix` in
both modes? structure decided? `--interact` states listed? manual budget stated?
Then include this section in the plan, in this shape:

```markdown
### Accessibility
- **Target:** WCAG 2.2 Level AA — <rationale / jurisdiction>
- **Per-component criteria:** <component> → <SC list> + <keyboard contract source>
- **Foreclosing decisions:** <none reviewed | list + alternatives>
- **Color tokens:** <pairs verified with contrast --fix, light + dark>
- **Structure:** <heading outline / landmarks / focus order>
- **Verification:** <states needing --interact | where the audit gate sits>
- **Manual budget:** <what automation cannot judge here>
```

---

## §1 Generation rules

Apply while writing, not afterwards.

**Semantic HTML first.** `<button>`, `<a href>`, `<input>`, `<select>`,
`<dialog>`, `<table>`, `<nav>`, `<main>`, `<h1>`–`<h6>`. Native elements bring
focus, keyboard behavior, and state announcement for free; a `div` brings none
of it. The four rules of ARIA use ([Using ARIA](https://www.w3.org/TR/using-aria/),
now a discontinued draft but still the canonical statement):

1. "If you can use a native HTML element or attribute with the semantics and
   behavior you require already built in, instead of re-purposing an element
   and adding an ARIA role, state or property to make it accessible, then do
   so."
2. "Do not change native semantics, unless you really have to."
3. "All interactive ARIA controls must be usable with the keyboard."
4. "Do not use `role="presentation"` or `aria-hidden="true"` on a focusable
   element."

**No ARIA is better than bad ARIA.** Wrong ARIA actively misrepresents the
interface to screen reader users — worse than none. Empirically, pages *with*
ARIA average more failures than pages without (WebAIM Million 2026: 59.1 vs
42.0). Add ARIA only when you can name the native gap it fills.

**A role is a promise.** `role="button"` commits you to Enter and Space
activation, focusability, and a disabled state. `role="tab"` commits you to the
whole arrow-key contract. ARIA creates zero behavior; an unfulfilled promise is
a false accessibility interface. If you cannot implement the contract, use the
native element or ship the plain version.

**Every APG-pattern component follows its APG keyboard contract.** Dialog,
tabs, accordion, menu button, combobox, disclosure, radio group, switch,
tooltip, listbox — contracts in
[references/apg-patterns.md](references/apg-patterns.md). For any widget not in
that file, read its APG page before implementing it.

**Names and labels.**
- Every input has a programmatic label: `<label for>`, wrapping `<label>`, or
  `aria-label`. A placeholder is not a label.
- Every link and button has a non-empty accessible name. Icon-only controls get
  `aria-label` (or visually-hidden text); the icon `<svg>` gets
  `aria-hidden="true"`. Empty links (46.3% of pages) and empty buttons (30.6%)
  are overwhelmingly icon-only controls.
- Visible label text must be contained in the accessible name (SC 2.5.3), so
  voice-control users can say what they see.
- Group related fields in `<fieldset>` with `<legend>`.

**Structure.** `<html lang="…">` on every document. One `<h1>`; heading levels
descend without skipping — pick the level from the outline, style with CSS.
Landmarks: `<header>`, `<nav>`, `<main>` (exactly one), `<footer>`. A skip link
to `<main>` on full pages.

**Focus.** Always ship a visible `:focus-visible` indicator with at least 3:1
contrast against what surrounds it. Never `outline: none` without a
replacement. Never a positive `tabindex`. `tabindex="-1"` only for
programmatic focus targets. After a route change or view swap in an SPA, move
focus deliberately (to the new `<h1>` or a `tabindex="-1"` container) and
announce it — focus otherwise stays on a destroyed node.

**Color.** Every text/background pair must meet WCAG AA in **both** light and
dark mode: 4.5:1 normal text, 3:1 large text (>=24px, or >=18.5px bold), 3:1
for UI component boundaries and meaningful graphics. Low-contrast text is the
single most common failure in the wild (83.9% of pages). When choosing or
adjusting a color, run `A11Y contrast <fg> <bg> --fix` and take a returned
candidate rather than guessing. Never encode meaning in color alone — pair it
with text, shape, or an icon.

**Motion and pointers.** Wrap non-essential animation in
`@media (prefers-reduced-motion: reduce)` and actually reduce it there. Pointer
targets are at least 24x24 CSS px, or adequately spaced (SC 2.5.8). Anything
draggable needs a single-pointer alternative — a click, a button, a field (SC
2.5.7). No content that appears on hover unless it is dismissible, hoverable,
and persistent (SC 1.4.13).

**Dynamic content.** Async results, validation errors, toasts, and filter
counts must be announced: `role="status"` / `aria-live="polite"` (or
`role="alert"` for errors), with the live region present in the DOM *before*
the text arrives. Associate field errors via `aria-describedby` and set
`aria-invalid`. Reflect widget state in `aria-expanded`, `aria-checked`,
`aria-selected`, `aria-current` — and update it in the same handler that
changes the visuals.

**Before you save a UI file, re-read it against
[references/ai-failure-modes.md](references/ai-failure-modes.md)** — the
blacklist of failures generated code reproduces most: clickable `div`,
icon-button with no name, placeholder-as-label, skipped headings,
`outline: none`, `aria-labelledby` pointing at an id that does not exist,
`aria-hidden` on a focusable element, role without behavior, missing `lang`,
ignored reduced motion, SPA focus loss, unannounced updates, positive
`tabindex`, invented alt text.

---

## §2 The loop

**After any UI change, before reporting the work as done:**

1. **Make it renderable.** Start or reuse the dev server, run the build, or
   write the fragment to a file. Pick the input mode: `<url>` for a running app
   (preferred — it audits what actually ships), `--file` for a static page,
   `--html` for a component fragment you just generated.
2. **Audit, including the states you just built.** A load-time scan finds
   nothing inside a closed modal. Write a small interact module naming each
   state your change introduced and pass it with `--interact`; each state is
   driven and then audited:

   ```js
   // .a11y/states.mjs
   export const states = {
     'settings-dialog-open': async (page) => {
       await page.getByRole('button', { name: 'Settings' }).click();
     },
     'signup-form-error': async (page) => {
       await page.getByRole('button', { name: 'Create account' }).click();
     },
     'results-loaded': async (page) => {
       await page.getByLabel('Search').fill('wcag');
       await page.getByRole('button', { name: 'Search' }).click();
       await page.getByRole('list', { name: 'Results' }).waitFor();
     },
   };
   ```

   Opened a modal? Added an error state? Added a route, a tab panel, an
   expanded menu, an async list? Each one is a state. Audit it.

   ```
   A11Y audit http://localhost:5173 --interact .a11y/states.mjs --json --out .a11y/run-1.json
   ```

3. **Read `findings.violations` and `findings.needsReview`.** Both. A
   needsReview item is a place the engine knows it could not decide — usually
   contrast over a gradient, image, or translucent layer. Resolve it by
   reasoning about the source, not by ignoring it.
4. **Fix in the source files**, never in the report or by suppressing a rule.
   For contrast findings, use the report's `suggestions[]` or
   `A11Y contrast <fg> <bg> --fix`, which returns both a lighter and a darker
   passing candidate with hue preserved; pick the one closest to the design
   intent and apply it to the design token, not to one element.
5. **Re-audit to a new file, then diff.**

   ```
   A11Y audit http://localhost:5173 --interact .a11y/states.mjs --json --out .a11y/run-2.json
   A11Y diff --before .a11y/run-1.json --after .a11y/run-2.json
   ```

   `diff` matches by fingerprint and reports FIXED / NEW / REMAINING. NEW means
   your fix broke something else. If the same finding alternates between FIXED
   and NEW across iterations you are oscillating — stop, read both findings
   together, and change the approach instead of the value.
6. **Repeat from 2 until `violations` is empty and `diff` reports no NEW.**
   Then read the `manualChecklist` and carry it into your report (§3).

**Never declare UI work finished without a clean audit of the states you
built.** If the CLI cannot run — no Chromium, no dev server, a sandbox with no
browser — say so plainly, state that the change is unverified, and give the
exact command the user should run. Do not substitute your own reading of the
code for the audit.

For a fragment with no app around it, pass the markup inline with `--html`, or
write it to a scratch file and use `--file` (safer on any shell, and required
when the fragment contains quotes):

```
A11Y audit --html "<button class='icon'><svg/></button>" --json --out .a11y/frag.json
A11Y audit --file .a11y/scratch/price-card.html --json --out .a11y/card.json
```

`--headed` when you need to watch a state fail. `--no-best-practice` when
best-practice noise is drowning the real violations; the WCAG-mapped findings
are unaffected.

---

## §3 Honesty rules

The claims below are the ones that produced a $1,000,000 FTC penalty against an
accessibility overlay vendor in 2025 and that 800+ signatories of the
[Overlay Fact Sheet](https://overlayfactsheet.com/) exist to refute. They are
also simply not what an automated pass shows.

**Never say, about anything this loop produced:** "accessible", "fully
accessible", "WCAG compliant", "meets WCAG 2.2 AA", "passes WCAG",
"guarantees", "ensures", "certified", "100% accessible", "makes your app
accessible", "no manual testing needed", "reduces legal risk", "ADA
compliant". Never present a score or grade as a verdict.

**Say instead:** "`a11y-loop audit` found no automatically detectable failures
in the states I drove (default, dark, forced-colors, reduced-motion, 320px
reflow; states: settings-dialog-open, signup-form-error). Here is what still
needs human review."

**Always report the coverage limit with its denominator.** Automated testing
reaches a minority of WCAG failures, and the honest figures disagree because
they measure different things: Deque puts automation at **57% of issues by
volume of individual instances** across 13,000+ pages; Adrian Roselli counts
**17 of the 55** WCAG 2.2 A/AA criteria as having any ACT-approved automated
rule (31%), and not fully covered even there; accessible.org counts **7 of 55**
as reliably flagged (13%). Nine A/AA criteria cannot be meaningfully tested by
any tool. Cite one figure with its denominator, not a bare percentage.

**Always surface the `manualChecklist`.** It is a deliverable, not a
disclaimer — it names the criteria automation could not judge for the
components you actually built. Include it in your summary to the user, not just
in the JSON.

**`needsReview` findings are unresolved uncertainty, never passes.** Report
them as open questions with what you did about each.

**Mark every alt text and accessible name you wrote as DRAFT needing human
confirmation.** You cannot see the image, and hallucinated image descriptions
are a documented failure mode of generated code. `alt="decorative image"`
passes every automated check and is worse than `alt=""`. Write the draft, label
it, and ask for confirmation:

> `alt="Two people reviewing a document at a desk"` — **DRAFT**, written from
> filename and surrounding copy; please confirm it describes the actual image,
> or set `alt=""` if it is decorative.

**Recommend real assistive-technology testing before production**, and say
which is cheapest to start with: NVDA (free, Windows), VoiceOver (built into
macOS/iOS). Automated checks and your own reading cannot tell you whether the
interface is usable — only people using it can, and testing with disabled
users is what actually closes that gap. See
[references/manual-testing.md](references/manual-testing.md) for the full
not-automatable list and a keyboard script a non-expert can run in five
minutes.

**Attribute the engine.** Findings come from axe-core (MPL-2.0, Deque Systems)
and the WCAG success criteria are W3C's. Cite findings as
`SC 4.1.2 Name, Role, Value (Level A) · ACT 97a4e1 · axe: button-name` — the
success criterion is the obligation; ACT rule IDs are informative secondary
identifiers, not the source of the requirement.

---

## References

Read on demand; none of it costs context until you open it.

| File | Use it when |
|---|---|
| [references/plan-phase.md](references/plan-phase.md) | You are planning, scoping, or estimating UI work: picking a conformance target, writing per-component acceptance criteria, reviewing a decision that might foreclose accessibility, planning color tokens or page structure, or choosing a component library |
| [references/wcag22-quick-ref.md](references/wcag22-quick-ref.md) | You need the exact SC number, level, contrast threshold, or what is new in WCAG 2.2 |
| [references/apg-patterns.md](references/apg-patterns.md) | You are building a dialog, tabs, accordion, menu, combobox, disclosure, radio group, switch, tooltip, or listbox |
| [references/ai-failure-modes.md](references/ai-failure-modes.md) | Before saving generated UI code, and when a finding needs a wrong-vs-right example |
| [references/manual-testing.md](references/manual-testing.md) | You are writing the §3 hand-off, or a user asks what the audit did not check |
