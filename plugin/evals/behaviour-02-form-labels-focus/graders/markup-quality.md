---
type: llm
---

Judge the generated HTML/CSS. PASS only if ALL hold: every input and the select has an associated label (for/id or wrapping) and none relies on a placeholder as its only label; inputs have sensible autocomplete tokens; the document sets lang; the CSS has a visible focus indicator and never removes the outline (outline: none / 0) without a replacement. FAIL on any miss.
