# Field Notes

Things a report says that are not what they look like. These came out of running a11y-loop against
a production app across a full audit-fix cycle; each one cost an hour to work out from the report
alone, so it is written down here. Every number below that can be reproduced from a checkout
was reproduced at axe-core 4.12.1, and at 4.14.0 (checked 2026-10-19).

## `color-contrast` in the forced-colors pass is usually not a defect

axe-core reads an element's foreground from `-webkit-text-fill-color`, falling back to `color` only
when that is unset. Chromium's forced-colors emulation forces `color` and the background, and
leaves `-webkit-text-fill-color` at the author's value — on every element, including ones that
never declared it. So in the forced-colors pass axe compares the author's foreground against the
forced background.

Dark-on-light text survives that comparison. Light-on-dark text collapses. Measured on the
repository's `test/fixtures/fixture-forced-colors-dark-surface.html` at axe-core 4.14.0:

| Element | Default pass | forced-colors pass |
|---|---|---|
| `#6d6975` text on `#ffffff` | 5.34:1, silent | silent |
| `#e8e6ef` text on a `#141218` card | 15.04:1, silent | `color-contrast`, 1.23:1 — *"foreground color: #e8e6ef, background color: #ffffff"* |

Up to 0.3.2 this table gave 4.9:1 and 14:1 for the default pass. a11y-loop's own contrast math
gives 5.34:1 and 15.04:1 for those pairs, which is what the fixture now pins.

The tell is inside the finding: the reported foreground is the author's color while the background
is the forced `#ffffff` or `#000000`. On a page with any dark surface this arrives as a cluster
covering every line of text on it. On one production page it accounted for the large majority of a
153-finding run.

**a11y-loop now reports these rows under `needsReview`, not as violations.** A `color-contrast`
or `color-contrast-enhanced` violation from the forced-colors pass, and only from that pass, is
routed there by rule id and pass name. (`color-contrast-enhanced` is AAA and not in the default
run; it reads the foreground the same way, so it is routed too.) The row carries `routedFrom: "violation"`, a `note` with the explanation above and a
`noteUrl` pointing here. It carries no colour suggestion, because one computed from the mismatched
pair fails in the default pass: for the row above it would propose darkening `#e8e6ef` to `#77757d`.
The same element failing in the default, dark, reduced-motion or reflow pass is still a violation,
because a violation from any pass outranks this. On the fixture above the page went from one
violation and exit 1 to zero violations and exit 0, with the row still reported. On `demo/before`
and on every other fixture no row moved: each forced-colors contrast failure there also fails in
another pass. `diff` lists a row that moved this way as `RECLASSIFIED`, not `FIXED`, so diffing a
report from 0.3.2 or earlier against a new one does not count it as a fix.

**Do not suppress the rule.** Confirm the pair in the default and dark passes, check forced colors
by eye or with the OS setting, and say in the hand-off that forced colors was reviewed rather than
measured.

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
own message names the budget, and when the walk used every press without wrapping, each
`keyboard-unreachable` row also carries `confidence: { level: "reduced", reason }` saying so. The
dialog trap probe does the same for `dialog-focus-not-trapped` when the verdict came from its wrap
budget rather than from focus reaching real content outside the dialog.

A cluster of unreachable findings that is contiguous and sits at the end of document order is the
signature. Confirm by hand with the five-minute keyboard test in
[`manual-testing.md`](https://github.com/ChanMeng666/a11y-loop/blob/main/skills/a11y-loop/references/manual-testing.md),
and audit narrower states so each walk fits.

## `dialog-focus-not-returned` used to name the dialog's own Submit button (fixed in 0.4.0)

Up to 0.3.x the dialog check took the last clicked element as the dialog's trigger. An
`--interact` state that opened a dialog and then clicked the dialog's own Submit (to reach its
validation-error state) made Submit the "trigger". Escape then closed the dialog, focus went back
to the real opener, and the probe reported `dialog-focus-not-returned` because focus did not land
on Submit. The 2026-10 benchmark found this on every newsletter-modal run, and agents worked around
it by calling `requestSubmit()` instead of clicking.

