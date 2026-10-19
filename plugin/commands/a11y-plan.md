---
name: a11y-plan
description: Produce the plan-phase Accessibility section for a feature — conformance target, per-component criteria, decisions that foreclose accessibility, color tokens, structure, verification, manual budget.
argument-hint: "[feature description, or nothing to use the current plan]"
disable-model-invocation: true
allowed-tools: Read Glob Grep Bash(a11y-loop contrast *) Bash(npx a11y-loop contrast *)
---

Write the **Accessibility** section for this plan-phase work:

$ARGUMENTS

If that is empty, use the plan currently under discussion in this conversation. If there is no plan
either, ask what is being built before writing anything — a section written against a guess is worse
than no section.

## How

Load the `a11y-loop` skill and follow its plan rules (§0) and
`references/plan-phase.md`. Everything about which criteria apply, which product decisions foreclose
accessibility, and how to pick color tokens lives there. Do not restate WCAG from memory here; read
`references/wcag22-quick-ref.md` for exact SC numbers and thresholds, and
`references/apg-patterns.md` for the keyboard contract of any widget the plan names.

Where the plan names concrete colors, verify the pairs with `a11y-loop contrast --fix` in both light
and dark rather than asserting a ratio.

## Output

One section, in this shape, every line answered from what is actually being built — no placeholders
left in:

```markdown
### Accessibility
- **Target:** WCAG 2.2 Level AA — <rationale / jurisdiction>
- **Per-component criteria:** <component> → <SC list> + <keyboard contract source>
- **Foreclosing decisions:** <none reviewed | list + alternatives>
- **Color tokens:** <pairs verified with contrast --fix, light + dark>
- **Structure:** <heading outline / landmarks / focus order>
- **Verification:** <states needing --interact | where the audit gate sits>
- **Manual budget:** <what automation cannot judge here>
```

Then say, in one line, which components in this plan you could not write criteria for and why.

The skill's honesty rules (§3) apply to this section as much as to audit output: it is a set of
decisions and acceptance criteria, not a claim that the result will be accessible or conformant.
