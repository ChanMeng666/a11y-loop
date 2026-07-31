# Getting Started

## Prerequisites

- Node.js ≥ 20
- A Chromium install for Playwright (installed below)

## Install the CLI

```bash
npm install --save-dev a11y-loop
# or run it without installing:
npx a11y-loop --help
```

Then install the Chromium build Playwright needs to run audits:

```bash
npx playwright install chromium
```

If you keep browser binaries off your system drive, set `PLAYWRIGHT_BROWSERS_PATH` before running
`npx playwright install chromium` (and before running your own test suite, if it launches the same
browser) — for example `PLAYWRIGHT_BROWSERS_PATH=D:\playwright-browsers` on Windows.

## Install the Agent Skill

The Agent Skill is what makes your AI coding agent plan for accessibility and write accessible UI
*by default*, before any audit ever runs. Copy the skill directory into any
[Agent Skills](https://agentskills.io/specification)-compatible client:

```bash
# Personal, all projects (Claude Code and other clients that read ~/.claude/skills)
cp -r node_modules/a11y-loop/skill/a11y-loop ~/.claude/skills/a11y-loop

# Or project-scoped
cp -r node_modules/a11y-loop/skill/a11y-loop .claude/skills/a11y-loop
```

Any client implementing the Agent Skills specification can load it the same way — Claude Code,
Cursor, GitHub Copilot, Codex, Gemini CLI, and more. The skill carries all four sections: §0 plan
rules, §1 generation rules, §2 the audit loop, §3 honest reporting.

### Optional: the Claude Code plugin layer

The portable skill above is the whole product. This repository also ships a thin Claude-Code-only
layer that adds one thing a skill cannot do — enforcement during plan mode:

```bash
# From a checkout of the repo, in Claude Code
/plugin install .
```

It contributes a `PreToolUse` hook matched to `ExitPlanMode`: when a plan changes UI work and says
nothing about accessibility, the plan is declined once and the `### Accessibility` section is handed
back to fill in, naming any decision already in the plan that is hard to walk back later. It also
adds `/a11y-plan`, to ask for that section directly.

Its limits are deliberate: it **defers** rather than allows on every non-deny path, so it never
suppresses your own plan approval; it declines a given plan **at most once**, so it cannot loop; a
plan with no UI in it passes silently; and `A11Y_LOOP_PLAN_GATE=off` turns it off. The gate checks
that the question was asked — it cannot check that the answer is any good. That is still
`a11y-loop audit` and a human.

|  | Portable skill | Plugin layer |
|---|---|---|
| Install | copy `skill/a11y-loop` | `/plugin install .` |
| Works in | 40+ Agent Skills clients | Claude Code only |
| Gives you | §0 planning, §1 generation, §2 the loop, §3 honest reporting | plan-mode enforcement, `/a11y-plan` |
| Required? | yes | no |

See [Planning with Accessibility](/guide/planning) for what §0 actually asks a plan to carry.

## Run your first audit

```bash
a11y-loop audit http://localhost:3000
```

This runs five rendering passes (default, dark mode, forced-colors mode, reduced motion, and a
320px reflow viewport) against the page and prints any violations found, each tagged with its
WCAG success criterion.

Next: see [CLI Usage](/guide/cli-usage) for every command and flag, or
[Using it in CI](/guide/ci-integration) to wire this into a pipeline.
