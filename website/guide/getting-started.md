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

The Agent Skill is what makes your AI coding agent write accessible UI *by default*, before any
audit ever runs. Copy the skill directory into any [Agent Skills](https://agentskills.io/specification)-compatible
client:

```bash
# Personal, all projects (Claude Code and other clients that read ~/.claude/skills)
cp -r node_modules/a11y-loop/skill/a11y-loop ~/.claude/skills/a11y-loop

# Or project-scoped
cp -r node_modules/a11y-loop/skill/a11y-loop .claude/skills/a11y-loop
```

Any client implementing the Agent Skills specification can load it the same way — Claude Code,
Cursor, GitHub Copilot, Codex, Gemini CLI, and more.

## Run your first audit

```bash
a11y-loop audit http://localhost:3000
```

This runs five rendering passes (default, dark mode, forced-colors mode, reduced motion, and a
320px reflow viewport) against the page and prints any violations found, each tagged with its
WCAG success criterion.

Next: see [CLI Usage](/guide/cli-usage) for every command and flag, or
[Using it in CI](/guide/ci-integration) to wire this into a pipeline.
