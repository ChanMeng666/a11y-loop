# Deciding accessibility before the code exists

§1 governs markup and §2 governs verification. Neither can reach a decision that
was made in a product spec. This file is the detail behind §0: the phase before
both, when the artifact is a plan, a roadmap, a ticket, a design review, or an
estimate.

**19 of the 55 WCAG 2.2 A/AA criteria are settled by product and design choices
rather than by markup.** The list, so you can check it against
[wcag22-quick-ref.md](wcag22-quick-ref.md) rather than take it on trust:

| | |
|---|---|
| **Layout and visual** | 1.3.4 Orientation · 1.4.3 Contrast · 1.4.5 Images of Text · 1.4.10 Reflow · 1.4.11 Non-text Contrast · 2.5.8 Target Size |
| **Interaction model** | 1.4.13 Content on Hover or Focus · 2.5.1 Pointer Gestures · 2.5.7 Dragging Movements |
| **Timing and motion** | 2.2.1 Timing Adjustable · 2.2.2 Pause, Stop, Hide |
| **Information architecture** | 2.4.1 Bypass Blocks · 2.4.5 Multiple Ways · 3.2.3 Consistent Navigation · 3.2.4 Consistent Identification · 3.2.6 Consistent Help |
| **Flows** | 3.3.4 Error Prevention · 3.3.7 Redundant Entry · 3.3.8 Accessible Authentication |

Five more — 1.2.1 through 1.2.5, captions, transcripts, audio description —
arrive the moment the product ships video or audio, and they are a content
budget, not a code task.

This grouping is a judgement made in this file, not a cited study. It is
checkable: read each criterion and ask whether a correct implementation of a
wrong decision would still fail it.

