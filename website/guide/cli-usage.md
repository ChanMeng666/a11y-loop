# CLI Usage

a11y-loop ships seven commands: `audit`, `contrast` and `diff` for verification, `plan-check` for
the plan, `doctor` and `install-browser` for setup, and `mcp`, which serves the others as MCP
tools. Exit codes are the same contract
everywhere: `0` pass, `1` findings, `2` tool or usage error.

## `audit`

```bash
# Audit a running page (five passes: default, dark, forced-colors, reduced-motion, reflow)
a11y-loop audit http://localhost:3000

# Audit an HTML file (served locally, never over file://)
a11y-loop audit --file ./dist/index.html

# Audit an HTML fragment directly — the usual entry point for an agent mid-generation
a11y-loop audit --html "<button class=\"icon-btn\"><svg .../></button>"

# Audit an interactive state (e.g. a modal after it opens)
a11y-loop audit http://localhost:3000 --interact ./states/modal-open.mjs
```

`--interact` accepts a module exporting `const states = { name: async (page) => {} }` — a small
Playwright script per state (menu expanded, dialog open, form in its error state) so the same five
rendering passes run against states an agent just built, not only the initial page load.

## `contrast`

```bash
# Check a color pair against WCAG 2.x and get OKLCh fix suggestions
a11y-loop contrast "#767676" "#ffffff" --fix
```

Checks a foreground/background pair against WCAG 2.x (1.4.3: 4.5:1 normal text / 3:1 large text;
1.4.11: 3:1 for UI components) and, on failure with `--fix`, suggests passing colors in both
directions (lighter and darker) in OKLCh, so a fix stays close to the original hue instead of
jumping to black or white.

Unlike `audit`, `contrast` needs no browser, no render, and no code — which makes it usable at plan
time, before a single component exists, along with `plan-check`. Run every pair the design intends
(body, muted, link, error, disabled, focus ring, control border) in light *and* dark, and let the
passing values become the tokens: see [Planning with Accessibility](/guide/planning).

## `diff`

```bash
# Compare two audit reports for regressions
a11y-loop diff --before base.json --after head.json
```

Matches findings across two reports by rule + selector + element shape and classifies
each as `FIXED`, `NEW` (a regression — fails the command even if the total count went down), or
`REMAINING`. A violation that a documented rule moved to needs-review, such as forced-colors
contrast, is listed as `RECLASSIFIED` and never counted as fixed.

## `plan-check`

```bash
# Check that a written plan names its accessibility decisions before UI is built
a11y-loop plan-check --file plan.md
a11y-loop plan-check --text "Add a settings page with a modal dialog and tabs"
cat plan.md | a11y-loop plan-check --json
```

Runs the same decision as the Claude Code plan-mode hook, from any agent or CI job. It exits `0`
when the plan carries accessibility content, is not UI work, or is too short to assess, `1` when a
UI plan has thin or absent accessibility content, and `2` on a usage or input error. `--json`
returns the verdict, `isUiWork`, `hasA11yContent`, the missing items and the plan rule each one
stands for. It never prompts: stdin is read only when it is not a terminal, and a pipe held open
with no data gives up with `2` after 3 seconds (`A11Y_LOOP_STDIN_IDLE_MS` overrides that). It is
stateless, so the same plan always gets the same answer. It checks that the questions were asked
in the plan, not that the answers are any good.

## `doctor`

```bash
a11y-loop doctor
a11y-loop doctor --json
```

Reports Node against the required version, the bundled Playwright and its Chromium build,
`PLAYWRIGHT_BROWSERS_PATH`, the axe-core version actually loaded, skill copies under
`~/.claude/skills` and `~/.agents/skills`, the Claude Code plugin, and a warning when both the skill
and the plugin are installed. It exits `0` when an audit can run here and `2` when it cannot, never
`1`. The verdict comes from a real headless browser launch, not from whether a file exists.

## `install-browser`

```bash
a11y-loop install-browser                # Chromium plus the headless shell, about 700 MB
a11y-loop install-browser --only-shell   # headless shell only, enough for audits (CI)
```

Installs Chromium with a11y-loop's own bundled Playwright. Use it instead of
`npx playwright install chromium`, which runs whichever Playwright comes first and can install a
build this copy cannot launch. Extra arguments go to Playwright's installer unchanged
(`--with-deps`, `--dry-run`, `--only-shell`). stdin is ignored, so `--with-deps` cannot answer a
sudo prompt. Set `PLAYWRIGHT_BROWSERS_PATH` the same way here and when you audit.

## `mcp`

```bash
a11y-loop mcp
```

Serves `audit`, `diff`, `contrast --fix`, `plan-check`, `doctor` and the manual checklist as six
Model Context Protocol tools over stdio, for clients that load MCP servers but not Agent Skills.
Each tool returns the report its command writes with `--json`. stdout is the protocol channel. It
exits `0` when the client closes stdin. Setup for Claude Code, Codex and Cursor is in the
[overview](https://github.com/ChanMeng666/a11y-loop/blob/main/docs/overview.md#mcp-server).

## Flags reference

| Flag | Applies to | Effect |
|---|---|---|
| `--json` | audit, contrast, diff, doctor, plan-check | machine-readable output on stdout |
| `--file <path>` | audit, plan-check | the HTML file to audit, or the plan to check |
| `--text "<plan>"` | plan-check | the plan as an argument; with neither `--file` nor `--text`, a piped stdin is read |
| `--out <path>` | audit | write the JSON report to a file |
| `--sarif <path>` | audit | also write SARIF v2.1 — see [Honest Coverage](/guide/honest-coverage) for a documented limitation |
| `--interact <path.mjs>` | audit | export `const states = { name: async (page) => {} }` to drive built states |
| `--headed` | audit | run a visible browser, for debugging |
| `--no-best-practice` | audit | omit axe best-practice rules (never blocking either way) |
| `--quiet` | audit | one-line summary only |
| `--verbose` | audit | list every row of every cluster; by default a cluster prints one example and "+N more like this" |
| `--large` | contrast | large-scale text thresholds (≥24px, or ≥18.5px bold) |
| `--ui` | contrast | non-text / UI component threshold, 3:1, SC 1.4.11 |
| `--fix` | contrast | suggest passing colors, lighter and darker, in OKLCh |

Run `a11y-loop --help` for the full, current reference.
