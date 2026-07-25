# Seeded violations — `demo/before/`

The "Aotearoa Web Summit 2026" page is a fictional event invented for this demo. It is
not modelled on, and does not imitate, any real conference or organisation.

The page is deliberately broken. It is written the way an AI coding agent actually writes
marketing pages: plausible markup, tidy CSS, sensible class names — and every one of the
[WebAIM Million 2026](https://webaim.org/projects/million/) top-six failure classes plus
the failure modes documented for LLM-generated UI (clickable divs, hidden focus
indicators, skipped heading levels, broken ARIA references, ignored `prefers-reduced-motion`).

**16 violation classes, ~85 individual findings.** Every row below was checked against the
markup in `index.html` / `style.css` / `app.js`.

Two things this file is careful about:

- **Detector attribution.** Where a failure is detectable by axe-core 4.12 the axe rule ID
  is named. Where it is *not* — clickable divs, invisible focus, dialog focus management,
  reflow, reduced-motion — the a11y-loop check name is named instead. Roughly a third of the
  seeded classes here are invisible to a static axe-on-load scan, which is the point of the
  demo.
- **Conservative expectations.** Rows marked *advisory* are real defects that no automated
  rule reliably reports. They are documented so a human reviewer sees them; they are not
  asserted by the integration tests.

---

## Summary table

| # | Class | SC | Detector | Instances |
|---|---|---|---|---|
| B1 | Low-contrast text | 1.4.3 (AA) | axe `color-contrast` | 30+ pairs, light + dark |
| B2 | Images missing `alt` | 1.1.1 (A) | axe `image-alt` | 6 |
| B3 | Form controls with no label | 1.3.1 / 3.3.2 / 4.1.2 | axe `label`, `select-name` | 8 |
| B4 | Empty (icon-only) links | 2.4.4 / 4.1.2 (A) | axe `link-name` | 2 |
| B5 | Empty (icon-only) button | 4.1.2 (A) | axe `button-name` | 1 |
| B6 | Missing `<html lang>` | 3.1.1 (A) | axe `html-has-lang` | 1 |
| B7 | Clickable `<div>` as button | 2.1.1 / 4.1.2 (A) | a11y-loop `div-button` | 10 |
| B8 | Skipped heading levels | 1.3.1 (A) | axe `heading-order` (best-practice tag) | 3 |
| B9 | `outline: none`, no replacement | 2.4.7 (AA) | a11y-loop `focus-visibility` | 1 rule, all focusables |
| B10 | Broken / invalid ARIA | 1.3.1 / 4.1.2 (A) | axe `aria-*` (5 rules) | 6 |
| B11 | Modal with no focus management | 2.1.1 / 2.4.3 (A) | a11y-loop `dialog-focus-trap` | 1 dialog, 5 defects |
| B12 | Targets under 24×24 CSS px | 2.5.8 (AA, 2.2-only) | a11y-loop `target-size`, axe `target-size` (off by default) | 6 |
| B13 | Fixed-width layout, no reflow | 1.4.10 (AA) | a11y-loop `reflow-overflow` | 2 |
| B14 | Infinite animation, motion pref ignored | 2.2.2 (A) | a11y-loop `reduced-motion` | 1 |
| B15 | Ambiguous link text | 2.4.4 (A) | a11y-loop `ambiguous-link` | 5 |
| B16 | Positive `tabindex` | 2.4.3 (A) | axe `tabindex`, a11y-loop `tab-order` | 3 |

---

## B1 — Low-contrast text · SC 1.4.3 Contrast (Minimum), Level AA · axe `color-contrast`

The highest-volume class in the wild (83.9% of home pages, averaging 34 instances each) and
the highest-volume class here. All ratios below are computed with the WCAG 2.x relative
luminance formula, truncated to two decimals the way the WebAIM Contrast Checker reports them.

### Light mode

| Where (selector) | Foreground / background | Ratio | Threshold |
|---|---|---|---|
| `body`, `.section-lead`, `.schedule td` | `#999999` on `#ffffff` | **2.84:1** | 4.5:1 |
| `.logo-word`, `.nav-list a` | `#8fa0ab` on `#ffffff` | **2.69:1** | 4.5:1 |
| `.hero h1` (44px, large text) † | `#ffffff` on `#7ed0c4`→`#a9e4da` | **1.79:1 → 1.41:1** | 3:1 |
| `.hero-sub`, `.kicker`, `.hero-note` † | `#ffffff` on the same gradient | **1.79:1 → 1.41:1** | 4.5:1 |
| `.btn-primary` | `#ffffff` on `#5fbfb2` | **2.19:1** | 4.5:1 |
| `.btn-ghost` † | `#ffffff` on 28% white over the gradient (`#a2ddd4`) | **1.51:1** | 4.5:1 |
| `.day-title` | `#a3aeb5` on `#ffffff` | **2.26:1** | 4.5:1 |
| `.schedule th` | `#adb7bd` on `#ffffff` | **2.04:1** | 4.5:1 |
| `.speaker-role`, `.fineprint`, `.footer-fine`, `.modal-fine`, `.check-text`, `.ticker-track span` | `#b0b0b0` on `#ffffff` | **2.16:1** | 4.5:1 |
| `.footer-line` | `#a8b2b8` on `#ffffff` | **2.15:1** | 4.5:1 |
| `a` (all body links) | `#7ed0c4` on `#ffffff` | **1.79:1** | 4.5:1 |
| `.field` text | `#6d7a82` on `#ffffff` | **4.41:1** | 4.5:1 — *narrow miss, deliberate* |
| `.modal-close` glyph | `#c3cbd0` on `#ffffff` | **1.64:1** | 4.5:1 |

### Dark mode (`@media (prefers-color-scheme: dark)`)

The page *does* adapt to the OS colour preference — with a palette that fails at every level.
This is why a11y-loop runs a dark-mode pass: a page can be AA-clean in light mode and fail
completely in dark mode, and nobody notices because nobody re-audits after the theme switch.

| Where | Foreground / background | Ratio | Threshold |
|---|---|---|---|
| `body`, `.schedule td` | `#5a5a5a` on `#1a1a1a` | **2.52:1** | 4.5:1 |
| `.section-title`, `.sponsors-title`, `.pseudo-heading`, `.speaker-name`, `.modal-title` | `#585858` on `#1a1a1a` | **2.44:1** | 3:1 (large) / 4.5:1 |
| `.fineprint`, `.footer-fine`, `.speaker-role` | `#444444` on `#1a1a1a` | **1.78:1** | 4.5:1 |
| `.schedule th`, `.day-title`, `.footer-line` | `#4e4e4e` on `#1a1a1a` | **2.09:1** | 4.5:1 |
| `a` (13px, normal weight) | `#3f7a72` on `#1a1a1a` | **3.51:1** | 4.5:1 |
| `.field` text | `#6a6a6a` on `#1a1a1a` | **3.21:1** | 4.5:1 |

### † The hero rows land in axe's `incomplete` bucket, not in `violations`

Verified against the installed axe-core 4.12.1 source rather than assumed.
`elementHasImage()` treats any `background-image` — including `linear-gradient()` — as
undeterminable, sets the incomplete reason to `bgGradient`, and `getBackgroundColor()` returns
`null`. The `color-contrast` check then returns `undefined`, which axe reports as
**incomplete (needs review)**, not as a violation. Every element whose background stack reaches
`.hero` is affected: `.hero h1`, `.hero-sub`, `.kicker`, `.hero-note`, `.btn-ghost`.

This is a correct result, not an axe bug — a gradient genuinely has no single background colour,
and guessing one would produce false verdicts in both directions. It is also the clearest
possible argument for the project's rule that axe's `incomplete` results must be surfaced rather
than suppressed: **the most visually obvious contrast failure on this page is the one axe declines
to fail.** A tool that reports only `violations` shows a clean hero.

a11y-loop's own contrast pass reads the declared gradient stops and evaluates the text against
each one, which is how the 1.79:1 and 1.41:1 figures above were produced.

**Integration tests must expect the hero rows under `needsReview`, not `violations`.** There are
more than twenty solid-background contrast violations elsewhere on the page, so the `color-contrast`
violation assertion has plenty to bind to without them.

### Advisory rows in this class

- `.field::placeholder` is `#c9ced2` on `#ffffff` = **1.58:1**. Placeholder colour is genuinely
  part of SC 1.4.3 but axe does not evaluate `::placeholder`; a11y-loop reports it from
  computed styles. Because placeholder text is also the *only* label here (see B3), this
  compounds into an unreadable-and-unlabelled form.
- `.icon-btn svg` is `#b7c1c7` on `#ffffff` = **1.83:1**. Icons that carry meaning are
  graphical objects under **SC 1.4.11 Non-text Contrast (AA)**, threshold 3:1. No general
  automated rule covers arbitrary SVG fills — *advisory*.
- `.ticker` carries `aria-hidden="true"`. axe's `color-contrast` rule skips content hidden
  from assistive technology, so its 2.16:1 text may not be reported by axe even though it is
  visible to sighted users. a11y-loop's contrast pass works from computed styles and reports
  it. **The integration tests must not depend on this instance.**

---

## B2 — Images missing text alternatives · SC 1.1.1 Non-text Content, Level A

**axe `image-alt` · ACT `23a2a8`**

Six speaker photos, all `<img class="speaker-photo">` with `src`, `width`, `height` — and no
`alt` attribute at all. The images are inline SVG data URIs (grey placeholder avatars), so the
demo needs no binary assets, but to a screen reader they are six unlabelled images announced by
their filename-equivalent.

| Selector | Should convey |
|---|---|
| `.speaker-grid .speaker-card:nth-child(1) img` | Aroha Kingi |
| `.speaker-grid .speaker-card:nth-child(2) img` | Dev Ramanathan |
| `.speaker-grid .speaker-card:nth-child(3) img` | Marika Sørensen |
| `.speaker-grid .speaker-card:nth-child(4) img` | Tama Whitiora |
| `.speaker-grid .speaker-card:nth-child(5) img` | Joss Ngata |
| `.speaker-grid .speaker-card:nth-child(6) img` | Priya Sandhu |

Note for the fix: the speaker's name is already in adjacent text (`.speaker-name`), so the
correct fix is `alt=""` — decorative, because the name is not an image. Getting this right is
judgement, not mechanics, which is exactly why generated alt text must be marked as draft.

The header logo is an inline `<svg aria-hidden="true">` inside a link that also contains the
text "AWS26", so the logo link has an accessible name and is *not* seeded as a violation.

---

## B3 — Form controls with no programmatic label · SC 1.3.1 / 3.3.2 / 4.1.2

**axe `label` (inputs, textarea) · axe `select-name` (select)**

The registration form is placeholder-only — the single most common way generated forms fail.
A placeholder is not a label: it disappears on input, is not reliably exposed as a name, and
fails at 1.58:1 contrast here anyway.

| Selector | Placeholder standing in for a label | Rule |
|---|---|---|
| `.reg-form input[type=text]:nth-of-type(1)` | "Full name" | `label` |
| `.reg-form input[type=email]` | "Email address" | `label` |
| `.reg-form input[type=text]:nth-of-type(2)` | "Organisation (optional)" | `label` |
| `.reg-form select.field` | first `<option>` reads "Ticket type" | `select-name` |
| `.reg-form textarea.field` | "Dietary or access requirements" | `label` |
| `.reg-form input.check[type=checkbox]` | adjacent `<span class="check-text">`, not associated | `label` |
| `#registerModal input[type=email]` | "Email address" | `label` |
| `#registerModal input[type=text]` | "Discount code" | `label` |

The checkbox is the subtle one: the text *is* next to it in a `<span>`, so it looks labelled on
screen. There is no `<label>`, no `for`/`id` pair, and no `aria-labelledby`, so the association
exists only visually. The last two rows are inside the dialog and are therefore invisible to an
audit that only runs on page load.

There is also no `<fieldset>`/`<legend>`, no required-field marking, and no error handling at
all — *advisory*, no automated rule.

---

## B4 — Empty links · SC 2.4.4 Link Purpose (In Context) / 4.1.2, Level A

**axe `link-name` · ACT `c487ae`**

`.site-footer .social a.icon-btn` — bare `<a href="#">` wrapping an `<svg aria-hidden="true">`.
Two of the three have no accessible name whatsoever: no text node, no `aria-label`, no `title`.
A screen reader announces "link" and nothing else.

| Selector | Contents |
|---|---|
| `.social a.icon-btn:nth-of-type(1)` | diamond `<path>`, `aria-hidden` |
| `.social a.icon-btn:nth-of-type(2)` | `<circle>`, `aria-hidden` |

The third social link is a different defect — see B10d.

---

## B5 — Empty button · SC 4.1.2 Name, Role, Value, Level A

**axe `button-name` · ACT `97a4e1`**

`button.icon-btn.hamburger` — the mobile menu toggle. `<svg aria-hidden="true">` inside, nothing
else. Same icon-only root cause as B4. It also lacks `aria-expanded` and `aria-controls`, so even
once named it would not communicate state (*advisory*).

---

## B6 — Missing document language · SC 3.1.1 Language of Page, Level A

**axe `html-has-lang`**

`index.html` line 8: `<html>` with no `lang` attribute. Screen readers fall back to the user's
default voice, so English content may be read with a Te Reo or Danish pronunciation model — and
the page has Te Reo Māori proper nouns (`Te Papa`, `mihi whakatau`, `Rangimārie`) and a Danish
surname (`Sørensen`) that need `lang` on the *inline* spans to be pronounced correctly.

The inline-language gap is **SC 3.1.2 Language of Parts (AA)** and is *advisory* — no automated
rule detects unmarked language changes.

---

## B7 — Clickable `<div>` acting as a button · SC 2.1.1 Keyboard / 4.1.2, Level A

**a11y-loop `div-button` — invisible to axe**

The archetypal AI-codegen failure, and the reason a11y-loop runs its own keyboard checks.
A `<div>` with an `onclick` is not focusable, not in the tab order, has no role, does not respond
to Enter or Space, and is announced as plain text.

| Selector | Label it presents | Consequence |
|---|---|---|
| `.hero-actions .btn.btn-primary` | "Register now — $340" | primary conversion action, keyboard-unreachable |
| `.reg-form .btn.btn-primary` | "Continue to payment" | form submit, keyboard-unreachable |
| `#registerModal .btn.btn-primary` | "Pay $340" | payment action inside the dialog |
| `#registerModal .modal-close` | "×" | the only close control (see B11) |
| `.speaker-card` × 6 | whole card is clickable | no role, no name, no keyboard path |

None of these has `role`, `tabindex`, `onkeydown`, or `onkeyup`. `.btn` is even styled with
`cursor: pointer` and `user-select: none` so it looks and feels like a button to a mouse user —
the failure is completely invisible unless you put the mouse down.

---

## B8 — Skipped heading levels · SC 1.3.1 Info and Relationships, Level A

**axe `heading-order`**

The document outline is `h1 → h3 → h5 → h5 → h3 → h6 → h3`. Levels are picked for their visual
size, not for structure.

| Selector | Level | Preceding level | Why it fails |
|---|---|---|---|
| `#programme .section-title` | `h3` | `h1` | skips `h2` |
| `#programme .day-title` (× 2) | `h5` | `h3` | skips `h4` |
| `#sponsors .sponsors-title` | `h6` | `h3` | skips `h4` and `h5` |

Detector note: like `tabindex`, axe's `heading-order` rule carries only `cat.semantics` and
`best-practice` — no `wcag*` tag — so it lands in the separated non-blocking bucket rather than in
the WCAG-tagged violations. SC 1.3.1 is still the obligation; axe simply does not assert the
mapping. Verified against axe-core 4.12.1's rule metadata.

`.sponsors-title` is the "chosen for size, not structure" case in its purest form: it is an `h6`
— the *lowest* level in HTML — styled at `font-size: 26px; font-weight: 700`, identical to the
`h3` section titles. It looks like a top-level section heading and is announced as a
sixth-level one. `.pseudo-heading` in the Venue section is the mirror image: it *looks* like a
heading and is a `<div role="heading">` with no level at all (B10e).

---

## B9 — Focus indicator removed · SC 2.4.7 Focus Visible, Level AA

**a11y-loop `focus-visibility` — invisible to axe**

`style.css`, first rule after `:root`:

```css
*:focus {
  outline: none;
}
```

A universal selector, no replacement `box-shadow`, no `:focus-visible` variant, nothing. Every
focusable element on the page — nav links, the hamburger, the ghost CTA, all eight form controls,
both footer links, everything inside the dialog — becomes invisible to a keyboard user the moment
they tab to it. Combined with B7 (the primary actions not being focusable at all) and B16
(scrambled tab order), keyboard navigation of this page is effectively guesswork.

a11y-loop detects this by reading computed styles in the focused state and comparing the focused
and unfocused renderings, then checks the contrast of the ring itself where one exists.

---

## B10 — Broken and invalid ARIA · SC 1.3.1 / 4.1.2, Level A

WebAIM found pages using ARIA average **59.1 errors versus 42.0 on pages without it**, and
"broken ARIA references" is named in the 2026 systematic review as an emergent LLM-specific
failure mode. Six distinct breakages are seeded, each a different rule:

| # | Selector | Defect | axe rule |
|---|---|---|---|
| B10a | `nav.site-nav` | `aria-labelledby="primary-nav-heading"` — no element has that ID | `aria-valid-attr-value` |
| B10b | `section#register` | `aria-labelledby="register-heading"` — no element has that ID (the heading exists but is unidentified) | `aria-valid-attr-value` |
| B10c | `ul.nav-list` | `role="menu"` on a list of page links; children are plain `<li>` with no `role="menuitem"` | `aria-required-children` |
| B10d | `.social a.icon-btn:nth-of-type(3)` | `aria-hidden="true"` on a focusable link — breaks rule 4 of the four rules of ARIA use | `aria-hidden-focus` |
| B10e | `div[role="heading"].pseudo-heading` | `role="heading"` with no `aria-level` | `aria-required-attr` |
| B10f | `div#registerModal[role="dialog"]` | dialog with no accessible name — `.modal-title` is a `<span>`, not referenced | `aria-dialog-name` (best-practice tag) |

B10c is the "a role is a promise" case: `role="menu"` commits the author to the full APG
Menu keyboard contract — arrow-key navigation, `Home`/`End`, type-ahead, a single tab stop.
None of it is implemented. The ARIA makes this nav *worse* than no ARIA would have, because a
screen reader now tells the user to expect menu behaviour that does not exist.

B10a and B10b are the reference-integrity failures: both `aria-labelledby` attributes look
correct, follow a sensible naming convention, and point at IDs that were never written.

---

## B11 — Modal dialog with no focus management · SC 2.1.1 / 2.4.3, Level A

**a11y-loop `dialog-focus-trap` — the state-coverage showcase**

This is the centrepiece. **On page load the dialog is `display: none` and there is nothing to
find.** An axe-on-load scan of this page reports zero dialog findings. Every defect below only
exists once `openRegister()` has run — which is exactly the gap a11y-loop closes by driving the
states the agent just built.

`app.js` / `#registerModal`:

| Defect | Expected behaviour (APG Dialog (Modal) pattern) | SC |
|---|---|---|
| No focus moved into the dialog on open | focus goes to the dialog or its first focusable element | 2.4.3 |
| No focus trap — `Tab` walks straight out into the page behind | focus cycles within the dialog | 2.4.3 |
| `Escape` does nothing (no `keydown` listener anywhere) | `Escape` closes the dialog | 2.1.1 |
| Focus is not returned to the trigger on close | focus returns to the element that opened it | 2.4.3 |
| Background content is neither `inert` nor `aria-hidden` | the rest of the page is hidden from AT | 4.1.2 |
| Close control is `div.modal-close` with `onclick` and a `×` glyph | a `<button>` with an accessible name | 2.1.1 / 4.1.2 |
| `role="dialog"` with no `aria-modal` and no accessible name | `aria-modal="true"` + `aria-labelledby` | 4.1.2 |
| Opened from a clickable `<div>` (B7), so a keyboard user cannot open it at all | trigger is a `<button>` | 2.1.1 |

Also inside the dialog and only reachable in the open state: two unlabelled inputs (B3), a
clickable-div pay button (B7), an 18×18 close target (B12), an ambiguous "Read more" link (B15),
and — in dark mode — the dialog's own contrast failures (B1). **A single unexercised state hides
findings from five other classes.**

---

## B12 — Touch targets below 24×24 CSS px · SC 2.5.8 Target Size (Minimum), Level AA

**a11y-loop `target-size` · axe `target-size` (reported as needs-review)**

New in WCAG 2.2, and one of the criteria that makes a tool 2.2-current rather than 2.1-current.

Detector note: axe's `target-size` rule ships with `enabled: false` in axe-core 4.12.1 (tags
`wcag22aa`, `wcag258`), so a default `axe.run()` reports nothing here. It has to be turned on
explicitly, and its results are best treated as needs-review because the SC's spacing and
inline exceptions are hard to evaluate mechanically.

