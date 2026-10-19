# Getting Started

## Prerequisites

- Node.js ≥ 20
- A Chromium install for a11y-loop's own Playwright (`a11y-loop install-browser`, below)

## Everything at once (agent-runnable)

Every command on this page is non-interactive, idempotent, and safe to re-run — no prompts, no TTY,
no menus. Hand this block to your agent and it can install and verify the whole thing without asking
you to click anything:

```bash
npm i -g a11y-loop
a11y-loop install-browser
a11y-loop doctor                                  # exit 0 when an audit can run here

# Then ONE of these:
npx skills add ChanMeng666/a11y-loop -g -y        # portable skill, any Agent Skills client
claude plugin install a11y-loop --marketplace ChanMeng666/a11y-loop   # OR the Claude Code plugin (2.1.292+)
```

No `git clone` needed. `npx skills add` fetches the skill from GitHub. The same skill also ships inside
the npm package, so `cp -r "$(npm root -g)/a11y-loop/skills/a11y-loop" ~/.claude/skills/` works too,
unless `npx skills add` already linked it there. On Claude Code older than 2.1.292, the plugin takes
two commands: `claude plugin marketplace add ChanMeng666/a11y-loop`, then
`claude plugin install a11y-loop@chanmeng-a11y-loop --scope user`. On Codex:
`codex plugin marketplace add ChanMeng666/a11y-loop`, then `codex plugin add a11y-loop@chanmeng-a11y-loop`.
On Windows, these commands work in PowerShell and Git Bash, not cmd.exe.
Verify:

```bash
a11y-loop --version
test -f ~/.claude/skills/a11y-loop/references/plan-phase.md && echo "skill ok"   # skill route
claude plugin list | grep -A2 'a11y-loop@'   # plugin route; expect: Status: ✔ enabled
```

Install the skill *or* the plugin, not both — the plugin carries its own copy, and doing both makes
the model see `a11y-loop` and the directory-qualified `a11y-loop:a11y-loop`, paying the always-on
token cost twice.

Upgrading is a different command from installing (`claude plugin install` on something already
installed reports "already installed" and does nothing):

```bash
npm i -g a11y-loop@latest
npx skills add ChanMeng666/a11y-loop -g -y                           # if using the skill
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

Then install the Chromium build a11y-loop's own Playwright needs to run audits, and check the setup:

```bash
a11y-loop install-browser
a11y-loop doctor
```

If you keep browser binaries off your system drive, set `PLAYWRIGHT_BROWSERS_PATH` before running
`a11y-loop install-browser` (and before running your own test suite, if it launches the same
browser) — for example `PLAYWRIGHT_BROWSERS_PATH=D:\playwright-browsers` on Windows.

## Install the Agent Skill

The Agent Skill is what makes your AI coding agent plan for accessibility and write accessible UI
*by default*, before any audit ever runs. The one-line route works for any
[Agent Skills](https://agentskills.io/specification)-compatible client:

```bash
npx skills add ChanMeng666/a11y-loop -g -y
```

Or copy the skill directory yourself:

```bash
# Personal, all projects (Claude Code and other clients that read ~/.claude/skills)
cp -r node_modules/a11y-loop/skills/a11y-loop ~/.claude/skills/a11y-loop

# Or project-scoped
cp -r node_modules/a11y-loop/skills/a11y-loop .claude/skills/a11y-loop
```

Any client implementing the Agent Skills specification can load it the same way — Claude Code,
Cursor, GitHub Copilot, Codex, Gemini CLI, and more. The skill carries all four sections: §0 plan
rules, §1 generation rules, §2 the audit loop, §3 honest reporting.

### Optional: the Claude Code plugin layer

The portable skill above is the whole product. This repository also ships a thin Claude-Code-only
layer that adds one thing a skill cannot do — enforcement during plan mode:

```bash
claude plugin install a11y-loop --marketplace ChanMeng666/a11y-loop   # Claude Code 2.1.292 or later

# Older Claude Code:
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

The hook runs only in Claude Code. The Anthropic plugin directory also lists the plugin on Cowork
and the Claude apps, where hooks do not run and the audit cannot, so there only the skill's rules
apply. Outside plan mode, and in any other agent or CI job, `a11y-loop plan-check --file plan.md` runs
the same check (see [CLI Usage](/guide/cli-usage#plan-check)).

Its limits are deliberate: it never returns `allow`, and off the deny path it sends at most a
reminder with no permission decision, so it never suppresses your own plan approval; it declines a
given plan **at most once**, so it cannot loop; a
plan with no UI in it passes silently; and `A11Y_LOOP_PLAN_GATE=off` turns it off. The gate checks
that the question was asked — it cannot check that the answer is any good. That is still
`a11y-loop audit` and a human.

|  | Portable skill | Plugin layer |
|---|---|---|
| Install | copy `skills/a11y-loop` | `claude plugin install a11y-loop@…` |
| Works in | 40+ Agent Skills clients | Claude Code (the hook and `/a11y-plan`) |
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
