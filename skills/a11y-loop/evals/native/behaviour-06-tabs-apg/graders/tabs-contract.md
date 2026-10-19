---
type: llm
---

PASS only if the tabs follow the WAI-ARIA APG tabs pattern: role tablist, tab and tabpanel with aria-selected, aria-controls and aria-labelledby wired to matching ids; roving tabindex (selected tab 0, others -1); ArrowLeft/ArrowRight plus Home and End move between tabs. FAIL if any of these is missing.