| Selector | Rendered size | Minimum |
|---|---|---|
| `button.hamburger` | 18 × 18 | 24 × 24 |
| `.social a.icon-btn` × 3 | 18 × 18 | 24 × 24 |
| `.modal-close` | 18 × 18 | 24 × 24 |
| `.reg-form input.check` | 13 × 13 | 24 × 24 |

`.icon-btn` sets `width: 18px; height: 18px; padding: 0` — no padding to grow the hit area, and
the social links sit 8px apart, so the spacing exception does not apply either.

---

## B13 — Fixed-width layout, no reflow · SC 1.4.10 Reflow, Level AA

**a11y-loop `reflow-overflow` — invisible to axe**

Two offenders, verified by measuring scroll width against viewport width at 320 × 256 (the
viewport WCAG specifies for the 400%-zoom reflow test):

| Selector | CSS | Effect at 320px |
|---|---|---|
| `.container` | `width: 1180px` | whole page requires ~1180px of horizontal scrolling |
| `.schedule` | `min-width: 880px` | tables scroll independently even inside a fluid parent |

The page carries `<meta name="viewport" content="width=device-width, initial-scale=1">`, which
makes this worse, not better: it promises the layout responds and then hard-codes a width.
There is not a single media query for width in the stylesheet — the only `@media` block is
`prefers-color-scheme`.

