# Loop log (skilled, run-1)

Start: 2026-10-20T00:32:51+13:00
End: 2026-10-20T00:47:34+13:00

Notes: one tool error before any audit (a bash heredoc syntax error wrote no files; not an audit). All audits used PLAYWRIGHT_BROWSERS_PATH=D:\playwright-browsers. Counts are from each report JSON. Reports are in reports/; final converged copy is reports/<name>.json.

## signup-form.html (states: signup-form-error, signup-form-success)
- Audit 1: violations 0, needsReview 1 (color-contrast, forced-colors pass, submit button: white text read as 1:1 against forced background; the documented forced-colors -webkit-text-fill-color false-positive tell).
- Change A: added a forced-colors rule setting -webkit-text-fill-color: currentColor. Audit 2: violations 0, needsReview 1 (no effect).
- Change B: replaced with system colours (CanvasText for body, ButtonText for buttons) inside @media (forced-colors:active). Audit 3: violations 0, needsReview 0.
- Completed audits: 3 (final report = audit 3, stored as signup-form.run2.json because the run2 file was overwritten by the re-run). Remaining needsReview: none.

## pricing.html
- Audit 1: violations 2, needsReview 7, all color-contrast in the forced-colors pass on the Pro card (light text on dark fill; fg #e0e3ff vs #ffffff), the documented false-positive tell.
- Change A: -webkit-text-fill-color: currentColor in forced-colors. Audit 2: violations 2, needsReview 7 (no effect).
- Change B: system colours (CanvasText inside the featured card, ButtonText on links) in forced-colors. Audit 3: violations 0, needsReview 0; diff run1 vs final: Converged, 2 fixed, none new.
- Completed audits: 3 (final report stored as pricing.run2.json; the run2 file was overwritten by the re-run). Remaining needsReview: none.

## gallery.html
- Audit 1: violations 0, needsReview 0. No changes. Completed audits: 1. Photos are inline SVG placeholders with aria-label text that is DRAFT and needs human confirmation.

## header-nav.html (states: search-open, drawer-open-mobile at 390px)
- Audit 1: violations 0, needsReview 1 (color-contrast, default pass, drawer-open-mobile, "Contact" link partially obscured). Investigation showed a real layout bug: my `nav ul{display:flex}` rule also hit the mobile drawer, laying links in a row and pushing "Contact" off-screen.
- Change: scoped the desktop nav styles to `.desktop-nav`.
- Audit 2: violations 0, needsReview 0. Completed audits: 2. Remaining needsReview: none.

## newsletter-modal.html (states: subscribe-dialog-open, subscribe-dialog-error)
- Audit 1: violations 1 (dialog-focus-not-returned, subscribe-dialog-error), needsReview 2 (color-contrast forced-colors on page Subscribe button; color-contrast default, dialog description, "partially overlaps").
- Change: forced-colors system-colour rule; error state now driven with Enter in the field.
- Audit 2: violations 1 (same; implicit form submit synthesises a click on the submit button, so the probe took it as the trigger), needsReview 1.
- Change: validation also runs on `change`; error state driven by fill + Tab (no click inside the dialog); close button moved into a heading row.
- Audit 3: violations 0, needsReview 2 (dialog description, both states). 
- Change: removed negative margins, restructured heading row. Audit 4: violations 0, needsReview 1 (dialog description, error state).
- Further layout attempts (heading spacing, shorter title, grid heading row). Audit 5: violations 0, needsReview 2. Reverted to the flex heading row. Audit 6: violations 0, needsReview 2. diff run4->run6: no violations, 1 new needsReview (not blocking). Completed audits: 6.
- Remaining needsReview (2, same element in both states): color-contrast on the dialog description paragraph, "background color could not be determined because it partially overlaps other elements". Reasoning: the paragraph sits on the dialog surface; measured pairs are #4a5068 on #ffffff = 7.95:1 and #b4b9d0 on #181c2e = 8.67:1 (a11y-loop contrast). Bounding-box and elementsFromPoint checks found no overlapping element; I could not isolate what triggers axe's heuristic and it varied with layout. Unresolved by the tool, resolved by reasoning only; needs a human look.

## dashboard.html
- Audit 1: violations 0, needsReview 0. No changes. Completed audits: 1. (Trend direction is conveyed by text and icon, not colour alone.)

