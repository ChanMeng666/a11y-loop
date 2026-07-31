# WCAG 2.2 Level AA — developer quick reference

Normative text: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (W3C Recommendation
5 Oct 2023, updated 12 Dec 2024; ratified as ISO/IEC 40500:2025).
Filterable per-criterion index with techniques:
[How to Meet WCAG](https://www.w3.org/WAI/WCAG22/quickref/).

**Counting.** WCAG 2.2 has **86 success criteria** (31 A / 24 AA / 31 AAA), of
which the **55 A + AA criteria** below must all be met for Level AA
conformance. Sources claiming 87 have added the 9 new criteria without
subtracting the one that was removed — **do not repeat the 87 figure**.

**4.1.1 Parsing was removed** in WCAG 2.2, declared obsolete because assistive
technology no longer parses HTML directly. Duplicate IDs and invalid nesting
are still bugs worth fixing (they break `aria-labelledby`, label association,
and `getElementById`), but they are no longer a WCAG failure. Never cite 4.1.1.

**Target Level AA.** Every major regulation references AA: New Zealand Web
Accessibility Standard 1.2 and UK public sector at WCAG 2.2 AA, US ADA Title II
and EU EN 301 549 v3.2.1 at 2.1 AA (EU moves to 2.2 AA with v4.1.1), US Section
508 at 2.0 AA. WCAG 2.2 is backward compatible, so hitting 2.2 AA satisfies all
of them at once. W3C states explicitly that AAA is not a realistic
whole-site target; treat individual AAA criteria as opt-in advisories.

---

## The 55 criteria (Level A and AA)

`2.2` marks a criterion new in WCAG 2.2.

### 1. Perceivable

| SC | Name | Lvl | | What it means when you are writing code |
|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | | Every image, icon, chart, and control has a text alternative; purely decorative images get `alt=""` |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | | Transcript for audio-only; transcript or audio track for video-only |
| 1.2.2 | Captions (Prerecorded) | A | | Captions on all prerecorded video with sound |
| 1.2.3 | Audio Description or Media Alternative | A | | Visual information in video is available in audio or text |
| 1.2.4 | Captions (Live) | AA | | Live captions on live audio content |
| 1.2.5 | Audio Description (Prerecorded) | AA | | An audio description track for prerecorded video |
| 1.3.1 | Info and Relationships | A | | Structure you convey visually exists in markup: headings, lists, `<th>`, `<fieldset>`, label association |
| 1.3.2 | Meaningful Sequence | A | | DOM order matches reading order; CSS reordering must not break it |
| 1.3.3 | Sensory Characteristics | A | | No instructions that rely only on shape, size, position, or sound ("the round button on the right") |
| 1.3.4 | Orientation | AA | | Do not lock to portrait or landscape unless essential |
| 1.3.5 | Identify Input Purpose | AA | | `autocomplete` tokens on common fields (`name`, `email`, `tel`, address parts) |
| 1.4.1 | Use of Color | A | | Color is never the only carrier of meaning; body-text links need a non-color cue |
| 1.4.2 | Audio Control | A | | Audio over 3s has a pause/stop control or independent volume |
| 1.4.3 | Contrast (Minimum) | AA | | 4.5:1 text, 3:1 large text — in light **and** dark mode |
| 1.4.4 | Resize Text | AA | | Text scales to 200% without loss; relative units, no fixed-height text boxes |
| 1.4.5 | Images of Text | AA | | Real text, not pictures of text (logos excepted) |
| 1.4.10 | Reflow | AA | | No horizontal scroll at 320 CSS px wide (= 400% zoom of a 1280px viewport) |
| 1.4.11 | Non-text Contrast | AA | | 3:1 for control boundaries, focus rings, icons, meaningful graphics |
| 1.4.12 | Text Spacing | AA | | No loss when users override line-height 1.5, paragraph 2em, letter 0.12em, word 0.16em |
| 1.4.13 | Content on Hover or Focus | AA | | Hover/focus popups are dismissible, hoverable, and persistent |

### 2. Operable

| SC | Name | Lvl | | What it means when you are writing code |
|---|---|---|---|---|
| 2.1.1 | Keyboard | A | | Every function works from the keyboard alone |
| 2.1.2 | No Keyboard Trap | A | | Focus can always leave a component by keyboard |
| 2.1.4 | Character Key Shortcuts | A | | Single-key shortcuts can be disabled, remapped, or fire only when the control has focus |
| 2.2.1 | Timing Adjustable | A | | Time limits can be turned off, adjusted, or extended |
| 2.2.2 | Pause, Stop, Hide | A | | Motion or auto-updating content over 5s can be paused, stopped, or hidden |
| 2.3.1 | Three Flashes or Below Threshold | A | | Nothing flashes more than three times per second |
| 2.4.1 | Bypass Blocks | A | | A skip link, or landmarks plus headings, to jump past repeated navigation |
| 2.4.2 | Page Titled | A | | Every page and route has a unique, descriptive `<title>` |
| 2.4.3 | Focus Order | A | | Tab order is meaningful; dialogs and inserted content receive focus where expected |
| 2.4.4 | Link Purpose (In Context) | A | | Link text says where it goes; "read more" needs context or a fuller accessible name |
| 2.4.5 | Multiple Ways | AA | | More than one route to a page: nav, search, sitemap |
| 2.4.6 | Headings and Labels | AA | | Headings and labels actually describe what follows |
| 2.4.7 | Focus Visible | AA | | A visible focus indicator on every keyboard-focusable element |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | `2.2` | Sticky headers, footers, and cookie bars must not entirely hide the focused element |
| 2.5.1 | Pointer Gestures | A | | Pinch/swipe/path gestures have a single-pointer alternative |
| 2.5.2 | Pointer Cancellation | A | | Act on pointer-up, not pointer-down; allow abort by moving away |
| 2.5.3 | Label in Name | A | | The visible label text is contained in the accessible name |
| 2.5.4 | Motion Actuation | A | | Shake/tilt triggers have a UI equivalent and can be disabled |
| 2.5.7 | Dragging Movements | AA | `2.2` | Every drag interaction has a single-pointer alternative |
| 2.5.8 | Target Size (Minimum) | AA | `2.2` | Targets >= 24x24 CSS px, or spaced so a 24px circle does not overlap a neighbour |

### 3. Understandable

| SC | Name | Lvl | | What it means when you are writing code |
|---|---|---|---|---|
| 3.1.1 | Language of Page | A | | `<html lang="en">` — trivially emitted, still missing on 13.5% of pages |
| 3.1.2 | Language of Parts | AA | | Mark inline language changes with `lang` |
| 3.2.1 | On Focus | A | | Focusing something never changes context (no auto-submit, no popup on focus) |
| 3.2.2 | On Input | A | | Changing a value never changes context unless the user was warned first |
| 3.2.3 | Consistent Navigation | AA | | Repeated navigation keeps the same relative order across pages |
| 3.2.4 | Consistent Identification | AA | | The same function gets the same name and icon everywhere |
| 3.2.6 | Consistent Help | A | `2.2` | Help mechanisms appear in the same relative order on every page that has them |
| 3.3.1 | Error Identification | A | | Errors are described in text and name the field — not just a red border |
| 3.3.2 | Labels or Instructions | A | | Inputs have labels; required formats stated up front, not only after failure |
| 3.3.3 | Error Suggestion | AA | | Suggest a correction when you can determine one |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | | Consequential submissions are reversible, checked, or confirmed |
| 3.3.7 | Redundant Entry | A | `2.2` | Do not ask for the same information twice in one process — auto-fill or offer it for selection |
| 3.3.8 | Accessible Authentication (Minimum) | AA | `2.2` | No cognitive-function test in login without an alternative; allow paste and password managers |

### 4. Robust

| SC | Name | Lvl | | What it means when you are writing code |
|---|---|---|---|---|
| 4.1.2 | Name, Role, Value | A | | Every control exposes an accessible name, the correct role, and its current state |
| 4.1.3 | Status Messages | AA | | Status changes that do not move focus are announced via `role="status"` / `role="alert"` |

Understanding documents live at
`https://www.w3.org/WAI/WCAG22/Understanding/<slug>`, where the slug is the
criterion name lowercased and hyphenated — `non-text-content`,
`contrast-minimum`, `name-role-value`, `status-messages`. When unsure, start
from the [Understanding index](https://www.w3.org/WAI/WCAG22/Understanding/).

---

## The 9 criteria new in WCAG 2.2

Six are at A/AA and therefore obligations; three are AAA. These are the ones
generated code misses most reliably, because most training data predates them.

**2.4.11 Focus Not Obscured (Minimum) — AA.** When an element receives keyboard
focus, no author-created content may hide it entirely. The usual culprits are
sticky headers, sticky footers, cookie banners, and chat widgets. Fix with
`scroll-margin-top` matching the sticky header height on focusable elements, and
by giving overlays a real close control.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)

**2.4.12 Focus Not Obscured (Enhanced) — AAA.** As above, but *no part* of the
focused element may be obscured.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html)

