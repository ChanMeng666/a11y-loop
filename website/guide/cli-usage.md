# CLI Usage

a11y-loop ships three commands: `audit`, `contrast`, and `diff`.

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

Unlike `audit`, `contrast` needs no browser, no render, and no code — which makes it the one
command usable at plan time, before a single component exists. Run every pair the design intends
(body, muted, link, error, disabled, focus ring, control border) in light *and* dark, and let the
passing values become the tokens: see [Planning with Accessibility](/guide/planning).

## `diff`

```bash
# Compare two audit reports for regressions
a11y-loop diff --before base.json --after head.json
```

Matches findings across two reports by rule + selector + WCAG success criterion and classifies
each as `FIXED`, `NEW` (a regression — fails the command even if the total count went down), or
`REMAINING`.

## Flags reference

| Flag | Applies to | Effect |
|---|---|---|
| `--json` | audit, contrast | machine-readable output on stdout |
| `--out <path>` | audit | write the JSON report to a file |
| `--sarif <path>` | audit | also write SARIF v2.1 — see [Honest Coverage](/guide/honest-coverage) for a documented limitation |
| `--interact <path.mjs>` | audit | export `const states = { name: async (page) => {} }` to drive built states |
| `--headed` | audit | run a visible browser, for debugging |
| `--no-best-practice` | audit | omit axe best-practice rules (never blocking either way) |
| `--quiet` | audit | one-line summary only |
| `--large` | contrast | large-scale text thresholds (≥24px, or ≥18.5px bold) |
| `--ui` | contrast | non-text / UI component threshold, 3:1, SC 1.4.11 |
| `--fix` | contrast | suggest passing colors, lighter and darker, in OKLCh |

Run `a11y-loop --help` for the full, current reference.
