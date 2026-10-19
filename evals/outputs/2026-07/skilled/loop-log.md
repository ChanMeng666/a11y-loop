# a11y-loop iteration log

Honest per-file record of what each audit found and what changed between
iterations. "Iterations" counts completed audit runs against that file
(a Playwright tool error before any audit completed is noted separately, not
counted as an iteration).

## signup-form.html

- **First audit:** 0 violations, 1 needsReview.
- The needsReview item: `color-contrast`, forced-colors pass, on the
  `Subscribe` submit button — axe measured a 1:1 ratio. Root cause: the button
  used the `background` shorthand (not `background-color`) with a custom
  property, which Chromium's forced-colors override does not reliably repaint.
  Fixed by switching to `background-color` plus an explicit
  `@media (forced-colors: active)` rule pinning the button to
  `ButtonFace`/`ButtonText`.
- **Second audit:** 0 violations, 0 needsReview. Clean.
- **Iterations:** 2. **needsReview left:** 0.

## pricing.html

- **First audit:** 0 violations, 1 needsReview.
- Same root cause as above, on the "Most popular" badge (`background` shorthand
  under forced-colors). Fixed the same way (`background-color` + forced-colors
  override).
- **Second audit:** 0 violations, 0 needsReview. Clean.
- **Iterations:** 2. **needsReview left:** 0.

## gallery.html

- **First audit:** 0 violations, 6 needsReview.
- All six were `target-size-min` (SC 2.5.8) on the "Read *name*'s full story"
  links — each rendered at 162–169 × 21.6 CSS px, under the 24×24 minimum, with
  no spacing exception saving it. A real, fixable defect: the link had no
  vertical padding. Fixed with `min-height: 24px; padding: 0.25rem 0;`.
- **Second audit:** 0 violations, 0 needsReview. Clean.
- **Iterations:** 2. **needsReview left:** 0.
- Note: also had to fix a self-inflicted markup bug before the first audit —
  the first draft of the inline-SVG data-URI avatars used double quotes inside
  the SVG markup inside a double-quoted `src` attribute, which truncated the
  attribute early. Rewrote the SVG with single quotes and percent-encoded it
  properly before ever running the audit, so it does not appear in the audit
  counts above.

## header-nav.html

- **Before any completed audit:** a `--interact` run threw a Playwright
  timeout (tool error, exit code 2, not a violation) — my first states script
  tried to click the hamburger button unconditionally, but the hamburger is
  `display: none` at the 1280×720 viewport used for 4 of the 5 audit passes
  (it only renders at the 320px reflow pass, by design — a standard
  responsive breakpoint). Fixed by making both interact states check
  `isVisible()` before clicking, so they are genuine no-ops on the passes
  where the control isn't rendered and a real interaction on the pass where
  it is.
- **First completed audit:** 0 violations, 0 needsReview. Clean on the first
  real run.
- **Iterations:** 1 (plus the pre-audit script fix above). **needsReview
  left:** 0.

## newsletter-modal.html

- **First audit:** 1 violation, 2 needsReview.
- Violation: `dialog-focus-not-returned` (SC 2.4.3), flagged during the
  `subscribe-dialog-error` state. Investigation: that state performs two
  clicks (open the dialog, then submit the invalid form inside it); the
  audit's trigger-detection heuristic presumes the *last* clicked element is
  what opened the dialog, so it expected focus to return to the submit button
  rather than the real opener. The dialog's own `close` handler already
  returns focus to `#open-subscribe` correctly — this was the heuristic being
  misled by a multi-step interact state, not a real defect. Fixed by adding
  `aria-haspopup="dialog"` and `aria-controls="subscribe-dialog"` to the
  opener button, which the tool prefers over the presumed-trigger guess when
  present, and is also a legitimate semantic improvement in its own right.
  - needsReview #1: `color-contrast` 1:1 on the Subscribe button under
    forced-colors — same shorthand-`background` root cause as the two files
    above; fixed with `background-color` + a forced-colors override.
- **Second audit:** 0 violations, 2 needsReview remaining.
  - needsReview #1: `aria-controls` on the opener "could not determine if the
    referenced ID exists" — axe's own uncertainty, because the referenced
    `<dialog>` is removed from the accessibility tree while closed (a native
    `<dialog>` without `open` isn't there to check). The ID is real and
    correct; confirmed by reading the markup. Left as-is: removing the
    attribute to silence the tool would delete correct, useful semantics.
  - needsReview #2: `color-contrast` on the inline validation-error message,
    flagged only in the `subscribe-dialog-error` state — axe reports it
    couldn't determine the background because of element overlap during the
    dialog's open/backdrop transition. Verified manually with
    `a11y-loop contrast`: `#b3261e` on `#ffffff` (light) is 6.53:1, `#ff8a80`
    on `#1f1f2e` (dark) is 7.11:1 — both comfortably pass the 4.5:1 AA
    threshold. Left as an open, reasoned needsReview rather than a silent
    pass, per the loop's honesty rule.
- **Iterations:** 2. **needsReview left:** 2, both investigated and explained
  above rather than dismissed.

## dashboard.html

- **First audit:** 0 violations, 0 needsReview. Clean on the first run.
- **Iterations:** 1. **needsReview left:** 0.

---

Every file above was also read against
`skill/a11y-loop/references/ai-failure-modes.md` before its first audit
(clickable divs, icon-button names, placeholder-as-label, heading order,
`outline: none`, dangling ARIA refs, `aria-hidden` on focusable elements, role
contracts, `lang`, reduced motion, focus loss, live regions, positive
`tabindex`, invented alt text) — none of those failure modes were introduced.
