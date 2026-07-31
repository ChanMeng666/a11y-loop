# Planning with accessibility in it

Most accessibility tooling starts when there is something to scan. By then the expensive decisions
have already been made.

a11y-loop's §0 plan rules run earlier than that — while the work is still being scoped, before the
first component exists. The point is not to front-load paperwork. It is that a specific, small set
of decisions determines whether an interface *can* be made accessible, those decisions get made in
planning, and they are nearly free to change there.

## The decisions that foreclose accessibility

Some product choices are a sentence to change in a plan and a re-architecture to change after
launch:

| Decision | Criterion | The alternative, decided now |
|---|---|---|
| Reordering only by dragging | SC 2.5.7 Dragging Movements (AA) | Move up/down buttons, a position field, or a cut-and-paste move |
| Menus that only open on hover | SC 1.4.13 Content on Hover or Focus (AA) | Open on click; dismissible, hoverable, persistent |
| Infinite scroll with no fallback | relates to SC 2.4.3 Focus Order (A) | A "load more" button or real pagination |
| Data rendered only to canvas/WebGL | SC 1.1.1 Non-text Content (A) | A data table, a summary, or an SVG version — part of the build |
| Time limits | SC 2.2.1 Timing Adjustable (A) | Turn off, adjust, or extend — pick one |
| CAPTCHA | SC 1.1.1 (A) + SC 3.3.8 Accessible Authentication (AA) | A non-cognitive path; puzzles and transcription fail 3.3.8 |
| Autoplaying media | SC 1.4.2 (A), SC 2.2.2 (A) | A control reachable before the moving thing |

None of these is a CSS bug. Each is a product decision, which is why the plan is the right place
for it.

## What §0 asks for

A plan that changes UI carries a section like this:

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

Two of those lines are worth calling out.

**The conformance target.** WCAG 2.2 Level AA is the default because 2.2 is backward compatible, so
hitting it satisfies every major jurisdiction at once — New Zealand's Web Accessibility Standard 1.2
and UK public sector at 2.2 AA, EU EN 301 549 v3.2.1 and US ADA Title II at 2.1 AA, US Section 508 at
2.0 AA. The version table with primary sources is in the skill's `references/plan-phase.md`.

**Color tokens.** `a11y-loop contrast --fix` needs no browser, no render, and no code, which makes it
the one part of the CLI that is genuinely usable at plan time:

```bash
a11y-loop contrast "#6B7280" "#FFFFFF" --fix
a11y-loop contrast "#6B7280" "#111827" --fix   # the dark theme is a separate question
```

Settle the palette here and every component inherits a passing pair. Settle it later and every
component inherits a fix.

## Enforcing it in Claude Code

The skill is portable across any Agent Skills client, and §0 works in all of them — but a skill can
only tell an agent to think about something. The optional Claude Code plugin layer can require it:

```bash
claude plugin marketplace add ChanMeng666/a11y-loop
claude plugin install a11y-loop@chanmeng-a11y-loop --scope user
```

It registers a `PreToolUse` hook on `ExitPlanMode`. When a plan changes UI work and says nothing
about accessibility, the plan is declined once and the section above is handed back to fill in,
along with any foreclosing decision already visible in the plan.

Its limits are deliberate:

- It **defers** rather than allows on every other path, so your own plan approval is never suppressed.
- It declines a given plan **at most once** — a gate that can fire twice on one plan is a trap.
- A plan with no UI in it passes silently.
- `A11Y_LOOP_PLAN_GATE=off` turns it off.

The gate checks that the question was asked. It cannot check that the answer is any good — that is
still [the audit loop](/guide/architecture) and a human reviewer.

## What this does not do

Planning accessibility in does not make the result accessible, and nothing in §0 should be reported
as though it did. A filled-in Accessibility section is a set of decisions and acceptance criteria,
not an outcome. The verification is still `a11y-loop audit` across the states you built, and the
part automation cannot reach is still [larger than the part it can](/guide/honest-coverage) —
which is why "manual budget" is a line in the section rather than a footnote.