---

## B14 — Infinite animation ignoring motion preference · SC 2.2.2 Pause, Stop, Hide, Level A

**a11y-loop `reduced-motion` — invisible to axe**

```css
.ticker-track {
  animation: ticker-scroll 16s linear infinite;
}
```

The sponsor ticker scrolls forever. There is no pause control, no `prefers-reduced-motion: reduce`
block, and the animation runs for far longer than five seconds, so **SC 2.2.2 (Level A)** applies —
moving content that starts automatically and lasts more than five seconds must be pausable,
stoppable, or hideable. SC 2.3.3 Animation from Interactions (AAA) is the secondary citation.

a11y-loop verifies this behaviourally: it re-runs the page with `prefers-reduced-motion: reduce`
emulated and checks whether the animation *actually stops*, rather than trusting that a media
query exists.

---

## B15 — Ambiguous link text · SC 2.4.4 Link Purpose (In Context), Level A

**a11y-loop `ambiguous-link`**

Five links whose accessible name conveys nothing out of context. Screen reader users routinely
navigate by pulling up a list of a page's links; in that list this page offers "Click here",
"Read more", "Click here", "More info", "Read more".

| Selector | Text | Should say |
|---|---|---|
| `.hero-note a` | "Click here" | "group booking rates" |
| `#programme .section-lead a` | "Read more" | "full session descriptions" |
| `#speakers .section-lead:last-of-type a` | "More info" | "all 24 speakers" |
| `#venue .section-lead:last-of-type a` | "Click here" | "venue map and access information" |
| `#registerModal .modal-fine a` | "Read more" | "our payment and refund terms" |

