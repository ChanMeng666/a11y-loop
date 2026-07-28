# Architecture & the Loop

a11y-loop is two things working together: an **Agent Skill** that sets standing generation rules
while an AI agent writes UI code, and a **Node CLI** that verifies the rendered result in a real
browser and feeds failures back to the agent until the report converges.

```mermaid
graph TD
    A["Agent Skill<br/>skill/a11y-loop/SKILL.md + references/"] -->|standing generation rules| B["Agent writes UI code<br/>HTML / JSX / Vue / Svelte / Astro / CSS"]
    B --> C["a11y-loop CLI"]
    C --> D["audit<br/>5 passes: default, dark,<br/>forced-colors, reduced-motion, 320px reflow"]
    C --> E["contrast --fix<br/>WCAG 2.x + OKLCh suggestions"]
    C --> F["diff<br/>FIXED / NEW / REMAINING"]
    D --> G["Playwright + Chromium"]
    G --> H["axe-core"]
    G --> I["a11y-loop's own checks<br/>focus, dialog trap, target size,<br/>reduced motion, link text, div-button"]
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
