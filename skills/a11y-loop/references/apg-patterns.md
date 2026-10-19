# ARIA patterns and their keyboard contracts

Source of truth: the
[ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) (APG), plus
[WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) for normative role
definitions and [ARIA in HTML](https://www.w3.org/TR/html-aria/) for which roles
are permitted on which elements. ARIA 1.2 is the stable baseline; treat 1.3
features (`aria-notify`, `sectionheader`, `aria-braillelabel`, `suggestion`,
`comment`, `mark`) as emerging and never depend on them.

**First check whether you need ARIA at all.** A `<button>`,
`<details>`/`<summary>`, an `<input type="radio">` group in a `<fieldset>`, a
`<select>`, or a `<dialog>` gives you the whole contract for free and cannot drift
out of sync. Reach for a pattern below only when the native element cannot do the
job.

**A role is a promise.** Declaring a role commits you to every keyboard
interaction, state, and focus behavior in its contract, and ARIA adds no behavior
by itself. Pages using ARIA average *more* failures than pages without it (WebAIM
Million 2026: 59.1 vs 42.0 errors per page) precisely because the promise usually
goes unkept. If you cannot implement the full contract, ship the native element
or the plain version.

## The 30 APG patterns

Accordion (Sections With Show/Hide Functionality) · Alert · Alert and Message
Dialogs · Breadcrumb · Button · Carousel (Slide Show or Image Rotator) ·
Checkbox · Combobox · Dialog (Modal) · Disclosure (Show/Hide) · Feed · Grid
(Interactive Tabular Data and Layout Containers) · Landmarks · Link · Listbox ·
Menu and Menubar · Menu Button · Meter · Radio Group · Slider · Slider
(Multi-Thumb) · Spinbutton · Switch · Table · Tabs · Toolbar · Tooltip · Tree
View · Treegrid · Window Splitter

Index: [w3.org/WAI/ARIA/apg/patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)

**If the component you are building is not detailed below, open its APG page and
read the keyboard interaction table before writing any code.** The ten patterns
below cover most application UI; the other twenty (carousel, grid, treegrid,
slider, spinbutton, toolbar, tree view, window splitter, feed…) have longer
contracts that are easy to get wrong from memory.

---

## Dialog (Modal)

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · Prefer the
native `<dialog>` with `showModal()`, which gives you the top layer, backdrop,
inertness of the rest of the page, and Escape handling.

Roles and states: `role="dialog"` with `aria-modal="true"`; an accessible name
via `aria-labelledby` (pointing at the dialog's heading) or `aria-label`;
optionally `aria-describedby` for the body text.

| Key | Behavior |
|---|---|
| — (on open) | Focus moves into the dialog: the first focusable element, or the dialog container if there is nothing focusable |
| `Tab` | Cycles forward through focusable elements **inside the dialog only**, wrapping at the end |
| `Shift+Tab` | Cycles backward, wrapping at the start |
| `Escape` | Closes the dialog |
| — (on close) | Focus returns to the element that opened it |

Content outside the dialog must be inert (native `<dialog>`, the `inert`
attribute, or `aria-hidden` plus removal from the tab order — never `aria-hidden`
on a still-focusable element). For an alert dialog use `role="alertdialog"` with
initial focus on the least destructive button. Focus not returning to the trigger
on close is the most common defect in generated dialogs, and trivially
detectable.

## Tabs

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

Roles and states: `role="tablist"` containing elements with `role="tab"`, each
with `aria-selected="true|false"` and `aria-controls` pointing at its
`role="tabpanel"`; each panel has `aria-labelledby` pointing back at its tab.
Add `aria-orientation="vertical"` for a vertical tablist.

Only one tab is in the tab order: `tabindex="0"` on the selected tab,
`tabindex="-1"` on the rest (roving tabindex).

| Key | Behavior |
|---|---|
| `Tab` | Moves focus into the tablist (to the selected tab), then out to the active panel |
| `Right` / `Left` | Previous/next tab in a horizontal tablist, wrapping optional |
| `Down` / `Up` | Previous/next tab in a vertical tablist |
| `Home` / `End` | First / last tab |
| `Enter` / `Space` | Activates the focused tab — only in manual-activation mode |
| `Delete` | Optional, for closable tabs; move focus to a neighbouring tab |

Automatic activation (selection follows focus) is the APG default and is right
when switching panels is cheap. Use manual activation when panels load data.

## Accordion

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)

Each header is a real `<button>` wrapped in the heading level appropriate to the
document outline, with `aria-expanded` and `aria-controls` pointing at its panel.
The panel may carry `role="region"` with `aria-labelledby` referencing the
button — helpful with few panels, noisy with many.

| Key | Behavior |
|---|---|
| `Enter` / `Space` | Toggles the focused panel |
| `Tab` | Moves through headers and the content of expanded panels in DOM order |
| `Down` / `Up` | Optional: next/previous accordion header |
| `Home` / `End` | Optional: first/last accordion header |

Do not put `aria-expanded` on the heading; it belongs on the button. Do not
disable the button of an expanded panel unless the pattern genuinely forbids
collapsing all panels.

## Menu Button

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) · Only for
*actions*. A list of links is navigation, not a menu — use a disclosure with a
`<ul>`. `role="menu"` misapplied to navigation is a common and confusing defect.

Roles and states: the trigger is a `<button>` with `aria-haspopup="true"`,
`aria-expanded`, and `aria-controls` referencing the menu; the menu is
`role="menu"` containing `role="menuitem"` (or `menuitemcheckbox`/`menuitemradio`).

