# Field Notes

Things a report says that are not what they look like. These came out of running a11y-loop against
a production app across a full audit-fix cycle; each one cost an hour to work out from the report
alone, so it is written down here. Every number below is reproducible from a checkout at axe-core
4.12.1.

## `color-contrast` in the forced-colors pass is usually not a defect

axe-core reads an element's foreground from `-webkit-text-fill-color`, falling back to `color` only
when that is unset. Chromium's forced-colors emulation forces `color` and the background, and
leaves `-webkit-text-fill-color` at the author's value — on every element, including ones that
never declared it. So in the forced-colors pass axe compares the author's foreground against the
forced background.

Dark-on-light text survives that comparison. Light-on-dark text collapses:

| Element | Default pass | forced-colors pass |
|---|---|---|
| `#6d6975` text on `#ffffff` | 4.9:1, silent | silent |
| `#e8e6ef` text on a `#141218` card | 14:1, silent | `color-contrast`, 1.23:1 — *"foreground color: #e8e6ef, background color: #ffffff"* |

The tell is inside the finding: the reported foreground is the author's color while the background
is the forced `#ffffff` or `#000000`. On a page with any dark surface this arrives as a cluster
covering every line of text on it. On one production page it accounted for the large majority of a
153-finding run.

**Do not apply the suggestion.** It is computed from the same mismatched pair: for the row above it
proposes darkening `#e8e6ef` to `#77757d`, which then fails in the default pass. **Do not suppress
the rule either.** Confirm the pair in the default and dark passes, check forced colors by eye or
with the OS setting, and say in the hand-off that forced colors was reviewed rather than measured.

## `div-button` on `<body>` or a portal root is an outside-press handler

Popup libraries dismiss on a press outside the popup by attaching a click handler to the document
body or to the portal container. `div-button` looks for exactly that shape — a click handler on an
element with no role, no `tabindex` and no keyboard path — so while a popup is open it reports
`html > body` and the portal root.

The keyboard equivalent of "press outside to dismiss" is Escape, which those libraries wire
separately. So the question the row should send you to is `dialog-escape-does-not-close`: if
Escape dismisses the popup, the `div-button` row on the body is a false positive of this check.
It is a real failure only when that handler is the only way to activate something.

## Contrast sampled mid-animation measures a frame, not the design

An element fading in is composited at partial opacity, and axe flattens that against what is behind
it. Measured on a production page: `#6d6975` text at opacity 0.917 was read as `#797580`. The
difference is small, but it is enough to move a value that sits near 4.5:1 across the line, and
enough for two runs of the same page to disagree.

If a contrast finding names a color you cannot find anywhere in the source, this is usually why.
The audit waits 120 ms after load for webfonts and short entrance animations; a longer reveal
outlives it. Re-run, have the `--interact` state wait for the animation to settle before it
returns, or read the number off the reduced-motion pass — which is the stable one, provided the
app honors the preference rather than ignoring it.

## `keyboard-unreachable` can mean the Tab budget ran out

The keyboard survey presses Tab up to 60 times, then reports everything the page said should be
reachable but the walk never reached. Past 60 tab stops in one state, the tail of the document is
reported unreachable because the budget ended, not because focus could not get there. The rule's
own message names the budget.

A cluster of unreachable findings that is contiguous and sits at the end of document order is the
signature. Confirm by hand with the five-minute keyboard test in
[`manual-testing.md`](https://github.com/ChanMeng666/a11y-loop/blob/main/skills/a11y-loop/references/manual-testing.md),
and audit narrower states so each walk fits.

## Up to 0.2.x, invoking the CLI through a link silently did nothing (fixed in 0.3.0)

`src/cli.js` runs its entry point only when it is the program being run. Up to 0.2.x it decided
that by comparing `import.meta.url` with `process.argv[1]`. Node resolves `import.meta.url`
through a junction or symlink to the real path while `process.argv[1]` keeps the path as invoked,
so through any link the guard was false, nothing ran, and the process exited **0 with no output**,
which reads like a pass:

```bash
node D:\link-to-repo\src\cli.js --version   # 0.2.x: prints nothing, exit 0
```

That covered Windows worktrees reached through a junction and, more widely, `npm i -g` and `npx`
on Linux and macOS, where npm installs the bin as a symlink. Since 0.3.0 the guard resolves
`process.argv[1]` to its real path before comparing. If you are on 0.2.x, run the CLI by its real
path. To embed it, import the entry point and call it directly; `main` is exported for this:

```js
import { main } from './src/cli.js';
process.exitCode = await main(['audit', 'http://localhost:3000', '--json']);
```

## Related

- [Honest Coverage](/guide/honest-coverage) — what a clean report does and does not mean
- [CLI Usage](/guide/cli-usage) — the commands and flags these notes refer to