Heuristic, and honestly so: the check flags a known phrase list plus links whose accessible name
is under three characters or duplicated with differing destinations. It cannot judge whether
"our 2026 programme" is descriptive enough — that stays on the manual checklist.

---

## B16 — Positive `tabindex` · SC 2.4.3 Focus Order, Level A

**axe `tabindex` · a11y-loop `tab-order`**

| Selector | Value |
|---|---|
| `.reg-form input[type=text]` (Full name) | `tabindex="1"` |
| `.reg-form input[type=email]` | `tabindex="2"` |
| `.hero-actions .btn-ghost` | `tabindex="3"` |

Any positive `tabindex` pulls those three elements to the *front* of the document's tab order,
ahead of the header and nav. The first Tab press from the top of the document lands in the
registration form near the bottom of the page, the second lands in the field next to it, the
third jumps back up to the hero, and only then does focus start at the top of the document.
Since B9 removed all focus indicators, none of this is visible.

a11y-loop's `tab-order` check walks the page with real Tab presses and diffs the observed
sequence against DOM order, so it reports the actual traversal, not just the presence of the
attribute.

Detector note: axe's `tabindex` rule carries only the `cat.keyboard` and `best-practice` tags —
no `wcag*` tag — so in a WCAG-tag-filtered run it does not appear at all, and in a11y-loop's
output it lands in the separated, non-blocking best-practice bucket. The SC 2.4.3 obligation is
real; the axe rule is simply not tagged against it. This is why the behavioural `tab-order` check
is the primary detector for this class and the axe rule is the secondary one.