W3C's framing, from an archived WAI resource that has not been superseded:
building accessibility in from the beginning is "almost always significantly
easier, less expensive, and more effective than making accessibility
improvements to an existing site later as a separate project"
([Financial Factors](https://www.w3.org/WAI/business-case/archive/fin), W3C WAI,
archived).

---

## 1. The conformance target — versions and sources

**Default to WCAG 2.2 Level AA.** WCAG 2.2 is backward compatible, so hitting
2.2 AA satisfies every baseline below simultaneously. Targeting anything lower is
a choice to be non-conformant somewhere. Targeting AAA whole-site is a target
W3C itself says is not realistic — treat individual AAA criteria as opt-in
advisories.

| Jurisdiction / instrument | Version + level | Status |
|---|---|---|
| New Zealand Web Accessibility Standard 1.2 | **WCAG 2.2 AA** | In force 17 Mar 2025 — the strictest baseline |
| UK public sector | WCAG 2.2 AA | In force |
| EU — EN 301 549 v3.2.1 (EAA / WAD) | WCAG 2.1 AA | In force; moves to 2.2 AA with v4.1.1, expected in the OJEU ~Oct 2026 |
| US — ADA Title II (DOJ 2024 rule) | WCAG 2.1 AA | Deadlines 26 Apr 2027 (population ≥50,000) / 26 Apr 2028 |
| US — HHS Section 504 rule | WCAG 2.1 AA | First deadline 11 May 2026; **not** extended alongside DOJ's |
| US — Section 508 | WCAG 2.0 AA | Unchanged since the 2017/2018 ICT refresh |
| ISO/IEC 40500:2025 | WCAG 2.2 (Oct 2023 text) | Ratified 21 Oct 2025 |

**Two questions decide it. Ask once, record the answer.**

1. **Who is legally on the hook?** Public sector anywhere → that jurisdiction's
   number. Selling into the EU → the European Accessibility Act has applied since
   28 June 2025 and is extraterritorial: e-commerce, banking, e-books, transport
   and telephony are in scope wherever the company sits. Microenterprises
   (<10 staff, <€2m turnover) are exempt **as service providers only** — not as
   manufacturers of covered products.
2. **What does the audience need beyond the floor?** Adopt individual AAA criteria
   where they earn it — 2.4.13 Focus Appearance for a keyboard-heavy internal
   tool, 1.4.6 Contrast Enhanced (7:1) for use in sunlight or by an older cohort.
   Name them on their own line. Do not raise the whole level.

**Do not write** "the target is to be accessible", "fully compliant", or a
percentage. §3's honesty rules apply to plans as much as to reports: a target is
a target, not an outcome, and a plan that promises conformance is making the
claim shape that drew a $1,000,000 FTC penalty against an overlay vendor in 2025.

**WCAG 3 is not a target.** It is a Working Draft (3 March 2026) that forbids
citation as anything but work in progress and states its requirement set will
change. Practitioner estimates put a Recommendation at 2030 or later. A roadmap
line saying "prepare for WCAG 3" commits budget to a moving draft. Skip it.

---

## 2. Decisions that foreclose accessibility

§0 names these; here is what each one costs and what to offer instead. Raise the
row **in the plan**, with the criterion and the alternative in the same breath.
The decision belongs to the user; the disclosure belongs to you.

| Product decision | Criterion at risk | Why code cannot save it | Alternative, decided now |
|---|---|---|---|
| Drag-and-drop as the only way to reorder or move | 2.5.7 Dragging Movements (AA, new in 2.2) | The whole interaction *is* the gesture; the alternative is a second UI, not an attribute | Move up / move down buttons, or a "Move to…" menu, in the component spec |
| Infinite scroll as the only route to content | 2.4.1 Bypass Blocks (A), 2.1.1 Keyboard (A) | Content that exists only after N scroll events is unreachable for anyone who needs the footer | Pagination, a "load more" **button**, or a search/index route to the same items |
| Hover-only navigation or hover-revealed actions | 1.4.13 Content on Hover or Focus (AA), 2.1.1 (A) | A hover menu retrofitted with focus handlers usually still fails dismissible / hoverable / persistent | Click-to-open disclosure or menu button, with the APG contract from the start |
| Charts drawn to `<canvas>`/WebGL with no data behind them | 1.1.1 Non-text Content (A), 1.4.11 (AA) | Canvas has no accessibility tree; `alt` on a canvas does not substitute for the data | Ship the underlying table (visually hidden or in a disclosure), or SVG with real text |
| A CAPTCHA as the only gate | 3.3.8 Accessible Authentication (AA, new in 2.2), 1.1.1 (A) | Object-recognition CAPTCHAs are permitted only as *an* alternative, never as the sole path | A vendor with a non-cognitive path; never block paste or password managers |
| Hard session timeout on a form or checkout | 2.2.1 Timing Adjustable (A), 3.3.7 Redundant Entry (A) | A timeout is a backend contract; extending it later means touching auth | Warn and extend, or persist partial input, specified in the flow |
| Autoplaying carousel or moving hero | 2.2.2 Pause, Stop, Hide (A) | A pause control is a component redesign, not a CSS rule | Static hero, or a carousel with a real pause control in the spec |
| Audio that plays automatically for over 3s | 1.4.2 Audio Control (A) | Retrofitting a control means restructuring the player | Do not autoplay; or ship pause/stop and independent volume |
| Text baked into images (hero art, pricing graphics) | 1.4.5 Images of Text (AA), 1.4.4 Resize Text (AA) | Fixing means re-cutting every asset | Real text over the image; reserve images-of-text for logos |
| Fixed-width or absolutely-positioned layout | 1.4.10 Reflow (AA), 1.4.12 Text Spacing (AA) | Reflow at 320px is a layout system, retrofitted only by rewriting it | Flow layout with relative units, agreed in the design system |
| Dense icon toolbars or table-row action links | 2.5.8 Target Size (AA, new in 2.2) | 24×24 CSS px is a spacing decision the whole visual design rests on | Set the minimum hit area as a design token before the first component |
| A custom widget where a native element or APG pattern would serve | 4.1.2 (A), 2.1.1 (A), plus the pattern's own contract | "A role is a promise" — the contract is the work, and it is always underestimated | The native element, or the named APG pattern with its keyboard table |
| No dark palette, "we'll add it later" | 1.4.3 (AA), 1.4.11 (AA) | Dark-mode contrast failures are invisible to a light-only review and touch every token | Define both ramps now (§4); the audit's dark pass then verifies them for free |

**None of these is forbidden.** Infinite scroll with a working search route, or
drag-and-drop with a real keyboard alternative, can be fine. What is not fine is
discovering the requirement after the component ships.

---

## 3. Per-component criteria: resolving the words first

§0 asks each component to carry its success criteria and keyboard contract. That
is only possible once the component's *name* is resolved, and plan language is
where the wrong pattern gets chosen — the words are ambiguous, the contracts are
not. Ask in this order and record the answer:

1. **Is there a native element?** `<button>` `<a href>` `<select>` `<details>`
   `<dialog>` `<input type=radio|checkbox|range|date>` `<table>`. If yes, that is
   the answer — the browser supplies focus, keyboard, and state announcement, and
   they cannot drift out of sync with the visuals.
2. **Is there an APG pattern?** One of the 30 in
   [apg-patterns.md](apg-patterns.md). Name it in the plan and take its keyboard
   contract as a requirement, not a nice-to-have.
3. **Custom.** Last resort. The plan must say which role's contract it
   approximates, who writes the keyboard handling, and that it needs a manual
   keyboard and screen reader pass — no automated rule covers a pattern nobody
   has specified.

| Word in the plan | What it might mean | Cheapest correct reading |
|---|---|---|
| "dropdown" | `<select>`, menu button, combobox, disclosure, listbox — four different keyboard contracts | `<select>` unless custom option rendering is required |
| "modal" / "popup" | dialog, alertdialog, non-modal popover, tooltip | native `<dialog>` + `showModal()` |
| "toggle" | switch, checkbox, toggle button (`aria-pressed`) | switch for immediate effect; checkbox if a form submits it |
| "menu" | `role="menu"` (actions) or navigation (links) | a `<ul>` of links in a disclosure — `role="menu"` is for actions only |
| "stepper" | wizard, spinbutton, number input | `<input type="number">`, or a plain multi-step form |
| "date picker" | custom grid widget | `<input type="date">` first; it is the largest contract you can avoid |
| "tooltip" | a tooltip, or an accessible name that is missing | name the control with `aria-label`; a tooltip is never a name |
| "filter panel" | disclosure + `<fieldset>` groups, or a custom listbox | disclosure + native inputs, with a live region for result counts |

Write the resolved reading, not the word: `Sort control → native <select>`, not
`Sort control → dropdown`.

**Criteria blocks to paste into the plan line for each component.** An acceptance
criterion is falsifiable and names its criterion; "must be accessible" is neither,
which is why the ticket closes with nothing checked.

```
Any component:      2.1.1 keyboard · 2.4.7 focus visible · 1.4.3 + 1.4.11 contrast
                    (light and dark) · 2.5.8 target size · 1.4.10 reflow at 320px
Form:               1.3.1 + 3.3.2 labels · 1.3.5 autocomplete · 3.3.1 error
                    identification · 3.3.3 error suggestion · 3.3.7 redundant
                    entry · 3.3.8 paste and password managers work
Dialog / menu /     the full APG keyboard contract, keys enumerated · focus in on
tabs / combobox     open, contained, returned to the trigger on close · Escape
Data / chart /      1.3.1 <th> + scope · 1.1.1 data available as text · 1.4.1 no
table               meaning by color alone
Media:              1.2.2 captions · 1.2.1 transcript · 1.2.5 audio description ·
                    2.2.2 / 1.4.2 nothing autoplays without a control
Images and icons:   1.1.1 — alt text and accessible names confirmed by a human who
                    has seen the image
```

That last line is a **person, not a check**. Generated alt text ships as DRAFT
(§3) and is not a satisfied criterion until someone who can see the image says so.
It is the one item an agent cannot close on its own; the plan should name who does.

---

## 4. Color tokens, before the components exist

Low-contrast text is the most common failure in the wild — **83.9% of home
pages**, averaging **34 distinct instances** on each affected page. It is also the
only top-six failure fully decided by a list of hex values someone chooses once.

**Enumerate the pairs, not the colors.** Contrast is a property of a pair. A
palette of 12 tokens is not 12 decisions; it is however many
foreground-on-background combinations the design actually uses: body on surface,
body on raised surface, muted on surface, link on surface, button label on
primary, button label on primary-hover, border on surface, focus ring on surface,
focus ring on primary, error on surface, badge text on each badge fill. Then the
whole list again for dark.

**Resolve each pair with the CLI, not by eye.**

```
A11Y contrast "#7C9EC4" "#ffffff" --fix          # body text: needs 4.5:1
A11Y contrast "#7C9EC4" "#ffffff" --large --fix  # ≥24px, or ≥18.5px bold: 3:1
A11Y contrast "#7C9EC4" "#ffffff" --ui --fix     # borders, focus rings, icons: 3:1
```

`--fix` returns a lighter and a darker candidate reaching the threshold with hue
and chroma preserved in OKLCh, plus before/after ratios. Take a candidate rather
than guessing. Exit code is `0` if the pair passes AA and `1` if not, so a
plan-time sweep is scriptable. If `--fix` returns no candidate, that is not "try
harder" — lightness alone cannot fix that pair, and the hue or the pairing itself
has to change. Record it; that is a design decision, not an implementation detail.

**Optionally, prove the whole palette in one audit — still before any component.**
Write a throwaway proof sheet: one row per pair, real text at its real size on its
real background, plus a `prefers-color-scheme: dark` block with the dark ramp.

```
A11Y audit --file .a11y/palette-proof.html --json --out .a11y/palette.json
```

The default pass checks light, the **dark pass checks the dark ramp**, and the
**forced-colors pass** surfaces every token hard-coded where a system color
belongs — the most common reason a carefully built palette disappears in Windows
High Contrast. This is the earliest point in a project where `audit` returns a
real answer, and it costs one HTML file.

**Write ratios into the plan, not just hex.** A ratio is checkable by anyone
later; a hex alone is not.

```
- Color tokens: --text-body #1F2937 on --surface #FFFFFF — 15.29:1 light / 14.61:1 dark
                --link #2563EB on #FFFFFF — 5.17:1 light; dark #93C5FD — 7.42:1
                --border #D1D5DB on #FFFFFF — 1.47:1 FAIL (ui) → #6B7280, 4.83:1
```

**Two things a ratio does not settle.** Contrast over gradients, images, video and
translucent overlays is where the engine returns `needsReview` — decide at plan
time whether the hero gets a solid scrim, because "text over a photo" produces an
unresolvable finding every time. And never encode meaning in color alone (SC
1.4.1): if the plan says "red for over budget", it must say what the non-color cue
is.

**APCA does not belong in the plan.** Its critique of WCAG 2 is legitimate, but
the WCAG 3 contrast algorithm is explicitly "yet to be determined" as of the April
2026 editor's draft, and Lc values have no normative or legal standing. Never let
an APCA pass excuse a WCAG 2 failure in a design review.

---

## 5. Vetting a component library before adopting it

"Accessible components" on a landing page is a marketing claim, not a test result
— and it is frequently true *of the library* and false *of your build*. Every
headless library ships unstyled, so focus visibility (2.4.7), contrast (1.4.3,
1.4.11) and target size (2.5.8) are yours regardless. A library moves the
ARIA-and-keyboard half of the problem, not the visual half.

The stake is real: pages using ARIA average **59.1 errors versus 42.0 on pages
without it** (WebAIM Million 2026). A library that gets ARIA right is worth a
great deal; one that gets it confidently wrong is worse than no library.

**Seven checks, under an hour.**

1. **An accessibility conformance report or VPAT — dated, naming the version?**
   Absence is not disqualifying. Presence tells you someone was accountable for a
   specific release.
2. **Do the docs publish a keyboard contract per component?** Compare against
   [apg-patterns.md](apg-patterns.md). A library documenting arrow keys, Home/End
   and Escape per component has read the APG. One whose docs show only props has
   not.
3. **Search the issue tracker for `label:accessibility` — open *and* closed.** The
   signal is not the count, it is the response: triaged and fixed, or open for two
   years? Filed by maintainers, or only by users?
4. **Does it ship a focus-visible style, or leave it to you?** Headless libraries
   (Radix, Headless UI, and the shadcn/ui components built on Radix) deliberately
   leave it to you. That is a correct design choice and a task on your plan.
5. **Does it render real semantics?** Inspect one shipped example: is the button a
   `<button>`, is the dialog a `<dialog>` or at least `aria-modal` with the rest
   inert, is the tab list a real `role="tablist"` with roving tabindex?
6. **What happens in dark mode and forced-colors?** Most libraries have never been
   tested under `forced-colors: active`. Render the library's own example page and
   audit it — the forced-colors and dark passes tell you more than the README.
7. **What is yours regardless?** Enumerate it: contrast, focus indicator, target
   size, heading outline, landmark structure, alt text, live regions for your
   async states, error copy. No library supplies any of these.

```
- Library: <name> <version> — APG contracts documented: <yes/partial/no>
  Provided: <roles / keyboard / focus trap / …>
  Ours regardless: focus-visible styling, contrast tokens, target size, headings, alt text
  Verified: audited <lib>'s own example under the five passes on <date>
```

**Do not write, and do not repeat to the user,** that a library "is accessible",
"is WCAG compliant", or that using it makes the app conformant. What a good
library gives you is a better starting point and a smaller §2 loop — worth saying
plainly, and a different claim.

---

## 6. Structure decided once

Four artifacts that are cheap in a plan and expensive to retrofit, and that §1
then merely implements.

**Heading outline.** One `<h1>` per page or route; levels descend from the
information hierarchy, never from font size. Write the outline as an indented list
— that list *is* the SC 1.3.1 / 2.4.6 answer, and it settles the argument before
someone makes a plan name an `<h4>` because it looks right.

**Landmark map.** `header` / `nav` / `main` (exactly one) / `footer`, plus which
named regions exist and what names they carry. Decides SC 2.4.1, and it is the
difference between reaching content in one key press and tabbing through the nav
on every page.

**Focus order and keyboard map.** The intended tab order per screen, and any
element needing `tabindex="-1"` as a programmatic target. A tool can only report
that focus order diverges from DOM order — only a human can say which order is
*right*, so the plan is where "right" gets defined. Positive `tabindex` is never
the mechanism.

**SPA route-change focus.** Name the target (the new `<h1>`, or a `tabindex="-1"`
container) and who updates `document.title`. One line in a plan; a cross-cutting
refactor once the router is built and focus already falls to `<body>` on every
navigation.

**Skip link** to `<main>` on every full page. One line, and SC 2.4.1 is closed.

---

## 7. Planning the verification and the manual budget

**The `--interact` inventory.** Every state that does not exist at page load is
invisible to a load-time scan. List them at plan time — each modal, error state,
expanded menu, async result list, route. That list becomes `.a11y/states.mjs` and
the ticket's audit command. Written later, it is written from memory and comes out
short.

**Where the gates sit.** At minimum: per component before the ticket closes, and
`diff --before --after` on the branch before merge. `diff` exits `1` on a NEW
finding even when the total count fell, which is what makes it a gate rather than
a report.

**The manual budget, as a line item with a name against it.** A keyboard pass (the
five-minute script in [manual-testing.md](manual-testing.md)), a screen reader
pass (NVDA is free on Windows; VoiceOver is built into macOS and iOS), alt-text
confirmation, and — the one that changes outcomes rather than scores — a session
with a disabled user before launch rather than after.

**State the reach up front.** Of the 55 A/AA criteria, 17 have any ACT-approved
automated rule at all and 7 are flagged reliably; 9 cannot be meaningfully tested
by any tool. A plan that budgets only for the audit has budgeted for a minority of
the work. The honest denominators belong in the plan for the same reason they
belong in the report (§3) — and the plan is the only place where naming them can
still change what gets funded.

---

## 8. What this costs

Built in from the start, accessibility is "often a small percentage of the overall
website cost"; retrofitted, it is a separate project
([W3C WAI](https://www.w3.org/WAI/business-case/archive/fin), archived).

The mechanism persuades better than any percentage: the same six failure classes
have accounted for **96% of all detected errors for seven consecutive years**
while the per-page average *rose* to 56.1. Detection was never the bottleneck.
What changes the number is the decision, and the decision is made here.

**No cost multiplier appears in this file.** The "100× to fix after release"
figure has no primary source, and "67% of issues originate in design" is not
stated on the pages it is attributed to. A plan that justifies itself with a
fabricated number is easier to dismiss than one that does not.

---

## Related

- [wcag22-quick-ref.md](wcag22-quick-ref.md) — the 55 criteria the plan is choosing among
- [apg-patterns.md](apg-patterns.md) — the keyboard contracts a pattern choice commits to
- [ai-failure-modes.md](ai-failure-modes.md) — what the code will do wrong once building starts
- [manual-testing.md](manual-testing.md) — what to put in the manual budget
