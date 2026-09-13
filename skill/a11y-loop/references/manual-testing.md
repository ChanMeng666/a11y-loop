# What automation cannot check, and how to hand off

A clean audit means "no automatically detectable failures in the states that
were driven". It is the starting point for human review, not a substitute for
it. This file is the material for that hand-off.

---

## Coverage, with denominators

The honest figures disagree because they count different things. Always quote a
figure **with its denominator**; a bare percentage is how coverage gets
overstated.

| Figure | What it actually measures | Source |
|---|---|---|
| **57%** | Volume of individual issue *instances* that automated testing found, across 2,000+ audits / 13,000+ pages / ~300,000 issues | Deque study, quoted in axe-core's README |
| **31%** (17 of 55) | WCAG 2.2 A/AA success criteria that have *any* ACT-approved automated rule — and, in his words, "it's not full coverage of that 31%" | Adrian Roselli, March 2026 |
| **13%** (7 of 55) | WCAG 2.2 A/AA criteria that automation flags *reliably*; 45% partially detectable, 42% not detectable | accessible.org |

The seven criteria accessible.org counts as reliably automatable: 1.3.5 Identify
Input Purpose, 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast, 2.4.1 Bypass
Blocks, 2.4.2 Page Titled, 2.5.8 Target Size (Minimum), 3.1.1 Language of Page.

Karl Groves' breakdown of the rest: **9 Level A/AA criteria cannot be
meaningfully tested by any tool**, and **13 more** can be tested automatically
but need a human to confirm the result.

Engine scope, for the provenance section of a report: axe-core ships 105 rules,
of which **89 run by default** (60 WCAG 2.0 A/AA + 2 WCAG 2.1 A/AA + 27
best-practice). WCAG 2.2 coverage is a single rule, `target-size`, and it is
disabled by default upstream. **58 of the 105 rules can return an
`incomplete` result** — a place the engine knows it could not decide.
`a11y-loop` surfaces those as `needsReview` rather than folding them into
passes.

---

## Requires human judgment — the full list

Automation can tell you an attribute exists. It cannot tell you whether the
content is any good.

**Text alternatives and names**
- Whether `alt` text conveys what the image conveys. `alt="decorative image"`,
  `alt="image"`, and `alt="hero-2.jpg"` all pass every automated check and are
  worse than `alt=""`.
- Whether an accessible name is *useful*, not merely present.
- Whether a decorative image was correctly judged decorative.
- Whether link text makes sense out of context, as a screen reader user hears it
  in a list of links ("read more", "here", "learn more").
- Whether the visible label and the accessible name say the same thing in a way
  a voice-control user would guess (SC 2.5.3 checks containment, not sense).

**Structure and order**
- Whether the heading outline reflects the actual information hierarchy.
- Whether tab order is *logical* — a tool can only report that it diverges from
  DOM order, not which order is right.
- Whether landmarks segment the page usefully.
- Whether reflow at 320px preserves meaning, or merely avoids a scrollbar.
- Whether a table's header associations describe the real data relationships.

**Forms and errors**
- Whether an error message tells the user how to fix the problem (SC 3.3.3).
- Whether required formats are explained before submission, not after.
- Whether a multi-step process re-asks for information already given (SC 3.3.7).
- Whether an authentication alternative is genuinely usable (SC 3.3.8).

**Visual and motion judgment**
- Whether a focus indicator is *visually* adequate: occluded by a sticky header
  (SC 2.4.11), lost against a busy background image, or 1px on a dense table.
- Whether reduced motion still communicates state change.
- Whether contrast holds over gradients, images, video, and translucent
  overlays — exactly the cases the engine returns as `incomplete`.

**Media**
- Caption accuracy, speaker identification, and timing.
- Audio description completeness.
- Transcript quality.

**Consistency and cognition**
- Consistent navigation and identification across pages (SC 3.2.3, 3.2.4) —
  needs a multi-page view no single-page scan has.
- Consistent placement of help (SC 3.2.6).
- Reading level, plain language, and cognitive load (COGA). Barely covered by
  any automated tool, and named as an open gap in the 2026 literature review.
- Whether ARIA is used *appropriately* rather than merely *validly*. A page can
  be free of ARIA syntax errors and still misrepresent itself completely.

**Real assistive technology behavior**
- NVDA, JAWS, VoiceOver, and TalkBack diverge from each other and from the
  specification. Nothing predicts their actual output except running them.

---

## Known engine limitations to state in a report

- `color-contrast` gives up — and returns `incomplete` — on background images,
  gradients, pseudo-element backgrounds, and foreground opacity or occlusion. A
  computed ratio of exactly 1:1 is usually the tell that it could not resolve
  the background.
- Hover and focus state contrast is never checked unless the state is driven and
  the page re-scanned.