---

## Incidental issues — documented, not asserted

Real pages have these too. They are listed for completeness so a reviewer reading
`VIOLATIONS.md` against an audit report is not surprised by extra findings, but the integration
tests do not depend on them.

| Issue | Detector | Note |
|---|---|---|
| No `<main>` landmark; sections sit in a bare `<div class="container">` | axe `landmark-one-main`, `region` (best-practice tag) | non-blocking in a11y-loop's output |
| No skip link to bypass the header | SC 2.4.1 — *advisory* | there is no repeated-block bypass at all |
| Body text at 13px, fine print at 10–11px | *advisory* | no SC sets a minimum size; contributes to 1.4.4 / 1.4.12 risk and mirrors the cramped, hard-to-read pages that motivate this project |
| `.overlay` dismisses on click only | SC 2.1.1 — folded into B11 | mouse-only affordance |
| Hamburger has no `aria-expanded` / `aria-controls` | SC 4.1.2 — *advisory* | state is not communicated even once B5 is fixed |
| No inline `lang` on Te Reo Māori and Danish text | SC 3.1.2 — *advisory* | not automatically detectable |
| No `<fieldset>`/`<legend>`, no required marking, no error messages | SC 3.3.1 / 3.3.2 — *advisory* | error-state coverage is future work |

