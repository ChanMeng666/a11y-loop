# a11y-loop plugin for Claude Code

This folder is the a11y-loop Claude Code plugin. It makes accessibility a decision in the plan:
when a plan changes user interface work and says nothing about accessibility, the plan is declined
once and Claude is handed the section to fill in. It ships three things:

- **The `a11y-loop` skill** (`skills/a11y-loop/`): plan rules, accessible-markup generation rules,
  an audit-fix-re-audit loop, and rules for how results may be described.
- **The `/a11y-plan` command** (`commands/a11y-plan.md`): writes the plan's accessibility section
  on request.
- **A plan-mode hook** (`hooks/plan-gate.mjs`): a `PreToolUse` hook on `ExitPlanMode`.

## What it runs on your machine

- **The skill** is text. It runs nothing by itself.
- **The hook** runs `node hooks/plan-gate.mjs` from this folder before Claude Code leaves plan
  mode. It reads the plan text and writes one small state file to Claude Code's plugin data
  directory (or the temp directory). It makes no network requests. Turn it off with
  `A11Y_LOOP_PLAN_GATE=off`.
- **Installing the plugin** copies this folder and nothing else. There is no `package.json` here,
  so the install fetches no packages.
- **The audit** needs the separate command-line tool: `npm i -g a11y-loop` and then
  `a11y-loop install-browser`, which downloads Chromium from Playwright's CDN. The plugin does not
  install it for you.

A clean audit means no automatically detectable failures were found in the states and passes that
ran. It is not a conformance claim. Every run ends with a checklist of what still needs a person.

## Install

```bash
claude plugin marketplace add ChanMeng666/a11y-loop
claude plugin install a11y-loop@chanmeng-a11y-loop --scope user
```

Full documentation: <https://github.com/ChanMeng666/a11y-loop#readme> and
<https://chanmeng666.github.io/a11y-loop/>. Privacy: [PRIVACY.md](https://github.com/ChanMeng666/a11y-loop/blob/main/PRIVACY.md).

## For contributors

`skills/a11y-loop/`, `hooks/lib/plan-gate.mjs` and `LICENSE` in this folder are generated copies.
Edit the originals at the repository root (`skills/a11y-loop/`, `src/lib/plan-gate.js`, `LICENSE`)
and run `npm run sync-plugin`. A unit test fails while any copy differs from its source.