- `target-size` has a documented false-positive history with overlapping and
  translucent targets (axe-core issues #4805, #4350, #4295), which is why it is
  reported as needs-review.
- Cross-origin iframes may go untested — look for the `frame-tested` result.
- Anything requiring interaction, timing, or state across multiple pages is out
  of scope for a load-time scan. This is what `--interact` states exist for, and
  it only covers the states someone thought to write.
- axe-core returns zero false positives by design intent ("bugs
  notwithstanding"), which means it stays silent wherever it is unsure. Silence
  is not a pass.

### Rows with a known non-defect explanation

Four of these have been seen on a production app. Check a row against them
before changing code for it — fixing a false positive breaks working UI — and
then say in the report which rows you verified and how. Verifying a row is not
the same as suppressing it, and nothing here is a reason to disable a rule.

- **`color-contrast` in the forced-colors pass is usually not a defect.** axe
  reads an element's foreground from `-webkit-text-fill-color` before `color`.
  Chromium's forced-colors emulation forces `color` and the background but
  leaves `-webkit-text-fill-color` at the author's value, on every element,
  so the pass compares the author's foreground against the forced background.
  Dark-on-light text survives that; light-on-dark text reads near 1:1 and every
  line on a dark surface is reported. The tell is a finding whose foreground is
  a color you can find in your source and whose background is `#ffffff` or
  `#000000`. Confirm the pair in the default and dark passes, check forced
  colors by eye or with the OS setting, and report it as reviewed rather than
  measured. **Never apply the suggested color** — it is derived from the same
  mismatched pair and fails in the default pass.
- **A click handler on `<body>` or on a portal root is how popup libraries
  dismiss on an outside press**, and a keyboard-path check sees a clickable
  element with no role, no `tabindex` and no keyboard handling. The keyboard
  equivalent of "press outside" is Escape, wired separately. Check that Escape
  closes the popup; if it does, the row on the body is explained.
- **Contrast measured while something is animating is a measurement of one
  frame.** An element fading in is composited at partial opacity and flattened
  against what is behind it: at opacity 0.917, `#6d6975` was read as `#797580`.
  That is enough to move a value near 4.5:1 across the line and enough for two
  runs of the same page to disagree. If a finding names a color that is nowhere
  in your source, this is usually why. Let entrance animations finish before
  the state returns, or read the number from the reduced-motion pass if the
  page honors the preference.
- **A Tab walk has a budget** — 60 presses. Anything the walk did not reach
  inside it is reported unreachable because the budget ended, not because focus
  could not get there. A contiguous cluster at the end of document order is the
  signature; confirm it by hand with the keyboard test below, and audit
  narrower states so each walk fits.

---

## A five-minute keyboard test anyone can run

No tools, no training. Hand this to whoever owns the feature.

1. **Put the mouse away.** Click once in the page background, then use only the
   keyboard.
2. **Press `Tab` repeatedly through the whole page.** At every stop, ask: can I
   *see* where I am? If the focus indicator vanishes anywhere, that is SC 2.4.7.
3. **Watch the order.** Does focus move in the order things are laid out? Does
   it ever jump backwards, or into something invisible?
4. **Check for hidden stops.** If focus disappears for a press or two, it is
   probably landing on an `aria-hidden` or off-screen element.
5. **Check the sticky header.** Tab down the page — does the focused element ever
   slide under a sticky header, footer, or cookie bar? That is SC 2.4.11.
6. **Operate every control.** `Enter` on links and buttons, `Space` on buttons
   and checkboxes, arrow keys in tabs, menus, radio groups, and selects. Anything
   that only responds to a click is SC 2.1.1.
7. **Open a dialog.** Does focus move into it? Does `Tab` stay inside it? Does
   `Escape` close it? Does focus come back to the button that opened it? All four
   must be yes.
8. **Submit a form with mistakes.** Is the error announced or at least reachable?
   Does it tell you how to fix it? Does focus go somewhere useful?
9. **Zoom the browser to 400%** (`Ctrl`/`Cmd` and `+`). Any horizontal
   scrolling, overlapping, or clipped text is SC 1.4.10 / 1.4.4.
10. **Turn on OS dark mode and high contrast.** Does anything disappear?

Any "no" is a real defect regardless of what an automated report said.

---

## Assistive technology: where to start

- **NVDA** — free, open source, Windows. The most practical starting point, and
  roughly the most-used screen reader worldwide.
  [nvaccess.org](https://www.nvaccess.org/) · learn `Insert+Down` (read all),
  `H` (next heading), `Tab`, `F` (next form field), `D` (next landmark),
  `Insert+F7` (elements list — the fastest way to see how your page is really
  structured).
- **VoiceOver** — built into macOS and iOS, nothing to install. `Cmd+F5` to
  toggle; `Ctrl+Option+U` opens the rotor. Test iOS separately: mobile
  VoiceOver plus touch gestures behaves differently from macOS.
- **JAWS** — Windows, commercial, still dominant in enterprise and government.
  Worth testing if your users are in those settings; behavior differs from NVDA
  often enough to matter.
- **TalkBack** — Android, built in. The mobile counterpart to the above.
- **Windows High Contrast / forced colors** and **OS text scaling** — fast, no
  learning curve, and they surface hard-coded colors and fixed-height text boxes
  immediately.

Do not run one screen reader and generalise. They diverge from each other and
from the specification, which is why the APG says outright that testing with
real assistive technology is essential and that its own examples target spec
compliance rather than AT bug workarounds.

### Automating a screen-reader pass

A screen-reader pass can be scripted — [Guidepup](https://www.guidepup.dev/)
drives NVDA on Windows and VoiceOver on macOS — and it is worth doing, because
it turns "focus moves somewhere and something is announced" into a transcript
you can quote and re-run. Four conditions, each of which decides whether the
output is evidence or decoration:

- **Drive a portable copy of the screen reader, not the installed one**, so a
  run cannot inherit a person's own settings. Pin its language explicitly
  (NVDA: `general.language`, e.g. `en`) — it otherwise follows the OS locale,
  and a transcript in an unexpected language is unreadable as evidence.
- **Set the synthesizer to `silence`.** The spoken text is what you are
  capturing; the audio is not, and rendering it makes runs slow and
  machine-dependent.
- **A driver's relay log is focus speech, not everything spoken.** Guidepup's
  `spokenPhraseLog()` reports what it was handed as focus moved. Live-region
  announcements — `role="status"`, `role="alert"`, `aria-live` — do not
  reliably appear there, so their absence proves nothing. A claim that a live
  region spoke has to come from the screen reader's own debug log (NVDA:
  `nvda.log` at DEBUG level), where the announcement is recorded by the screen
  reader itself. Anything less is an assumption about the one mechanism most
  likely to silently not fire.
- **Copy the log out before stopping the screen reader.** `nvda.stop()` removes
  the temporary config directory the log lives in; read it afterwards and you
  will find nothing.

What this buys you is a regression you can detect and a transcript you can
quote. What it does not buy you is a judgment about whether the interface is
usable — that is still answered only by people who use a screen reader every
day. Report an automated pass as what it is: one screen reader, one version,
one set of states.

---

## Involving disabled users

The 2026 systematic literature review of LLMs for web accessibility found that
few studies involve users with disabilities at all. Automated checks and expert
review both answer "does this conform?"; only disabled users answer "is this
usable?", and those are different questions with different answers.

Practical, in rough order of cost:

- Ask your organisation whether any employees use assistive technology daily and
  would review a build.
- Contact a local disability organisation or a Disabled People's Organisation —
  many run paid user-testing panels.
- Pay for a session with a screen reader user before a launch, not after. One
  hour typically finds problems no scanner and no checklist surfaced.
- Provide a real accessibility feedback route in the product and route it to
  someone who can act.
- Record who tested, with which assistive technology, on which version. An
  honest, specific statement of who tested with what is more credible than any
  score — and almost nobody publishes one.

---

## Wording for the hand-off

Say this:

> `a11y-loop audit` found no automatically detectable failures across the five
> rendering passes (default, dark mode, forced colors, reduced motion, 320px
> reflow) in the states driven: *default, settings-dialog-open,
> signup-form-error*. Automated testing covers a minority of WCAG failures — on
> Deque's measure, 57% of issue instances by volume; by criterion count, 17 of
> the 55 WCAG 2.2 A/AA criteria have any automated rule at all. The following
> still need human review: *[the manualChecklist from the report]*. Two
> `needsReview` findings remain, both contrast over the hero gradient. Alt text
> for three images is DRAFT and needs your confirmation. Please run a keyboard
> pass and a screen reader pass before this ships.

Not this:

> The page is now fully accessible and WCAG 2.2 AA compliant.

That second sentence is the claim shape that drew a $1,000,000 FTC penalty
against an overlay vendor in 2025, and the 800+ signatories of the
[Overlay Fact Sheet](https://overlayfactsheet.com/) exist to refute it. It is
also just untrue: what was checked is what was checked.

## Related

- [plan-phase.md](plan-phase.md) — budgeting this work before the code exists
- [wcag22-quick-ref.md](wcag22-quick-ref.md) — the 55 criteria and contrast thresholds
- [apg-patterns.md](apg-patterns.md) — keyboard contracts to verify by hand
- [ai-failure-modes.md](ai-failure-modes.md) — what to look for in generated code
