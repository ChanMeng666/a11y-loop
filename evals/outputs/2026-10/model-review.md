# Model review of two converged skilled files (2026-10)

**This is a model's reading of source code, not a human review and not an
assistive-technology test.** One Claude Opus 5.5 subagent read
`skilled/run-1/newsletter-modal.html` and `skilled/run-1/header-nav.html`
against `skills/a11y-loop/references/manual-testing.md`, with no tools other
than file reads, and listed barriers it judged plausible that none of the three
engines would report. Both files had zero a11y-loop violations, zero Lighthouse
failed audits, and one IBM finding (the skip link outside a landmark). Nothing
below has been confirmed with a screen reader or by a person. Confidence labels
are the model's own.

## newsletter-modal.html

- **Possible.** The error paragraph is both `role="alert"` and the input's
  `aria-describedby`, and the script fills it and calls `email.focus()` in the
  same step. A screen reader may speak it twice or cut one off. Resubmitting the
  same wrong value does not change the text, so the alert may not fire again.
- **Possible.** On success, `dlg.close()` returns focus to the opener before the
  `role="status"` region is filled. The focus announcement may talk over the
  status message (SC 4.1.3).
- **Possible, minor.** The expected format appears only in the error text after
  a failed submit. Nothing marks the field as required (SC 3.3.2).
- **Speculative.** `aria-invalid` and the error text clear only on the next
  submit, not while the user corrects the value.
- **Speculative.** Initial focus lands on the close button. This is allowed by
  the dialog pattern, but focus on the field would save a keystroke.
- Judged fine: native `showModal()` trap and Escape, focus returns to the opener,
  dialog name and description wired, `autocomplete="email"`, 44px targets,
  offset focus outline, forced-colors border on the close button, 320px width,
  reduced motion.

## header-nav.html

- **Likely.** Below 760px only the `<ul>` is hidden; the `<nav aria-label="Main">`
  stays in the accessibility tree empty, so landmark navigation reaches an empty
  navigation region.
- **Possible.** Widening the viewport with the drawer open closes and inerts the
  drawer without moving focus, and the menu button is `display:none` at that
  width, so focus falls to `<body>` (SC 2.4.3). The audit's states never resize
  with the drawer open.
- **Possible.** Following a drawer link sends focus back to the menu button
  rather than to the target section. The targets do not exist in this page yet.
- **Possible.** In the drawer the current page is marked by colour and weight
  only (SC 1.4.1); the desktop nav also underlines it.
- **Speculative.** The same navigation is named "Main" on desktop and "Mobile"
  in the drawer (SC 3.2.4).
- **Speculative.** The search form has no submit control, which leaves
  voice-control and switch users relying on Enter.
- **Speculative.** A page-wide Escape handler moves focus to the search button
  even when focus is elsewhere.
- Judged fine: `inert` on the background while the drawer is open, closed drawer
  inert and hidden, `aria-expanded`/`aria-controls` in sync, Escape returns
  focus to the menu button, header not sticky (SC 2.4.11), visible search label.
  The model also called IBM's skip-link finding noise; that is its opinion, and
  the finding is reported as-is in the benchmark tables.
