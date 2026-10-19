# Privacy

a11y-loop collects nothing. It has no server, no account, no analytics and no telemetry. Nothing
it does sends data to its author, so there is nothing for the author to keep, share or delete.

What each part does on your machine:

- **The skill** (`skills/a11y-loop/`) is text: instructions your agent reads. It runs nothing by
  itself and reads nothing by itself.
- **The Claude Code plugin's hook** runs before Claude Code leaves plan mode. It reads the text of
  the plan being approved, decides whether to ask for an accessibility section, and writes one
  small state file. That file holds hashes of plans it has already declined and a per-session
  count, never the plan text, and lives in Claude Code's plugin data directory or the system temp
  directory. Entries expire after seven days. The hook makes no network requests. Turn it off with
  `A11Y_LOOP_PLAN_GATE=off`.
- **Installing the plugin** copies the plugin's own folder into Claude Code's plugin cache. From
  this version on, that folder has no `package.json`, so the install fetches no packages.
- **The command-line tool** (`npm i -g a11y-loop`) launches a local Chromium, serves `--file` and
  `--html` targets on a localhost port, and opens only the URL you give it. The page it opens
  loads whatever that page itself loads. Reports are written only to the paths you pass with
  `--out` and `--sarif`, and otherwise go to your terminal.
- **`a11y-loop install-browser`** downloads Chromium and a headless shell from Playwright's
  download servers. That request goes to Playwright's CDN, not to a11y-loop.
- **Installing from npm or GitHub** is handled by npm, GitHub and your agent client, under their
  own privacy policies.

Your agent client (Claude Code, Codex, or another) processes the skill, the plan and the audit
output under its own privacy policy. a11y-loop adds no data flow of its own to it.

Questions: open an issue at <https://github.com/ChanMeng666/a11y-loop/issues>, or see
[SECURITY.md](SECURITY.md) for anything sensitive.
