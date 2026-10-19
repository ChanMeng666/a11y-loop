# Plan and audit gates in other agent clients

In Claude Code the plugin ships two hooks. A plan gate declines a UI plan that says nothing about
accessibility, once. An audit gate declines ending a session that wrote UI files and never ran
`a11y-loop audit`, once per session. Both only remind and trigger the audit. Neither makes anything
accessible, and neither checks what the audit found beyond its exit code.

Other clients cannot load that plugin. This page says what each one offers instead, using only what
its own documentation describes. Everything was read on **2026-10-20**. Where the documentation does
not say, this page says that, rather than guessing.

## At a glance

| Client | Plan gate | Audit gate | Verified on | Source |
|---|---|---|---|---|
| Claude Code | `PreToolUse` hook on `ExitPlanMode` (plugin) | `Stop` hook (plugin) | in this repo | [plugin README](https://github.com/ChanMeng666/a11y-loop/blob/main/plugin/README.md) |
| OpenAI Codex CLI | none verified; skill rules, or run `plan-check` | `Stop` hook can continue the turn | 2026-10-20 | <https://learn.chatgpt.com/docs/hooks> |
| Cursor | none verified; skill rules | `stop` hook can send a follow-up message | 2026-10-20 | <https://cursor.com/docs/hooks> |
| GitHub Copilot cloud agent and Copilot CLI | none verified; skill rules | `agentStop` hook can force another turn | 2026-10-20 | <https://docs.github.com/en/copilot/reference/hooks-reference> |
| Gemini CLI (not Antigravity CLI; see its section) | none verified; skill rules | `AfterAgent` hook can force a retry | 2026-10-20 | <https://geminicli.com/docs/hooks/reference/> |
| Windsurf | none verified; skill rules | hooks exist, none found that continues the agent; use CI | 2026-10-20 | <https://docs.devin.ai/desktop/cascade/hooks> |
| Cline | no hook system found; skill rules | code plugins only; use CI | 2026-10-20 | <https://docs.cline.bot/sdk/plugins> |
| OpenCode | no hook system found; skill rules | JavaScript plugins only; use CI | 2026-10-20 | <https://opencode.ai/docs/plugins/> |
| Cowork and the Claude apps | skill rules only | none: hooks do not run there | in this repo | [plugin README](https://github.com/ChanMeng666/a11y-loop/blob/main/plugin/README.md) |
| Any CI or git hook | `a11y-loop plan-check` | `a11y-loop audit`, exit code 1 | in this repo | [CI guide](https://github.com/ChanMeng666/a11y-loop/blob/main/website/guide/ci-integration.md) |

None of the pages read documents a counterpart of Claude Code's plan-mode interception, so the plan
gate has no hook route here. That is a statement about the pages read, not proof that none exists.

## What you need first

```bash
npm i -g a11y-loop
a11y-loop install-browser
a11y-loop doctor            # exit 0: an audit can run here; exit 2: it cannot, and why
npx skills add ChanMeng666/a11y-loop -g -y
```

`doctor` never prompts. Where it exits 2 an audit cannot run, and the script below then lets the
agent stop, the same way the Claude Code hook fails open.

## The plan gate without a hook

Install the skill with `npx skills add`. Its section 0 puts the accessibility decisions into the plan
as standing instructions, in any client that reads Agent Skills. That is a request to the model, not
a check.

To check a plan yourself, or to have the agent check its own plan, call the CLI. It is stateless and
never prompts:

```bash
a11y-loop plan-check --file plan.md --json </dev/null
a11y-loop plan-check --text "Add a settings page with a modal dialog and a members table"
```

Exit 0 means the plan carries accessibility content or is not UI work. Exit 1 means a UI plan with
thin or absent accessibility content. Exit 2 is a usage error. In a client with no plan hook, the
useful place for this is your own instructions: "run `a11y-loop plan-check` on the plan before
writing UI code." The model may or may not comply; nothing here enforces it.

## The audit gate

Four clients document a hook that fires when the agent finishes and can feed text back so the agent
continues. They differ in event name and in the field that carries the text. One script serves all
four. It does what the Claude Code hook does in spirit, with a smaller scope:

- It audits `A11Y_LOOP_TARGET` (an http or https URL) if you set it, otherwise every `.html` or
  `.htm` file that `git status` reports as added, modified or renamed. It runs git and the audit from
  the repository root, because a hook runs in the session's working directory, which can be a
  subfolder. It does not read the client's transcript, so it does not see other UI file types or
  know what ran earlier in the session.
- It starts no shell, so a file name cannot be read as a command. On Windows it finds the installed
  package through `where` and runs its `cli.js` with node, because the `.cmd` shim needs a shell.
- It has a time budget, 100 seconds by default (`A11Y_LOOP_GATE_BUDGET_MS`). Files it has not
  reached when the budget runs out are listed in its reason text for the agent to audit itself.
- It asks the agent to continue only when an audit exits 1. Exit 2 (no browser, usage error) and any
  error of its own let the agent stop. If `a11y-loop` cannot be started at all, it writes
  `a11y-gate: a11y-loop not found` and the error code to stderr and lets the agent stop.
- It stops asking when the client says it is already continuing because of a stop hook
  (`stop_hook_active` for Codex, Copilot and Gemini CLI, `loop_count` for Cursor).
  `A11Y_LOOP_AUDIT_GATE=off` disables it.
- It never prompts, and the audit it runs has its stdin closed.

Save this as `a11y-gate.mjs` in the folder named for each client below:

```js
#!/usr/bin/env node
// Runs `a11y-loop audit` when an agent is about to finish, and asks it to continue if the audit
// found violations. Usage: node a11y-gate.mjs <codex|copilot|gemini|cursor>
// Target: A11Y_LOOP_TARGET (an http or https URL) if set, otherwise every .html/.htm file that git
// reports as added, modified or renamed in the repository the session is in.
// Never prompts, never uses a shell, and fails open: any error of its own lets the agent stop.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const client = process.argv[2];
let payload = {};
try { payload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* closed or empty stdin */ }

// Loop guards: stop_hook_active (Codex, Copilot, Gemini) or loop_count (Cursor) say the client is
// already continuing because of a stop hook. status is Cursor's: skip aborted or errored runs.
if (payload.stop_hook_active === true || Number(payload.loop_count || 0) >= 1) process.exit(0);
if (payload.status && payload.status !== 'completed') process.exit(0);
if (/^(off|0|false)$/i.test(process.env.A11Y_LOOP_AUDIT_GATE || '')) process.exit(0);

const budgetMs = Number(process.env.A11Y_LOOP_GATE_BUDGET_MS) || 100000; // keep below the client's hook timeout
const started = Date.now();
const run = (cmd, args, cwd, timeout) =>
  spawnSync(cmd, args, { cwd, timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); // no shell

// Hooks run in the session's working directory, which may be a subfolder: work from the repo root.
const start = payload.cwd || process.cwd();
const top = run('git', ['-C', start, 'rev-parse', '--show-toplevel'], start, 10000);
if (top.status !== 0) process.exit(0);
const root = top.stdout.trim();

// How to start the CLI without a shell. On Windows the global bin is a .cmd shim that cannot be
// spawned without one, so run the package's cli.js with node instead.
let cli = ['a11y-loop'];
if (process.platform === 'win32') {
  // cwd is the temp dir, not the repo: `where` searches the current directory first, and a repository
  // must not be able to plant an a11y-loop.cmd that gets run.
  const where = run('where', ['a11y-loop'], tmpdir(), 10000);
  const shim = (where.stdout || '').split(/\r?\n/).find((l) => l.trim());
  const js = shim && join(dirname(shim.trim()), 'node_modules', 'a11y-loop', 'src', 'cli.js');
  if (!js || !existsSync(js)) { process.stderr.write('a11y-gate: a11y-loop not found on PATH\n'); process.exit(0); }
  cli = [process.execPath, js];
}

let targets = []; // each is ['--file', path] or [url]
const url = process.env.A11Y_LOOP_TARGET;
if (url) {
  if (!/^https?:\/\//i.test(url)) process.exit(0);
  targets = [{ name: url, args: [url] }];
} else {
  const st = run('git', ['-c', 'core.quotepath=off', 'status', '--porcelain', '-uall', '-z'], root, 20000);
  if (st.status !== 0) process.exit(0);
  const entries = st.stdout.split('\0');
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.length < 4) continue;
    const xy = e.slice(0, 2), file = e.slice(3);
    if (/[RC]/.test(xy)) i++; // a rename or copy is followed by its old path: skip that entry
    if (xy.includes('D') || !/\.html?$/i.test(file)) continue;
    targets.push({ name: file, args: ['--file', file] });
  }
}

const failures = [], skipped = [];
for (const t of targets) {
  const left = budgetMs - (Date.now() - started);
  if (left < 5000) { skipped.push(t.name); continue; }
  const r = run(cli[0], [...cli.slice(1), 'audit', ...t.args, '--quiet'], root, left);
  if (r.error && r.error.code !== 'ETIMEDOUT') { // for example ENOENT: a11y-loop is not installed
    process.stderr.write(`a11y-gate: a11y-loop not found (${r.error.code})\n`);
    process.exit(0);
  }
  if (r.error || r.signal) skipped.push(t.name); // timed out
  else if (r.status === 1) failures.push(`${t.name}: ${(r.stdout || '').trim().split('\n')[0]}`);
  // status 2 (no browser, usage error) and anything else: fail open, like the Claude Code hook.
}
if (failures.length === 0 && skipped.length === 0) process.exit(0);

let reason = '';
if (failures.length) {
  reason += 'a11y-loop audit found violations. Run `a11y-loop audit <target> --json --out report.json`, ' +
    `fix them, then re-run until it exits 0. ${failures.join('; ')}. `;
}
if (skipped.length) {
  reason += `The audit time budget ran out before these were audited: ${skipped.join(', ')}. Audit them yourself. `;
}
reason += 'An audit covers only what automation can detect; say what you did not check.';
const out = {
  codex: { decision: 'block', reason },
  copilot: { decision: 'block', reason },
  gemini: { decision: 'deny', reason },
  cursor: { followup_message: reason },
}[client];
if (!out) process.exit(0);
process.stdout.write(JSON.stringify(out));
```

This script was run on Windows with all four client arguments, from a subfolder, against a new
folder, a renamed file and a non-ASCII file name with spaces, with the loop guard set, with closed
stdin, with an invalid URL target, and with a budget too short to finish. It was not run inside the
clients themselves. Check each client's
hook log once before relying on it.

### OpenAI Codex CLI

Hooks are enabled by default, in `hooks.json` or `config.toml`, in a trusted project's `.codex/`
folder or in `~/.codex/`. A `Stop` hook that exits 0 with `{"decision":"block","reason":"..."}`
makes Codex continue and use the reason as a new prompt. Source:
<https://learn.chatgpt.com/docs/hooks> (the old `developers.openai.com/codex/hooks` address
redirects there), read 2026-10-20.

Save the script as `.codex/hooks/a11y-gate.mjs` and add to `.codex/hooks.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/.codex/hooks/a11y-gate.mjs\" codex",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

The page says `timeout` is in seconds (default 600 for most hooks) and that commands run with the
session `cwd`, which is why the script finds the repository root itself. `Stop` input includes
`stop_hook_active`, "whether this turn was already continued by `Stop`", which the script's loop
guard reads. What happens when a `Stop` hook times out is not documented; the page says only that a
`SessionEnd` timeout is reported as a hook failure. Not verified: whether the hook runs under
`codex exec`, and which shell expands the command on Windows.

### Cursor

`.cursor/hooks.json` with `"version": 1`. The `stop` event receives `status` and `loop_count`, and a
non-empty `followup_message` in its output is submitted as the next user message. The default is 5
automatic follow-ups per script, set with `loop_limit`. Cloud agents run command hooks from the
repository's `.cursor/hooks.json` and support `stop`. Source: <https://cursor.com/docs/hooks>, read
2026-10-20.

Save the script as `.cursor/hooks/a11y-gate.mjs` and add to `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "stop": [
      { "command": "node .cursor/hooks/a11y-gate.mjs cursor", "timeout": 120, "loop_limit": 1 }
    ]
  }
}
```

Not verified: whether the Cursor CLI runs hooks. The CLI overview page read on the same date does not
mention them, and the hooks page names the CLI only for one unrelated event. Do not assume it does.
The page says `timeout` is in seconds, with a "platform default" it does not give as a number, and
that project hooks run from the project root. It says crashes, timeouts and non-zero exits other than
2 fail open, in the section on permission hooks; it does not repeat that for `stop`. `loop_count`
counts the automatic follow-ups already made, which the script's guard reads, and `loop_limit` caps
them.

### GitHub Copilot cloud agent and Copilot CLI

Hooks are JSON files in `.github/hooks/` (repository, for the cloud agent and the CLI) or
`~/.copilot/hooks/` (CLI), with `"version": 1`. For `agentStop`,
`{"decision":"block","reason":"..."}` forces another turn using the reason as the prompt. The CLI
overrides the hook after eight consecutive blocks, and on the cloud agent each extra turn counts
against the job's timeout. `agentStop` input includes `stop_hook_active`, which the script's guard reads.
The `timeoutSec` default is 30; the page does not say what happens when a hook exceeds it. The cloud
agent reads only `.github/hooks/*.json` and honors only the
`bash` field. Sources: <https://docs.github.com/en/copilot/concepts/agents/hooks>
and <https://docs.github.com/en/copilot/reference/hooks-reference>, read 2026-10-20.

Save the script as `.github/hooks/a11y-gate.mjs` and add `.github/hooks/a11y-gate.json`:

```json
{
  "version": 1,
  "hooks": {
    "agentStop": [
      {
        "type": "command",
        "bash": "node .github/hooks/a11y-gate.mjs copilot",
        "powershell": "node .github/hooks/a11y-gate.mjs copilot",
        "timeoutSec": 120
      }
    ]
  }
}
```

Not verified: whether the cloud agent's runner has a Chromium that `a11y-loop install-browser` can
fill. If `doctor` exits 2 there, the hook lets the agent stop and the CI route below is the check.
The overview page labels its example file `~/.github/hooks/project-hooks.json` while stating
`.github/hooks/` for the repository; the snippet follows the stated repository path.

### Gemini CLI

This section describes Gemini CLI only. Both Gemini hook pages carry the notice "Unpaid tier and
Google One users: Gemini CLI was replaced by Antigravity CLI on June 18th, 2026." Whether Antigravity
CLI reads the same hooks was not checked.

Hooks live under a `hooks` key in `settings.json`, keyed by event name. The project file is
`.gemini/settings.json`, then `~/.gemini/settings.json`, then `/etc/gemini-cli/settings.json`. `AfterAgent` receives
`prompt`, `prompt_response` and `stop_hook_active`. `{"decision":"deny","reason":"..."}` rejects the
response and sends the reason to the agent as a new prompt; exit 2 does the same with stderr as the
prompt. Stdout must hold only the final JSON object. Sources: <https://geminicli.com/docs/hooks/>
and <https://geminicli.com/docs/hooks/reference/>, read 2026-10-20.

Save the script as `.gemini/hooks/a11y-gate.mjs` and merge into `.gemini/settings.json`:

```json
{
  "hooks": {
    "AfterAgent": [
      {
        "matcher": "*",
        "hooks": [
          {
            "name": "a11y-loop-audit",
            "type": "command",
            "command": "node \"$GEMINI_PROJECT_DIR/.gemini/hooks/a11y-gate.mjs\" gemini",
            "timeout": 120000
          }
        ]
      }
    ]
  }
}
```

The `timeout` is in milliseconds, default 60000. The pages read do not say what happens when a hook
exceeds it.

### Windsurf

Hooks are configured in `hooks.json` (workspace `.devin/hooks.json`; user and system locations also
exist). Only pre-hooks can block; the page says post-hooks cannot, and it describes no way for a hook
to make the agent keep working after it finishes. No stop-time gate was found. Use the CI route.
Source: <https://docs.devin.ai/desktop/cascade/hooks> (the old `docs.windsurf.com` address
redirects there), read 2026-10-20.

### Cline and OpenCode

No declarative hook system was found as of 2026-10-20; use the CI route. Cline's hooks page defers
to its SDK plugins page, where hooks are TypeScript functions (<https://docs.cline.bot/sdk/plugins>).
OpenCode loads JavaScript or TypeScript plugins from `.opencode/plugins/` with events such as
`session.idle` (<https://opencode.ai/docs/plugins/>). Neither page was verified to let a plugin send
the agent a follow-up prompt, so no snippet is given. If you write such a plugin, run
`a11y-loop audit` and treat exit 1 as the signal, as above.

### Cowork and the Claude apps

Hooks do not run there, and there is no Node or browser for the audit. The skill's rules apply and
nothing is verified.

## The route that needs no client support

A git hook or a CI job works with every client, because it does not depend on the agent at all, and
it also covers changes made by hand. Exit code 1 means the audit found violations in the states it
ran. Exit 0 does not mean the page is accessible: automated checks cover part of the problem, and the
report lists the manual checks that remain.

A pre-commit hook, saved as `.git/hooks/pre-commit` and made executable:

```bash
#!/bin/bash
# Audit staged HTML files (the files on disk, not only the staged content).
# File names are read NUL-separated, so spaces and odd characters are safe. stdin is closed.
status=0
while IFS= read -r -d '' f; do
  a11y-loop audit --file "$f" --quiet </dev/null
  [ $? -eq 1 ] && status=1
done < <(git diff --cached -z --name-only --diff-filter=ACMR | grep -z -Ei '\.html?$')
exit $status
```

Exit 2 from the audit (for example no browser) does not fail the commit here; change the test if you
want it to. In GitHub Actions, from release 0.4.0:

```yaml
- uses: actions/setup-node@v4
  with: { node-version: 22 }
- uses: ChanMeng666/a11y-loop@v0.4.0
  with:
    target: ./dist/index.html
    fail-on: violations
```

The action ships in release 0.4.0 and later, so a `uses:` line pinned to an earlier tag does not
resolve. On 0.3.2 or earlier call the CLI from a `run:` step, as the
[CI guide](https://github.com/ChanMeng666/a11y-loop/blob/main/website/guide/ci-integration.md)
shows. The action's inputs and outputs are in `action.yml` at the repository root.

## A third route: the MCP server, which is not a gate

`a11y-loop mcp` serves the CLI as Model Context Protocol tools over stdio, including
`a11y_loop_plan_check` and `a11y_loop_audit` (with `a11y_loop_diff`, `a11y_loop_contrast_fix`,
`a11y_loop_doctor` and `a11y_loop_manual_checklist`). A client that loads MCP servers lets the agent
call those tools itself, in the middle of a task. That is a standing capability, not a gate: nothing
makes the agent call them, nothing runs when it stops, and it does not replace a hook or the CI
route. Setup snippets for Claude Code, Codex and Cursor are in the
[overview](https://github.com/ChanMeng666/a11y-loop/blob/main/docs/overview.md#mcp-server). Copilot's and Gemini CLI's MCP configuration was not checked against their own documentation, so there is no snippet for them.

## Limits, stated plainly

- The script audits changed `.html` files or one URL. The Claude Code hook reads the transcript and
  watches more file types. A page that needs interaction states needs `--interact`, which this
  script does not pass.
- Each hook asks for one more turn. It cannot make the agent comply or fix anything correctly.
- Hook behavior in each client changes. The dates above are when the pages were read.
