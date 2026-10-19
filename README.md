<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/brand/a11y-loop-logo-dark.svg">
  <img src="./.github/brand/a11y-loop-logo-light.svg" alt="a11y-loop" width="88" height="88">
</picture>

# a11y-loop

### Accessible UI, checked in a real browser.

Your coding agent writes accessible UI, audits the rendered page, fixes what it finds, and tells you what it could not check.

<a href="https://ChanMeng666.github.io/a11y-loop/"><img src="./.github/readme/pill-docs.svg" height="40" alt="Docs"></a> <a href="https://www.npmjs.com/package/a11y-loop"><img src="./.github/readme/pill-npm.svg" height="40" alt="npm"></a> <a href="evals/benchmark-results.md"><img src="./.github/readme/pill-benchmark.svg" height="40" alt="Benchmark"></a> <a href="docs/overview.md#-field-notes"><img src="./.github/readme/pill-field-notes.svg" height="40" alt="Field notes"></a>

</div>

<br>

<a href="https://ChanMeng666.github.io/a11y-loop/"><img src="./.github/readme/card.svg" width="100%" alt="a11y-loop, an open-source Agent Skill and command-line tool that has a coding agent write accessible UI, audit the rendered page in a real browser, fix what was found and audit again. The card follows one turn of that loop on the demo page: 159 detectable failures across five rendering passes fall to 0, beside the 44 findings left for review and the 15 manual checks automation cannot judge."></a>

<br>

https://github.com/user-attachments/assets/33ff8672-7690-4581-9ceb-d95476883c54

## Try it

```bash
npm i -g a11y-loop
npx playwright install chromium
mkdir -p ~/.claude/skills
cp -r "$(npm root -g)/a11y-loop/skills/a11y-loop" ~/.claude/skills/
```

That is the command-line tool, its browser and the skill. Start a new agent session and ask for UI as usual: the skill applies while the agent writes it. To audit a page yourself:

```bash
a11y-loop audit http://localhost:3000
```

<sub>Every command is non-interactive, so your agent can run them for you. Claude Code also has an optional plugin: see [Getting started](docs/overview.md#-getting-started).</sub>

## Why a loop

- **Five rendering passes, not one page load.** Default, dark mode, forced colors, reduced motion and a 320 px reflow viewport, plus the states the agent built: an open modal, an expanded menu, a form error.
- **The end of the loop can be checked.** `a11y-loop diff` marks each finding FIXED, NEW or REMAINING. A new one fails the run even when the total went down.
- **It lists what it could not check.** A clean report means no automatically detectable failures were found. It is never a conformance claim. Every run comes with a manual-review checklist for what needs a person or assistive technology.

```mermaid
flowchart LR
    W[Agent writes UI] --> A[Audit in a real browser]
    A --> V{Violations?}
    V -->|yes| F[Agent fixes them] --> A
    V -->|no| D([Report and<br/>manual-review checklist])
```

## For your agent

This page is all a person needs. Everything else is written for agents: clone the repo and point yours at [`AGENTS.md`](AGENTS.md) and [`skills/a11y-loop/SKILL.md`](skills/a11y-loop/SKILL.md), or start from [`llms.txt`](llms.txt).

<sub>[Full overview](docs/overview.md) · [Honest coverage](docs/overview.md#-honest-coverage) · [Using it in CI](docs/overview.md#%EF%B8%8F-using-it-in-ci) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Third-party notices](THIRD-PARTY-NOTICES.md) · [MIT](LICENSE)</sub>

<sub>Built by [Chan Meng](https://github.com/ChanMeng666).</sub>