| Key | Behavior |
|---|---|
| `Enter` / `Space` / `Down` (on button) | Opens the menu, focus on the first item |
| `Up` (on button) | Opens the menu, focus on the last item |
| `Down` / `Up` (in menu) | Next / previous item, wrapping |
| `Home` / `End` | First / last item |
| printable character | Moves to the next item whose label starts with that character |
| `Enter` / `Space` | Activates the item, closes the menu, focus returns to the button |
| `Escape` | Closes the menu, focus returns to the button |
| `Tab` | Closes the menu and moves focus onward in the page |

Menu items use roving tabindex or `aria-activedescendant`; they are never in the
page tab order themselves.

## Combobox

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) · The most intricate
common pattern. If a plain `<select>` or an `<input list>` will do, use it.

Roles and states: `role="combobox"` on the text input with `aria-expanded`,
`aria-controls` referencing the popup, `aria-autocomplete="none|list|both"`, and
`aria-activedescendant` set to the id of the visually focused option while DOM
focus stays in the input. The popup is usually `role="listbox"` with
`role="option"` children carrying `aria-selected`. Label the input with `<label
for>`.

| Key | Behavior |
|---|---|
| `Down` | Opens the popup if closed and moves to the first/next option |
| `Up` | Opens the popup and moves to the last/previous option |
| `Alt+Down` | Opens the popup without moving the active option |
| `Enter` | Accepts the active option, closes the popup, keeps focus in the input |
| `Escape` | Closes the popup; a second press may clear the input |
| `Home` / `End` | Move the text cursor within the input, not through options |
| printable characters | Edit the input value and filter the list |
| `Tab` | Accepts the active option (if any) and moves focus out |

DOM focus must stay in the input throughout — move the *visual* active option
with `aria-activedescendant`. Announce result counts in a live region so screen
reader users know filtering happened.

## Disclosure (Show/Hide)

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) · The simplest and
most under-used pattern. Native `<details>`/`<summary>` covers most cases.

A `<button>` with `aria-expanded="true|false"` and `aria-controls` referencing
the content, which follows the button in the DOM.

| Key | Behavior |
|---|---|
| `Enter` / `Space` | Toggles the content |

That is the entire contract. No arrow keys, no roving tabindex, no focus
management. Reach for this before menu, before tabs, before dialog.

## Radio Group

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) · Strongly prefer native
`<input type="radio">` inputs sharing a `name`, inside a `<fieldset>` with a
`<legend>` — the browser then supplies the whole contract, grouping and
required-field semantics included. For the ARIA version: `role="radiogroup"` with
an accessible name, containing `role="radio"` elements with `aria-checked`, and
roving tabindex so only the checked radio is tabbable (the first, if none is).

| Key | Behavior |
|---|---|
| `Tab` | Moves into the group (to the checked radio) and, next press, out of the group entirely |
| `Right` / `Down` | Moves focus to the next radio **and checks it**, wrapping |
| `Left` / `Up` | Moves focus to the previous radio and checks it, wrapping |
| `Space` | Checks the focused radio if it is not already checked |

Selection follows focus here, unlike a listbox. Never make each radio
separately tabbable.

## Switch

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)

Either `<button role="switch" aria-checked="true|false">` or `<input
type="checkbox" role="switch">`. A switch is on/off with immediate effect; a
checkbox is a selection a form submits. Do not use `aria-pressed` — that is a
toggle button.

| Key | Behavior |
|---|---|
| `Space` | Toggles the switch |
| `Enter` | Toggles it too, in the `<button>` form |

The label must name the thing being controlled ("Email notifications"), not the
state ("Notifications on") — the state lives in `aria-checked`, and putting it in
the label makes the announcement contradict itself. `aria-checked` must be
updated in the same handler that changes the visuals. `role="switch"` has no
mixed state.

## Tooltip

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) · The APG warns this
pattern is under discussion and support is uneven; a visible text label or a
disclosure is usually better. The tooltip element has `role="tooltip"` and an
`id` referenced by the trigger's `aria-describedby`, and the trigger must itself
be focusable.

| Trigger | Behavior |
|---|---|
| hover | Shows the tooltip |
| focus | Shows the tooltip — required, not optional |
| `Escape` | Hides it while the trigger keeps focus |

SC 1.4.13 requires the tooltip to be dismissible without moving the pointer,
hoverable (the pointer can move onto the tooltip without it vanishing), and
persistent until dismissed or invalid. Never put interactive content — links,
buttons, form fields — inside a tooltip; it is unreachable. For an icon-only
button give the *name* with `aria-label` and use the tooltip as the visible
description; a tooltip alone is not an accessible name.

## Listbox

[APG](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) · Prefer `<select>`
unless you need custom option rendering or drag-reordering.

Roles and states: `role="listbox"` with an accessible name, containing
`role="option"` children with `aria-selected`; `aria-multiselectable="true"` for
multi-select; roving tabindex or `aria-activedescendant` for focus; `role="group"`
plus an `aria-label` to group options.

| Key | Behavior |
|---|---|
| `Down` / `Up` | Move the focused option |
| `Home` / `End` | First / last option |
| printable character | Type-ahead to the next matching option |
| `Space` | Toggles selection in a multi-select listbox |
| `Shift+Down` / `Shift+Up` | Extends the selection in a multi-select listbox |
| `Ctrl+A` | Optional: select or deselect all |

Single-select listboxes normally let selection follow focus. Multi-select must
not: focus and selection are independent, and `Space` commits.

## Related

[plan-phase.md](plan-phase.md) (choosing the pattern before you build it) ·
[wcag22-quick-ref.md](wcag22-quick-ref.md) (the criteria behind these contracts) ·
[ai-failure-modes.md](ai-failure-modes.md) · [manual-testing.md](manual-testing.md)
