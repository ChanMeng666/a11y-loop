# Privacy

a11y-loop collects nothing. It has no server, no account, no analytics and no telemetry. Nothing
it does sends data to its author, so there is nothing for the author to keep, share or delete.

What each part does on your machine:

- **The skill** (`skills/a11y-loop/`) is text: instructions your agent reads. It runs nothing by
  itself and reads nothing by itself.
- **The Claude Code plugin's plan hook** runs before Claude Code leaves plan mode. It reads the text of
  the plan being approved, decides whether to ask for an accessibility section, and writes one
  small state file. That file holds hashes of plans it has already declined and a per-session
  count, never the plan text, and lives in Claude Code's plugin data directory or the system temp
  directory. Entries expire after seven days. The hook makes no network requests. Turn it off with
  `A11Y_LOOP_PLAN_GATE=off`.
- **The plugin's audit hook** runs when Claude is about to end a session. It reads the session
  transcript Claude Code already keeps on your machine, looking only for file edits and
  `a11y-loop audit` commands, and never writes to it. It writes one small state file, in the same
  directory as the plan hook's, holding the ids of sessions it has already declined. It runs no
  audit and makes no network requests. Turn it off with `A11Y_LOOP_AUDIT_GATE=off`.
- **Installing the plugin** copies the plugin's own folder into Claude Code's plugin cache. Since
  0.3.1 that folder has no `package.json`, so the install fetches no packages.
- **The command-line tool** (`npm i -g a11y-loop`) launches a local Chromium, serves `--file` and
  `--html` targets on a localhost port, and opens only the URL you give it. The page it opens
  loads whatever that page itself loads. Reports are written only to the paths you pass with
  `--out` and `--sarif`, and otherwise go to your terminal.
- **`a11y-loop mcp`** runs the same code as the command-line tool, over stdio, for the MCP client
  that started it. It opens no network port, and keeps run results in memory only, unless a tool
  call asks it to write a report with `out`.
- **The GitHub Action** runs in your own workflow on GitHub's runners. It installs a11y-loop from
  npm, audits the target you give it, and, only with `pr-comment: 'true'`, posts one comment on the
  pull request with the workflow's own token. Nothing goes to the author.
- **`a11y-loop install-browser`** downloads Chromium and a headless shell from Playwright's
  download servers. That request goes to Playwright's CDN, not to a11y-loop.
- **Installing from npm or GitHub** is handled by npm, GitHub and your agent client, under their
  own privacy policies.

Your agent client (Claude Code, Codex, or another) processes the skill, the plan and the audit
output under its own privacy policy. a11y-loop adds no data flow of its own to it.

Questions: open an issue at <https://github.com/ChanMeng666/a11y-loop/issues>, or see
[SECURITY.md](SECURITY.md) for anything sensitive.
