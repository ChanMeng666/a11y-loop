# Architecture & the Loop

a11y-loop is two things working together: an **Agent Skill** that sets the rules — first while the
UI work is being planned, then while the agent writes the code — and a **Node CLI** that verifies
the rendered result in a real browser and feeds failures back to the agent until the report
converges.

The skill's phases run in that order. §0 settles the decisions that are cheap now and expensive
later (conformance target, per-component criteria, foreclosing decisions, color tokens, structure);
§1 governs the code as it is written; §2 is the audit loop below; §3 governs what may be claimed
about the result. Only §2 needs a browser — see
[Planning with Accessibility](/guide/planning) for the phase that runs before any of this exists.

```mermaid
graph TD
    A["Agent Skill<br/>skill/a11y-loop/SKILL.md + references/"] -->|"§0 plan rules"| P["Agent plans the UI work<br/>conformance target, per-component criteria,<br/>foreclosing decisions, color tokens, structure"]
    P -->|"contrast --fix, no browser needed"| E
    P --> B
    A -->|"§1 standing generation rules"| B["Agent writes UI code<br/>HTML / JSX / Vue / Svelte / Astro / CSS"]
    B --> C["a11y-loop CLI"]
    C --> D["audit<br/>5 passes: default, dark,<br/>forced-colors, reduced-motion, 320px reflow"]
    C --> E["contrast --fix<br/>WCAG 2.x + OKLCh suggestions"]
    C --> F["diff<br/>FIXED / NEW / REMAINING"]
    D --> G["Playwright + Chromium"]
    G --> H["axe-core"]
    G --> I["a11y-loop's own checks<br/>focus, dialog trap (native and portalled),<br/>target size, reduced motion,<br/>link text, div-button"]
    D -->|--interact| J["Drive built states:<br/>modal open, menu expanded, form error"]
    H --> K["JSON report<br/>WCAG SC + ACT IDs + provenance"]
    I --> K
    J --> K
    K --> L["SARIF v2.1<br/>(secondary format)"]
    K --> M["Manual-review checklist"]
    K -->|violations found| B
    F --> K
```

## One audit-fix-reaudit cycle

```mermaid
sequenceDiagram
    participant Agent
    participant CLI as a11y-loop CLI
    participant Browser as Playwright + Chromium
    participant Axe as axe-core + a11y-loop's own checks
    Agent->>CLI: a11y-loop audit (after writing UI code)
    CLI->>Browser: render page across 5 passes<br/>(+ --interact states, if any)
    Browser->>Axe: run checks against each rendered pass
    Axe-->>CLI: findings (WCAG SC, ACT ID, provenance)
    CLI-->>Agent: JSON report + manual-review checklist
    alt violations found
        Agent->>Agent: fix code
        Agent->>CLI: a11y-loop audit (re-run)
    else no violations
        Agent->>CLI: a11y-loop diff --before --after
        CLI-->>Agent: Converged — FIXED/NEW/REMAINING summary
    end
```

The flow in words: the skill's §0 puts the accessibility decisions in the plan, where changing them
is still a sentence; §1 sets standing rules while the agent writes the UI; `a11y-loop audit`
verifies the rendered result across five passes plus any built interaction states; violations feed
back to the agent to fix; `a11y-loop diff` confirms convergence without new regressions; the JSON
report and its manual-review checklist are the artifact of record, with SARIF offered as a
secondary format for tools that consume it.

Only the plan phase has an enforcement point outside the skill itself: in Claude Code, the
[optional plugin layer](/guide/getting-started#optional-the-claude-code-plugin-layer) hooks
`ExitPlanMode` and declines a UI plan with no accessibility content once. It checks that the
question was asked, not that the answer is any good — the audit loop above and a human reviewer are
still what judge the answer.

## Tech stack

- **Runtime:** Node.js ≥ 20, ESM
- **Browser automation:** [Playwright](https://playwright.dev/) (Chromium)
- **Accessibility engine:** [axe-core](https://github.com/dequelabs/axe-core) via `@axe-core/playwright`
- **Color math:** [culori](https://github.com/Evercoder/culori) (OKLCh contrast fixes)
- **Focus order:** [tabbable](https://github.com/focus-trap/tabbable)
- **SARIF conversion:** [axe-sarif-converter](https://github.com/microsoft/axe-sarif-converter)
- **Agent integration:** the open [Agent Skills](https://agentskills.io/specification) standard

See the [README's Tech Stack section](https://github.com/ChanMeng666/a11y-loop#%EF%B8%8F-tech-stack)
for licensing details (axe-core is MPL-2.0, separate from this project's MIT license).
