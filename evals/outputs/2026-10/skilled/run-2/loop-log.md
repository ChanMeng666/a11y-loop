# a11y-loop log (run-2)

- Start: 2026-10-20T01:13:04+13:00
- End: 2026-10-20T01:17:19+13:00
- Target: WCAG 2.2 AA. Every audit used the default/dark/forced-colors/reduced-motion/320px passes. No tool errors occurred before any audit completed.
- Colour tokens were chosen in advance for light and dark. I spot-checked two button pairs with `contrast`: #fff on #4338ca = 7.90:1 and #0f172a on #a5b4fc = 8.95:1.
- Alt text and accessible names I wrote are DRAFT and need human confirmation. This covers the gallery SVG labels ("DRAFT: placeholder portrait for <name>"), the icon-button names and the link names.

| File | 1st-audit violations | 1st-audit needsReview | Iterations | Final violations | Final needsReview |
|---|---|---|---|---|---|
| signup-form | 0 | 1 | 2 | 0 | 1 |
| pricing | 0 | 2 | 2 | 0 | 2 |
| gallery | 0 | 0 | 2 | 0 | 0 |
| header-nav | 0 | 2 | 2 | 0 | 0 |
| newsletter-modal | 1 | 3 | 3 | 0 | 1 |
| dashboard | 0 | 4 | 2 | 0 | 0 |

## signup-form (states: form-validation-errors)
- Audit 1: 0 violations, 1 needsReview (color-contrast, forced-colors pass, `.btn` submit button).
- Changes: none. Audit 2 was run only to produce a diff against audit 1, and the diff showed no violations in either report.
- Remaining needsReview: color-contrast in the forced-colors pass on the white-on-indigo button. This is the documented Chromium forced-colors `-webkit-text-fill-color` artifact (see manual-testing.md), where light-on-dark text reads as 1:1.
- Verification: the default and dark passes report no contrast findings. The #fff on #4338ca pair is 7.90:1 by `contrast`. I did not apply the suggested colour. This is "reviewed", not measured.

## pricing (no states)
- Audit 1: 0 violations, 2 needsReview (color-contrast, forced-colors pass, the "Most popular" badge and the Pro `.btn`).
- Changes: none (audit 2 repeated for the diff, no violations in either report).
- Remaining needsReview: both rows are the same forced-colors artifact as above. The default and dark passes are clean and the pair is 7.90:1.

## gallery (no states)
- Audit 1: 0 violations, 0 needsReview.
- Changes: none (audit 2 repeated for the diff, no violations in either report).
- Remaining needsReview: none.

## header-nav (states: search-open, mobile-drawer-open at 600px)
- Audit 1: 0 violations, 2 needsReview (color-contrast on the `h1` and a `p` in `mobile-drawer-open`; background undeterminable because the absolutely-positioned drawer overlapped them).
- Changes: the drawer is now in normal flow (`flex-wrap`, `order:10`, `flex-basis:100%`) so it pushes the content down instead of overlapping it.
- Audit 2: 0 violations, 0 needsReview. The diff showed no violations in either report.
- Remaining needsReview: none.

## newsletter-modal (states: dialog-open, dialog-validation-error)
- Audit 1: 1 violation (dialog-focus-not-returned, SC 2.4.3, in `dialog-validation-error`) and 3 needsReview rows. The rows were forced-colors color-contrast on the Subscribe button, plus label-content-name-mismatch (SC 2.5.3) on the close button, which appeared in two states with one fingerprint.
- Changes before audit 2:
  - Close button: replaced `aria-label="Close"` plus a lone "×" with a visible "× Close" label, so the visible text is in the accessible name.
  - Dialog heading padding was adjusted to make room for it.
- Audit 2: 1 violation (REMAINING dialog-focus-not-returned), 1 needsReview. The label-in-name row was gone. The diff showed 0 fixed, 1 remaining, none new.
- Investigation: the error state submitted the form with Enter. That fires a synthetic click on the dialog's own submit button, which the tool then took as "the control that opened it". I did not independently confirm that the page's Subscribe button regains focus on close. The native `<dialog>` and my `close` handler both do this, but the tool's report is the only evidence I have.
- Changes before audit 3:
  - Error state: the script now types an invalid address and presses Tab. Validation also runs on `change`, as well as on submit.
  - Neither the state-script change nor the added validation-on-change is a fix to the dialog's focus-return behaviour. The violation disappeared once the opener was unambiguous. Treat it as a tool-heuristic interaction, not a confirmed product bug. Testing focus return after a real submit failure and after Escape is on the manual checklist.
- Audit 3: 0 violations, 1 needsReview. The diff showed FIXED 1, none introduced.
- Remaining needsReview: forced-colors color-contrast on the page's Subscribe button, the same documented artifact (default and dark passes clean).

## dashboard (no states)
- Audit 1: 0 violations, 4 needsReview (color-contrast on the `aria-hidden` ▲/▼ glyph spans in the trend lines, all passes).
- Changes: replaced the text glyphs with inline `aria-hidden` SVG arrows. The trend text ("Up 12.4%…", "Down 3.1%…") already carries the meaning.
- Audit 2: 0 violations, 0 needsReview. The diff showed no violations in either report.
- Remaining needsReview: none.

## Not covered by automation
The final `manualChecklist` for each file is in `<name>.checklist.md`. Items there include screen-reader testing, keyboard task completion, focus order, link purpose, heading structure and non-colour meaning. Real NVDA or VoiceOver testing is recommended before production.