---

## What a load-only scan misses

Of the 16 seeded classes, a single default `axe.run()` on page load reports **7 under the WCAG
tags**: B1 (partially), B2, B3, B4, B5, B6, and five of B10's six rules. B8 is reported too, but
only under `best-practice`.

The other eight need something more than one load:

| Class | What it takes |
|---|---|
| B7 clickable divs | probing elements for focusability and keyboard handlers |
| B9 invisible focus | reading computed styles in the *focused* state |
| B11 modal focus management | actually opening the dialog |
| B12 target size | measured geometry, and the axe rule turned on explicitly |
| B13 reflow | a second pass at a 320px viewport |
| B14 reduced motion | a pass with `prefers-reduced-motion: reduce` emulated |
| B15 ambiguous links | accessible-name heuristics, which no axe rule covers |
| B16 positive tabindex | reported by axe only under `best-practice`, no `wcag*` tag |

And three qualifications on the ones that *are* caught:

- **B1 is only partly caught.** Its dark-mode half — 6 more pairs — needs a second
  colour-scheme pass. Its most conspicuous instances, the white hero text at 1.41:1, come back
  as `incomplete` rather than as violations because of the gradient.
- **B8 and B10f are tagged `best-practice`** (`heading-order`, `aria-dialog-name`), so a
  WCAG-tag-scoped run filters them out even though SC 1.3.1 and SC 4.1.2 are the real obligations.
- **B3, B7, B12, B15 and B1 each hide further instances inside the closed dialog.** Even the
  classes axe does catch are undercounted until that state is exercised.

This is the demo's argument in one paragraph: the seeded page is not hard to scan, it is hard to
scan *once*, in one colour scheme, at one viewport, in one state.