**2.4.13 Focus Appearance — AAA.** The focus indicator must be at least as large
as a 2px-thick perimeter of the component and have at least 3:1 contrast between
focused and unfocused states. Useful as a design target even though it is AAA;
AA still requires a visible indicator via 2.4.7 and 3:1 via 1.4.11.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)

**2.5.7 Dragging Movements — AA.** Any functionality that uses a dragging
movement must also be operable with a single pointer without dragging. Sortable
lists need move-up/move-down buttons; sliders need clickable track and arrow
keys; kanban cards need a "move to" menu; drag-to-upload needs a file input.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

**2.5.8 Target Size (Minimum) — AA.** Pointer targets are at least 24x24 CSS px.
Exceptions: spacing (a 24px-diameter circle centred on the target overlaps no
other target's circle), inline targets inside a sentence, targets whose size is
browser-determined, and where a conforming equivalent exists elsewhere on the
page. Icon buttons at 16px and dense table-row action links are the common
failures. Note that axe-core's `target-size` rule is **disabled by default** and
has a documented false-positive history with overlapping and translucent
elements — `a11y-loop` enables it but reports it as needs-review, never as a
hard failure.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

**3.2.6 Consistent Help — A.** If a help mechanism (contact details, human
contact, a self-help link, an automated chat) repeats across pages, it must
appear in the same relative order in the page. It does not require that you
*provide* help — only that existing help is placed consistently.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html)

