# a11y-loop log — run-1 (skilled-clean)

- Start: 2026-10-20T01:13:03+13:00
- End: 2026-10-20T01:17:54+13:00
- Target: WCAG 2.2 AA. Palette fixed up front (light/dark tokens chosen for AA; link/primary, muted, error, ok, trend colours).
- Note: one early batch shell command failed with a bash parse error (exit 2) before any audit of header-nav/modal/dashboard ran; no audit completed, so not counted. Files were then written with the Write tool.
- Engine rows verified as known forced-colors artifacts (manual-testing.md): `color-contrast` in the forced-colors pass only, computed ratio exactly 1:1, on light-on-primary elements (Subscribe/Choose Pro buttons, "Most popular" badge) whose pair passes in default and dark passes (#fff on #4338ca; #12123a on #a5b4fc). Not changed; suggested colour not applied. Reviewed, not measured.

## signup-form.html (states: signup-form-error, signup-form-success)
- First audit: violations 0, needsReview 1 (color-contrast, forced-colors, 1:1 on Subscribe button).
- Changes: none needed. Iterations completed: 1. Final: violations 0, needsReview 1 (the forced-colors row above).

## pricing.html
- First audit: violations 0, needsReview 2 (color-contrast forced-colors: "Most popular" badge, Pro CTA).
- Changes: removed a stray duplicate `max-width` declaration (cosmetic). Re-audit (run2): 0 / 2, diff: no violations in either. Iterations: 2. Final 0 / 2 (same forced-colors rows).

## gallery.html
- First audit: 0 / 0. No changes. Iterations: 1. Final 0 / 0. Photo SVGs carry DRAFT aria-labels ("placeholder portrait for <name>") needing human confirmation.

## header-nav.html (states: search-open, drawer-open at 600px)
- First audit: violations 3 (dialog-initial-focus, dialog-focus-not-trapped, dialog-escape-does-not-close, all drawer-open), needsReview 1 (skip-link, drawer-open).
- Changes: skip link made inert while drawer is open (focus escaped to it); removed the visibility/transform transition on the drawer so open/closed state is immediate.
- Run2: 0 / 0, diff converged, nothing new. Iterations: 2. Final 0 / 0. (I did not isolate which of the two changes fixed which finding; the focus-trap finding is plausibly the skip link, the initial-focus/escape findings plausibly the transition.)

## newsletter-modal.html (states: dialog-open, dialog-validation-error)
- First audit: violations 1 (dialog-focus-not-returned, dialog-validation-error), needsReview 1 (forced-colors color-contrast on Subscribe).
- Diagnosis: page code already returns focus to the opener (native dialog + close handler). The checker attributed the opener to the "Sign up" button because my state module clicked it. Run2 tried Enter in the input, which still dispatches a synthetic click on the submit button, so the violation remained (1 / 1). Run3 drives the submit with form.requestSubmit() (no click). Result 0 / 1; diff vs run1: converged, no NEW. This is a change to the audit driver, not to the page; stated plainly.
- Iterations: 3. Final 0 / 1 (forced-colors row).

## dashboard.html
- First audit: 0 / 0. No changes. Iterations: 1. Final 0 / 0.

## Not covered
Per-file manual checklists are in <name>.checklist.md. Automation reaches a minority of WCAG failures (Deque: 57% of issues by instance volume; Roselli: 17 of 55 A/AA criteria have any ACT automated rule). Real AT testing (NVDA/VoiceOver) still needed; gallery SVG labels and any inferred names are DRAFT.
