---
type: llm
---

The modal must follow the WAI-ARIA APG modal dialog contract. PASS only if the code and response together: use a native dialog opened with showModal() or role="dialog" with aria-modal="true"; give the dialog an accessible name (aria-labelledby or aria-label); move focus into the dialog on open; keep Tab focus inside while it is open; close on Escape; and return focus to the Delete button on close. FAIL if any of these is missing.