The opener is now recorded at the moment the dialog opens: the last control activated or focused
outside it. A dialog the state's own action closes is checked too, from a focus snapshot taken when
the dialog closed (see the timing note below), not from wherever focus is when the state returns.
The verdicts:

| After the close | Escape probe | Closed by the state's own action |
|---|---|---|
| Focus on the opener | silent | silent |
| Opener on the page, focus on another real element | violation | silent (after a save, a more logical place is allowed) |
| Opener on the page, focus on `<body>` | violation | violation |
| Opener gone, focus on a heading, `main` or another real element | silent | silent |
| Opener gone, focus on `<body>` | violation | violation |
| Opener unknown, focus on `<body>` | needs-review | needs-review |

The opener is unknown when the dialog was open on load, or a state opened it from script with no
click or key press. `test/fixtures/fixture-dialog-submit-inside.html` reproduces the benchmark
scenario and must produce no row. A report from 0.3.x with this row on a state that clicked inside
the dialog is worth re-running.

## `status-message-not-announced` is a judgement about new text

The check looks at text that appeared after a state's action, outside any live region that was in
the page beforehand, with focus not moved to it. New text is also what a disclosure, a tab panel,
a menu, a validation pass or a new view looks like, so the check skips:

- text that any element names with `aria-describedby` or `aria-errormessage`, such as an inline
  error linked from its field, which is read when the field gets focus;
- all new text in the state when, after the action, focus is on something other than the control
  the state activated: the page moved the user on purpose (an error summary, the first invalid
  field), and that is the author handling the change;
- text inside a dialog that just opened;
- text an `aria-expanded="true"` control names with `aria-controls`, menus, listboxes, tab panels,
  open `<details>` and popovers;
- anything with a heading, landmark, table or two controls in it;
- everything, when the state changed the route.

What is left is reported as a violation only when the text is short, reads like a status ("saved",
"error", "required", "3 results") and appeared next to the control the state activated. Anything
else is `needsReview`.

So a needs-review row here usually means "this text appeared and nobody was told; was it a status
message?". If it was content the user asked to see, it is not one, and the row is answered. The
status wording list is English only, so on a page in another language nearly every row is
needs-review. `live-region-injected-late` is needs-review every time: the region carries the right
role, and whether its first text is read out depends on the browser and screen reader
(`role="alert"` often is). Confirm both with a screen reader, per
[`manual-testing.md`](https://github.com/ChanMeng666/a11y-loop/blob/main/skills/a11y-loop/references/manual-testing.md).

## The focus checks on a state wait up to a second for focus to land

`route-change-focus-lost` and `dialog-focus-not-returned` both ask where focus went after something
the state did. Both wait before answering. After a route change with focus on `<body>`, focus gets
up to 1 s to move somewhere real, polled every 50 ms, so a router that focuses the new heading once
its data has loaded is not reported. After the Escape probe closes a dialog, focus gets the same
1 s. A dialog the state's own action closes is judged from a snapshot that is retaken every 50 ms
until focus lands on a rendered element outside the dialog, or 1 s has passed. That snapshot is
frozen early by the state's next click or key press: whatever the state does after the close (click
plain text, which moves focus to `<body>` in Chromium, or click another button) is not the dialog's
doing, and does not change the verdict.

So a page that restores focus more than a second after a close, or focuses its new view more than a
second after a route change, is reported. For a route that waits on a long fetch, have the state
wait for the focus move before it returns; the second is counted from when the state returns. For a
dialog the second is counted from the close itself, so waiting in the state does not extend it, and
a state that acts again within the second freezes the snapshot at that moment.

The status-message check (`status-message-not-announced`) stands down entirely in a state where the page
moved focus somewhere other than the control the state activated. So an unannounced status shown in
that same state is not reported. This is a deliberate choice against false positives: focus moving
to a new place is how many pages announce a change, and the check cannot tell which message that
move covered.

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