**3.3.7 Redundant Entry — A.** Information the user already supplied in the same
process is either auto-populated or available to select — no retyping an address
at step 4 that was entered at step 2. Exceptions: re-entry that is essential
(confirming a password), where the earlier information is no longer valid, or
for security. Multi-step checkout and signup wizards are the common failures.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)

**3.3.8 Accessible Authentication (Minimum) — AA.** No step in an
authentication process may require a cognitive function test (remembering a
password, transcribing characters, solving a puzzle, identifying objects in
images) unless there is an alternative, or a mechanism to assist. In practice:
never block paste into password or one-time-code fields, never disable password
managers, use `autocomplete="current-password"` / `one-time-code`, and offer a
non-puzzle option alongside any CAPTCHA. Object-recognition CAPTCHAs are
explicitly permitted only as the *alternative*, not as the sole path.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)

**3.3.9 Accessible Authentication (Enhanced) — AAA.** As above with the
object-recognition and personal-content exceptions removed.
[Understanding](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html)

---

## Contrast thresholds

| | Normal text | Large text | Non-text / UI |
|---|---|---|---|
| **AA** | **4.5:1** (SC 1.4.3) | **3:1** (SC 1.4.3) | **3:1** (SC 1.4.11) |
| AAA | 7:1 (SC 1.4.6) | 4.5:1 (SC 1.4.6) | — |

**Large text is 18pt regular or 14pt bold.** At the CSS default of 1pt =
1.333px that is **>= 24px regular, or >= 18.5px bold**. Get this boundary right:
it is the most common source of disagreement between contrast tools. A 20px
heading is *not* large text and needs 4.5:1.

SC 1.4.11 applies to the visual boundary of controls (input borders, button
edges, checkbox outlines), focus indicators, and graphics required to understand
content (chart lines, meaningful icons) — not to decorative graphics or to
inactive controls.

Reference math, matching browsers, axe-core, and the
[WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/):

```
c_srgb = c_8bit / 255
c      = c_srgb <= 0.04045 ? c_srgb / 12.92 : ((c_srgb + 0.055) / 1.055) ** 2.4
L      = 0.2126*R + 0.7152*G + 0.0722*B
ratio  = (L_lighter + 0.05) / (L_darker + 0.05)
```

Composite translucent foregrounds over their background in non-linear sRGB
*before* linearizing. Run `a11y-loop contrast <fg> <bg> [--large] [--ui] --fix`
rather than doing this by hand; `--fix` returns both a lighter and a darker
passing candidate with hue and chroma preserved.

**APCA is not a WCAG algorithm.** It was removed from the WCAG 3 draft in July
2023, and the April 2026 WCAG 3 editor's draft states the contrast algorithm is
"yet to be determined". APCA's technical critique of WCAG 2 is legitimate —
WCAG 2 overstates contrast for near-black pairs — but Lc values have no
normative or legal standing. Never let an APCA pass excuse a WCAG 2 failure.

## Related

- Choosing which of these a project targets, before the code: [plan-phase.md](plan-phase.md)
- ARIA and widget behavior: [apg-patterns.md](apg-patterns.md)
- What generated code gets wrong: [ai-failure-modes.md](ai-failure-modes.md)
- What none of this can check: [manual-testing.md](manual-testing.md)
