# Getting Started

## Prerequisites

- Node.js ≥ 20
- A Chromium install for Playwright (installed below)

## Everything at once (agent-runnable)

Every command on this page is non-interactive, idempotent, and safe to re-run — no prompts, no TTY,
no menus. Hand this block to your agent and it can install and verify the whole thing without asking
you to click anything:

```bash
npm i -g a11y-loop
npx playwright install chromium
mkdir -p ~/.claude/skills
cp -r "$(npm root -g)/a11y-loop/skill/a11y-loop" ~/.claude/skills/
claude plugin marketplace add ChanMeng666/a11y-loop
claude plugin install a11y-loop@chanmeng-a11y-loop --scope user
```

No `git clone` — the skill ships inside the npm package. Verify:

```bash
a11y-loop --version
test -f ~/.claude/skills/a11y-loop/references/plan-phase.md && echo "skill ok"
claude plugin list | grep -A2 'a11y-loop@'   # expect: Status: ✔ enabled
```

Install the skill *or* the plugin, not both — the plugin carries its own copy, and doing both makes
the model see `a11y-loop` and the directory-qualified `a11y-loop:a11y-loop`, paying the always-on
token cost twice.

Upgrading is a different command from installing (`claude plugin install` on something already
installed reports "already installed" and does nothing):

```bash
npm i -g a11y-loop@latest
cp -r "$(npm root -g)/a11y-loop/skill/a11y-loop" ~/.claude/skills/   # if using the skill
claude plugin marketplace update chanmeng-a11y-loop                  # if using the plugin
claude plugin update a11y-loop@chanmeng-a11y-loop
```

The rest of this page explains each piece.

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
claude plugin marketplace add ChanMeng666/a11y-loop
claude plugin install a11y-loop@chanmeng-a11y-loop --scope user
```

Ordinary CLI commands — no TTY, no prompts, safe to re-run. (`/plugin marketplace add …` and
`/plugin install …` do the same thing inside a session, but an agent should use the CLI form.)
Managing it later is equally non-interactive: `claude plugin disable a11y-loop`, `claude plugin
enable a11y-loop`, `claude plugin uninstall a11y-loop@chanmeng-a11y-loop` — `-y` is needed only
alongside `--prune`, the one flag that asks for confirmation.

From a local checkout, `claude plugin marketplace add ./` registers the working copy instead, so the
plugin tracks your edits rather than the published repo.

**Team-wide, declaratively.** `--scope project` writes a `.claude/settings.json` you commit, after
which a fresh clone needs no install commands at all:

```json
{
  "extraKnownMarketplaces": {
    "chanmeng-a11y-loop": { "source": { "source": "github", "repo": "ChanMeng666/a11y-loop" } }
  },
  "enabledPlugins": { "a11y-loop@chanmeng-a11y-loop": true }
}
```

**The one thing an agent cannot do for you.** Project-scoped plugins and hooks sit behind Claude
Code's workspace-trust prompt the first time that directory is opened — a deliberate security
boundary, since code from a repo should not execute just because a file said so. Nothing here
bypasses it. `--scope user` avoids it entirely.

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
| Install | copy `skill/a11y-loop` | `claude plugin install a11y-loop@…` |
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
