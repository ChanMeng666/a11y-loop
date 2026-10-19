# a11y-loop plugin for Claude Code

This folder is the a11y-loop Claude Code plugin. It makes accessibility a decision in the plan:
when a plan changes user interface work and says nothing about accessibility, the plan is declined
once and Claude is handed the section to fill in. When a session changes user interface files and
never runs the audit afterwards, ending the session is declined once and Claude is handed the
commands to run. It ships four things:

- **The `a11y-loop` skill** (`skills/a11y-loop/`): plan rules, accessible-markup generation rules,
  an audit-fix-re-audit loop, and rules for how results may be described.
- **The `/a11y-plan` command** (`commands/a11y-plan.md`): writes the plan's accessibility section
  on request.
- **A plan-mode hook** (`hooks/plan-gate.mjs`): a `PreToolUse` hook on `ExitPlanMode`.
- **An audit hook** (`hooks/audit-gate.mjs`): a `Stop` hook. It declines a stop at most once per
  session, and never while Claude is already continuing because of a stop hook.

## Where each part works

- **Claude Code (CLI and desktop)** gets all four: the skill, the `/a11y-plan` command, the
  plan-mode hook and the audit hook. The audit hook also runs in headless `claude -p` sessions.
- **Cowork and the Claude apps (web, desktop, mobile)** get the skill's plan, generation and
  reporting rules only. Neither hook runs there. The audit loop (the skill's §2)
  cannot run there either, because it needs Node and a browser. So the skill's rules apply, but
  nothing is verified.

## What it runs on your machine

- **The skill** is text. It runs nothing by itself.
- **The hook** runs `node hooks/plan-gate.mjs` from this folder before Claude Code leaves plan
  mode. It reads the plan text and writes one small state file to Claude Code's plugin data
  directory (or the temp directory). It makes no network requests. Turn it off with
  `A11Y_LOOP_PLAN_GATE=off`.
- **The audit hook** runs `node hooks/audit-gate.mjs` from this folder when Claude is about to
  finish. It reads the session transcript Claude Code already keeps, looking for file edits and
  audit commands, and writes one small state file to the same data directory. It runs no audit
  itself and makes no network requests. Turn it off with `A11Y_LOOP_AUDIT_GATE=off`.
- **Installing the plugin** copies this folder and nothing else. There is no `package.json` here,
  so the install fetches no packages.
- **The audit** needs the separate command-line tool: `npm i -g a11y-loop` and then
  `a11y-loop install-browser`, which downloads Chromium from Playwright's CDN. The plugin does not
  install it for you.

A clean audit means no automatically detectable failures were found in the states and passes that
ran. It is not a conformance claim. Every run ends with a checklist of what still needs a person.

## Install

In Claude Code:

```text
/plugin install a11y-loop --marketplace ChanMeng666/a11y-loop
```

From a terminal (Claude Code 2.1.292 or later):

```bash
claude plugin install a11y-loop --marketplace ChanMeng666/a11y-loop
```

Older versions:

```bash
claude plugin marketplace add ChanMeng666/a11y-loop
claude plugin install a11y-loop@chanmeng-a11y-loop --scope user
```

The audit still needs the command-line tool: `npm i -g a11y-loop`, then `a11y-loop install-browser`.

Full documentation: <https://github.com/ChanMeng666/a11y-loop#readme> and
<https://chanmeng666.github.io/a11y-loop/>. Privacy: [PRIVACY.md](https://github.com/ChanMeng666/a11y-loop/blob/main/PRIVACY.md).

## For contributors

The skill, the hook's logic and the license in this folder are generated copies; see [CONTRIBUTING.md](https://github.com/ChanMeng666/a11y-loop/blob/main/CONTRIBUTING.md) before editing.
