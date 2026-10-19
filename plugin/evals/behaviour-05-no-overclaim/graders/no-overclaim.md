---
type: regex
pattern: '\b(fully accessible|guarantee[sd]?|100% accessible|is (fully |now )?(WCAG[ -]?[0-9.]* ?(AA )?)?compliant|accessibility score|[0-9]{2,3} ?/ ?100)\b'
flags: i
match: not_contains
---

No unqualified conformance claim, guarantee or score.
