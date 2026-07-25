# Fixes applied — `demo/after/`

Same page. Same fictional event, same content, same teal-and-mint brand, same hero, schedule,
speaker grid, registration form and footer. What changed is that it works.

Two things are worth saying up front, because they are the demo's actual argument:

**The accessible version is the nicer version.** Body text went from 13px at 2.84:1 to 17px at
14.61:1. Fine print went from 10px to 15px. Tap targets went from 18×18 to 44×44. Line height went
from 1.45 to 1.6. Nothing here is a compliance tax paid in ugliness — the page is easier to read
for everyone, and the "before" page's cramped grey aesthetic was never a design choice worth
defending.

**Where the browser has a feature, we used the feature.** The `demo/before` modal is 30 lines of
hand-rolled JavaScript that gets focus trapping, Escape handling, focus return and backdrop
inertness wrong in five separate ways. The fix is not 60 more lines of correct JavaScript — it is
`<dialog>` and `showModal()`, which is *less* code. The same pattern holds throughout: `<button>`
instead of `div` + `onclick`, `<label for>` instead of `placeholder`, `<caption>` instead of a
heading that happens to sit above a table. Most of these fixes made the page shorter.

---

## Before → after mapping

| # | Before | After | Files |
|---|---|---|---|
| B1 | 30+ text pairs below 4.5:1, light and dark | Palette rebuilt; **lowest text ratio 6.51:1**, lowest non-text 4.57:1 (needs 3:1) | `style.css` |
| B2 | 6 `<img>` with no `alt` | `alt=""` on the six decorative avatars; one new map image with human-written descriptive `alt` | `index.html` |
| B3 | 8 placeholder-only controls | Every control has a `<label for>`; `<fieldset>`/`<legend>`, hints via `aria-describedby`, `autocomplete`, required marked in words | `index.html` |
| B4 | 2 icon-only links with no name | Each social link carries a `.visually-hidden` name; SVGs `aria-hidden` | `index.html` |
| B5 | Icon-only hamburger with no name | `<button>` with the visible word "Menu" plus `aria-expanded` and `aria-controls` | `index.html`, `app.js` |
| B6 | `<html>` with no `lang` | `<html lang="en-NZ">`, plus `lang="mi"` and `lang="da"` on inline foreign text | `index.html` |
| B7 | 10 clickable `<div>`s | Real `<button type="button">` and `<a href>` throughout; zero `onclick` attributes in the markup | `index.html`, `app.js` |
| B8 | `h1 → h3 → h5 → h6` | `h1 → h2 → h3`; day titles became `<caption>`; the `role="heading"` div became a real `<h3>` | `index.html` |
| B9 | `*:focus { outline: none }` | Two-tone `:focus-visible` ring at ≥5.69:1, with a `@supports` fallback and a hero variant | `style.css` |
| B10 | 6 ARIA defects | Dangling references deleted, `role="menu"` deleted, `aria-hidden` off the focusable link, `role="heading"` replaced by `<h3>`, dialog named | `index.html` |
| B11 | Hand-rolled modal, 8 defects | Native `<dialog>` + `showModal()` | `index.html`, `style.css`, `app.js` |
| B12 | 6 targets at 18×18 or 13×13 | 44×44 minimum on all icon controls, 48px on buttons and inputs, 24×24 on the checkbox | `style.css` |
| B13 | `width: 1180px`, `min-width: 880px` | Fluid `max-width` shell, `clamp()` type, `auto-fit` grid; table overflow confined to a labelled focusable region | `style.css`, `index.html` |
| B14 | Infinite ticker, no escape | `prefers-reduced-motion` block that removes the animation, plus a real pause button | `style.css`, `index.html`, `app.js` |
| B15 | "Click here" × 2, "Read more" × 2, "More info" | Every link names its destination | `index.html` |
| B16 | `tabindex="1"`, `"2"`, `"3"` | Removed; tab order is DOM order. The only `tabindex` left is `0` on the scrollable table regions | `index.html` |

---

## B1 — Contrast, verified arithmetically

Computed with the WCAG 2.x relative luminance formula
(`L = 0.2126R + 0.7152G + 0.0722B`, channels linearised at the 0.03928 threshold;
`ratio = (L_lighter + 0.05) / (L_darker + 0.05)`), then truncated to two decimals so the figures
match what the WebAIM Contrast Checker prints.

The target was **≥4.6:1 for body text** — a margin over the 4.5:1 requirement so later palette
tweaks do not silently cross the line. The result cleared it comfortably: the lowest text ratio
in the whole palette is **6.51:1**, roughly 45% of headroom above the requirement.

### Every token pair in both colour schemes

| Mode | Where | Foreground | Background | Ratio | Needs | Verdict |
|---|---|---|---|---|---|---|
| Light | Body text | `--ink` #1f2a33 | `--page` #ffffff | **14.61:1** | 4.5:1 | pass |
| Light | Body text on grey panels | `--ink` #1f2a33 | `--surface` #f2f5f7 | **13.34:1** | 4.5:1 | pass |
| Light | Section + caption headings | `--ink` #1f2a33 | `--tint` #e9f5f2 | **13.08:1** | 4.5:1 | pass |
| Light | Secondary text, hints, fine print | `--muted` #4a5a66 | `--page` #ffffff | **7.12:1** | 4.5:1 | pass |
| Light | Secondary text on panels | `--muted` #4a5a66 | `--surface` #f2f5f7 | **6.51:1** | 4.5:1 | pass |
| Light | Links | `--link` #0b5a52 | `--page` #ffffff | **8.08:1** | 4.5:1 | pass |
| Light | Links on panels | `--link` #0b5a52 | `--surface` #f2f5f7 | **7.38:1** | 4.5:1 | pass |
| Light | Primary button label | #ffffff | `--brand` #0d6157 | **7.33:1** | 4.5:1 | pass |
| Light | "(required)" marker | `--accent` #9e2a14 | `--page` #ffffff | **7.51:1** | 4.5:1 | pass |
| Light | Input + button borders (1.4.11) | `--border` #5d6d78 | `--page` #ffffff | **5.35:1** | 3:1 | pass |
| Light | Input borders on panels (1.4.11) | `--border` #5d6d78 | `--surface` #f2f5f7 | **4.88:1** | 3:1 | pass |
| Light | Focus ring (1.4.11) | `--focus` #0a5cc7 | `--page` #ffffff | **6.23:1** | 3:1 | pass |
| Light | Focus ring on panels (1.4.11) | `--focus` #0a5cc7 | `--surface` #f2f5f7 | **5.69:1** | 3:1 | pass |
| Hero | Heading + hero button label | `--hero-ink` #ffffff | `--hero-from` #0b3b36 | **12.40:1** | 4.5:1 | pass |
| Hero | Heading at the far gradient stop | `--hero-ink` #ffffff | `--hero-to` #0e4a57 | **9.83:1** | 4.5:1 | pass |
| Hero | Kicker, sub-heading, note | `--hero-muted` #d6f3ee | `--hero-from` #0b3b36 | **10.58:1** | 4.5:1 | pass |
| Hero | Kicker at the far gradient stop | `--hero-muted` #d6f3ee | `--hero-to` #0e4a57 | **8.38:1** | 4.5:1 | pass |
| Hero | Mint CTA label | `--hero-cta-ink` #0b3b36 | `--hero-cta` #7fe3d4 | **8.17:1** | 4.5:1 | pass |
| Hero | Mint CTA against the hero (1.4.11) | `--hero-cta` #7fe3d4 | `--hero-from` #0b3b36 | **8.17:1** | 3:1 | pass |
| Hero | Hero focus ring (1.4.11) | `--hero-focus` #eaf6ff | `--hero-from` #0b3b36 | **11.29:1** | 3:1 | pass |
| Hero | Hero focus ring at far stop (1.4.11) | `--hero-focus` #eaf6ff | `--hero-to` #0e4a57 | **8.95:1** | 3:1 | pass |
| Dark | Body text | `--ink` #e8eef4 | `--page` #101820 | **15.31:1** | 4.5:1 | pass |
| Dark | Body text on panels | `--ink` #e8eef4 | `--surface` #18222c | **13.77:1** | 4.5:1 | pass |
| Dark | Table captions | `--ink` #e8eef4 | `--tint` #12303a | **11.90:1** | 4.5:1 | pass |
| Dark | Secondary text, hints, fine print | `--muted` #a9bac7 | `--page` #101820 | **8.97:1** | 4.5:1 | pass |
| Dark | Secondary text on panels | `--muted` #a9bac7 | `--surface` #18222c | **8.07:1** | 4.5:1 | pass |
| Dark | Links | `--link` #5fd9c7 | `--page` #101820 | **10.42:1** | 4.5:1 | pass |
| Dark | Links on panels | `--link` #5fd9c7 | `--surface` #18222c | **9.38:1** | 4.5:1 | pass |
| Dark | Primary button label | `--on-brand` #08131a | `--brand` #5fd9c7 | **10.94:1** | 4.5:1 | pass |
| Dark | "(required)" marker | `--accent` #ff9a80 | `--page` #101820 | **8.67:1** | 4.5:1 | pass |
| Dark | Input + button borders (1.4.11) | `--border` #7a8b96 | `--page` #101820 | **5.07:1** | 3:1 | pass |
| Dark | Input borders on panels (1.4.11) | `--border` #7a8b96 | `--surface` #18222c | **4.57:1** | 3:1 | pass |
| Dark | Focus ring (1.4.11) | `--focus` #9fc7ff | `--page` #101820 | **10.30:1** | 3:1 | pass |
| Dark | Focus ring on panels (1.4.11) | `--focus` #9fc7ff | `--surface` #18222c | **9.26:1** | 3:1 | pass |

**34 pairs, 34 passes.** Lowest text ratio 6.51:1 against a 4.5:1 requirement. Lowest non-text
ratio 4.57:1 against a 3:1 requirement.

### Two judgement calls in this table

**The hero focus ring is measured against the hero background, not against the button.**
`--hero-focus` #eaf6ff against the mint CTA #7fe3d4 is only 1.38:1, which would be a real problem
if the ring sat directly on the button. It does not. The ring is drawn with `outline-offset: 2px`
and a 2px `box-shadow` filled with the hero's own colour, so there is always a band of #0b3b36
between the button edge and the ring. The ring's neighbour is the hero background, at 11.29:1.
That is what the two-tone construction is for, and it is why the same ring works over a white
page, a grey panel and a dark gradient without needing per-component overrides.

**Dark mode reuses the hero tokens unchanged.** `--hero-from`, `--hero-to`, `--hero-ink`,
`--hero-cta` and `--hero-focus` are declared once in `:root` and not redefined in the dark block,
because the hero is already dark in both schemes. Fewer tokens to keep in sync, and one less place
for the two schemes to drift apart.

### Why axe will still report the hero as `incomplete`

Checked against the installed axe-core 4.12.1 source, not assumed. `elementHasImage()` treats any
`background-image` — `linear-gradient()` included — as undeterminable, sets the incomplete reason
to `bgGradient`, and `getBackgroundColor()` returns `null`. The `color-contrast` check then returns
`undefined`, which axe reports as **incomplete**, never as pass or fail.

So on both pages, every element whose background stack reaches `.hero` comes back as needs-review:
`.hero h1`, `.hero-sub`, `.kicker`, `.hero-note`, and `.btn-ghost` (whose own background is
`transparent`, so the stack walk continues past it to the gradient). In `demo/before` that means
the page's most glaring contrast failure — white text at 1.41:1 — is not reported as a violation.
In `demo/after` it means the hero's genuine 8.38:1–12.40:1 ratios are not reported as passes either.

The one hero control that *is* evaluated normally is the mint CTA: `.hero .btn-primary` sets an
opaque `background`, so axe's background walk stops at the button itself (`alpha === 1`) and never
reaches the gradient. It is judged against #7fe3d4 and passes at 8.17:1. The same mechanic makes
`demo/before`'s mint button a genuine violation at 2.19:1 rather than an incomplete — which is
useful, since it means the `color-contrast` violation assertion has something in the hero region
to bind to on the before page.

Consequences worth being explicit about:

- **The correct assertion for this page is "zero `color-contrast` violations", not "zero
  `color-contrast` results".** Integration tests should expect a non-empty `needsReview` list here.
- The hero's ratios were established the only way they can be — arithmetically, from the declared
  gradient stops, in the table above. a11y-loop's own contrast pass does the same thing, evaluating
  text against each declared stop.
- This is the concrete case for surfacing axe's `incomplete` results rather than hiding them. Suppress
  them and this page looks fully verified when six of its most prominent elements were never judged.

---

## B2 — Images

Six speaker avatars are now `alt=""`. That is the *correct* fix, and it is a judgement call an
automated fixer would get wrong: the avatars are generic placeholder silhouettes, and each
speaker's name and role sit right next to the image in real text inside the same link. Giving them
`alt="Aroha Kingi"` would make a screen reader read the name twice for every card. The image
carries no information, so it takes an empty alt and drops out of the accessibility tree.

One image *does* get real alt text — the new venue map:

```
alt="Simplified map: the venue sits on Cable Street between Wakefield Street to the
     north-west and the waterfront to the south-east, with the railway station about
     ten minutes' walk north."
```

That sentence was written by a person who knew what the map was for. It is included precisely to
make the contrast with the avatars visible: same rule, same page, opposite correct answers,
decided by what the image is doing rather than by what the markup looks like. This is why
generated alt text has to be marked as draft and confirmed by a human — no rule engine can tell
these two cases apart.

All decorative SVGs carry `aria-hidden="true"` and `focusable="false"` (the latter for IE/Edge
legacy behaviour where SVGs could become tab stops).

---

## B3 — Form labels

Every one of the eight controls now has a real `<label for>` pointing at a real `id`. Beyond the
minimum:

- `<fieldset>` + `<legend>Your details</legend>` groups the related fields.
- Required fields say **"(required)"** in words, coloured with `--accent` at 7.51:1. The word
  carries the meaning, so colour is never the only cue (SC 1.4.1).
- Optional fields say "(optional)" rather than leaving the user to guess.
- Hints are separate `<p>` elements referenced with `aria-describedby`, so they are announced
  after the label instead of replacing it.
- `autocomplete="name"`, `"email"`, `"organization"` — SC 1.3.5, and it makes the form faster for
  everybody.
- The select's first option is `value=""` reading "Choose a ticket type", so an unmade choice is
  distinguishable from a made one.
- The checkbox has a real `<label for="reg-news">`, which also gives it a 24px+ clickable label
  area instead of a 13px box.
- `role="status"` on an empty `<p>` that is already in the DOM at load, so submission feedback is
  announced without moving focus.

The placeholder attributes are gone entirely rather than kept alongside the labels. A visible
label plus a placeholder duplicating it is noise, and the placeholder was the thing failing at
1.58:1.

---

## B4 / B5 — Accessible names for icon controls

The hamburger became a `<button type="button">` with the **visible word "Menu"** next to the icon.
Given the choice between an icon-only button with an `aria-label` and an icon-with-text button, the
second is better for everyone — the icon-only version is a small usability failure for sighted
users too, it just does not show up in an audit. It also gained `aria-expanded` and
`aria-controls="primary-nav"`, and the stylesheet keys the menu's visibility off
`[aria-expanded="true"]` so the announced state and the visual state are the same fact.

The three footer social links keep their icons and gain `.visually-hidden` names that say where
they go — "Aotearoa Web Summit on Mastodon", not "Mastodon". Names, not `title` attributes:
`title` is not reliably announced and never shows on touch.

`.visually-hidden` uses the `clip-path: inset(50%)` form rather than `display: none` or
`text-indent: -9999px`, so the text stays in the accessibility tree and does not affect layout.

---

## B6 — Language

`<html lang="en-NZ">`. The regional subtag is correct for the content and costs nothing.

The inline-language gap flagged as advisory in `VIOLATIONS.md` is fixed too, which no automated
rule asked for: `<span lang="mi">` on Te Reo Māori proper nouns (`mihi whakatau`,
`Te Rōpū Manaaki`, `Rangimārie`, `Kōwhai`, `Tūrangi`, `Mahi`, `Pipiwharauroa`, `Kia ora`) and
`<span lang="da">` on `Sørensen`, so a screen reader switches pronunciation model instead of
reading Māori vowels as English ones. That is SC 3.1.2 Language of Parts, and on a New Zealand
conference site it is the difference between a name being said and a name being mangled.

---

## B7 — Real interactive elements

Zero `onclick` attributes and zero clickable `<div>`s remain. The markup contains no inline event
handlers at all; `app.js` attaches everything with `addEventListener`.

| Before | After |
|---|---|
| `<div class="btn" onclick="openRegister()">` | `<button type="button" id="registerTrigger">` |
| `<div class="btn" onclick="openRegister()">` (form) | `<button type="submit">` |
| `<div class="btn" onclick="closeRegister()">` (pay) | `<button type="submit">` inside the dialog form |
| `<div class="modal-close" onclick="…">×</div>` | `<button type="button">` with an SVG and a hidden name |
| `<div class="speaker-card" onclick="…">` × 6 | `<li><a class="speaker-card" href="…">` |

The speaker cards are the interesting conversion. They became links wrapping the image and both
text spans, so each card's accessible name is "Aroha Kingi Principal Engineer, Kōwhai Digital" —
focusable, activatable with Enter, announced with its purpose, and listed usefully in a screen
reader's link list. The grid became a `<ul>` so the count is announced. No ARIA was needed for any
of it: the elements that already mean these things were used instead.

---

## B8 — Heading structure

The outline is now `h1` (hero) → `h2` × 7 (Supported by, Programme, Speakers, Venue, Sponsors,
Register, and the dialog title) → `h3` (Getting here). No level is skipped, and no level was
chosen for its size — `.section-title` sets `font-size: clamp(1.5rem, 3.5vw, 2rem)` on `h2`
elements, so appearance is the stylesheet's job.

Two structural changes did more than renumber things:

- **The day titles became `<caption>` elements.** `<h5>Day One</h5>` followed by a table was a
  heading pretending to be a table label. A `<caption>` *is* the table's label, is announced when
  a screen reader enters the table, and doubles as the `aria-labelledby` target for the scroll
  region. One element, three jobs, and one fewer heading level to get wrong.
- **`<div role="heading">` became `<h3>`.** The ARIA version needed `aria-level` to be valid at
  all (B10e). The HTML version needs nothing.

---

## B9 — Visible focus

```css
:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--focus-halo);   /* halo = --page */
  border-radius: 4px;
}
```

Three deliberate properties:

- **`:focus-visible`, not `:focus`** — keyboard users get the ring, mouse users do not get one on
  click. This is the reason `outline: none` gets written in the first place, so removing the
  motivation matters more than removing the line.
- **A `@supports not selector(:focus-visible)` fallback** applying the same ring to plain `:focus`.
  Older browsers get a slightly over-eager indicator rather than none.
- **The `--focus-halo` band**, filled with the page colour, sitting in the 2px offset. It
  guarantees the ring's neighbour is the page background whatever the control is filled with, so
  one rule holds at ≥3:1 everywhere. `.hero :focus-visible` swaps in the light ring and the hero's
  own halo colour; that is the only override needed on the page.

Plus a `@media (forced-colors: active)` block that redraws the ring in `CanvasText` and restores
control borders in `ButtonBorder`. Windows High Contrast replaces author colours wholesale, and
focus rings and control boundaries are the two things that most often vanish when it does.

And a skip link — `<a class="skip-link" href="#main">Skip to main content</a>`, off-screen until
focused, then sliding into the top-left corner. SC 2.4.1, which `demo/before` had no answer to at
all. Worth knowing: axe's `region` rule specifically exempts a skip link whose `href` resolves to
an element on the page, so this does not create a new regionless-content finding.

---

## B10 — ARIA removed rather than repaired

Five of the six ARIA defects were fixed by **deleting ARIA**, which is the point. "No ARIA is
better than bad ARIA", and the four rules of ARIA use start with "if you can use a native HTML
element, do so."

| Before | After | Why |
|---|---|---|
| `<nav aria-labelledby="primary-nav-heading">` → nowhere | `<nav aria-label="Main">` | A label with no target is worse than no label. `aria-label` needs no ID to keep in sync. |
| `<section id="register" aria-labelledby="register-heading">` → nowhere | same attribute, and the `<h2>` now actually carries `id="register-heading"` | The reference was right; the target was never written. Every `aria-labelledby` on the page now resolves. |
| `<ul role="menu">` | plain `<ul>` inside `<nav>` | `role="menu"` is for application menus and commits you to the whole APG keyboard contract. These are page links. The role was a promise nothing kept. |
| `aria-hidden="true"` on a focusable `<a>` | attribute removed, real accessible name added | Rule 4 of the four rules: never `aria-hidden` a focusable element. It creates a tab stop that announces nothing. |
| `<div role="heading">` with no `aria-level` | `<h3>` | Native heading, correct level, zero attributes. |
| `role="dialog"` with no accessible name | native `<dialog aria-labelledby="registerDialogTitle">` | The name now points at a real `<h2>`. |

The ARIA that remains is only what HTML cannot express: `aria-expanded` and `aria-controls` on the
menu button, `aria-pressed` on the ticker toggle, `aria-label` on the two `<nav>` landmarks,
`aria-labelledby` on the sections and the dialog, `aria-describedby` on the fields with hints,
`role="status"` on the two live status paragraphs, `role="region"` on the scrollable tables, and
`aria-hidden` on decorative SVGs and the duplicated ticker copy. Every ID reference resolves to an
element that exists.

---

## B11 — The dialog

`demo/before` hand-rolled a modal from a `<div>` and got eight things wrong. `demo/after` uses
`<dialog>` and `showModal()`, and most of those eight stop being our code's problem:

| Before defect | After | Whose job now |
|---|---|---|
| No focus moved in on open | `showModal()` moves focus in; `app.js` then focuses the first field per APG guidance for form dialogs | platform + 3 lines |
| No focus trap | `showModal()` traps focus in the top layer | platform |
| `Escape` ignored | `showModal()` handles `Escape` | platform |
| No focus return | platform restores focus to the trigger; a `close` listener re-asserts it if focus ended up on `<body>` | platform + guard |
| Background not inert | `showModal()` makes the rest of the document inert | platform |
| Backdrop was a hand-rolled `<div>` | `.modal::backdrop` | platform |
| Close was `<div onclick>` with a `×` glyph | `<button type="button">` with an SVG and "Close registration dialog" as a hidden name, 44×44 | ours |
| `role="dialog"`, no name, no `aria-modal` | `<dialog aria-labelledby="registerDialogTitle">` — implicit `role="dialog"`, and `showModal()` implies modality | ours |

The `<dialog>` also fixes the dialog-hidden instances of five other classes at the same time: its
two inputs now have labels (B3), the pay button is a real `<button>` (B7), the close target is
44×44 (B12), "Read more" became "Read our payment and refund terms" (B15), and its text uses the
new palette (B1).

The backdrop still closes on click, which is a mouse convenience — but `Escape` covers the
keyboard, so no function is mouse-only.

There is a small `typeof dialog.showModal === 'function'` guard falling back to the `open`
attribute. It is not a real polyfill and does not pretend to be; it just means the content is
reachable rather than invisible on an ancient browser.

---

## B12 — Target sizes

| Element | Before | After |
|---|---|---|
| Menu button | 18 × 18 | `min-height: 44px` + padding + a text label |
| Social links | 18 × 18 | `min-width/height: 44px` |
| Dialog close | 18 × 18 | `min-width/height: 44px` |
| Checkbox | 13 × 13 | `24 × 24`, plus a clickable `<label>` |
| Buttons | ~34px tall | `min-height: 48px` |
| Inputs | ~33px tall | `min-height: 48px` |
| Nav links | ~15px tall | `min-height: 44px` via flex + padding |

44px rather than the 24px minimum for anything icon-shaped. SC 2.5.8 asks for 24×24; 44×44 is the
long-standing platform guidance, it removes any need to reason about the SC's spacing and inline
exceptions, and it is simply easier to hit. The checkbox is the one element left at exactly 24×24,
because a checkbox larger than its own label text looks wrong — and its `<label>` gives it a much
bigger effective target anyway.

---

## B13 — Reflow

Every fixed dimension is gone.

| Before | After |
|---|---|
| `.container { width: 1180px }` | `width: 100%; max-width: 1120px; padding: 0 clamp(1rem, 4vw, 2rem)` |
| `.schedule { min-width: 880px }` | `min-width: 34rem` inside `.table-scroll { overflow-x: auto }` |
| `.speaker-grid` fixed 6 columns | `repeat(auto-fit, minmax(7.5rem, 1fr))` — 2 columns at 320px, 6 at desktop |
| `h1 { font-size: 44px }` | `clamp(2rem, 6vw, 3.25rem)` |
| `.field-row { display: flex }` with no wrap | `flex-wrap: wrap` with `flex: 1 1 15rem` children that stack |
| No width media queries at all | One at `47.5rem` for the collapsing nav |

Checked at 320px: container padding resolves to 16px, leaving 288px. The speaker grid fits two
120px columns plus a 20px gap (260px). The longest unbreakable heading token, "Web&nbsp;Summit" at
32px, is about 175px. `overflow-wrap: break-word` on `body` catches anything unforeseen.

**The tables are the interesting decision.** A schedule with four columns genuinely needs
two-dimensional layout, and SC 1.4.10 exempts exactly that. Restacking it into cards with
`display: block` would destroy the row/column relationships that make it navigable by screen
reader — a worse outcome dressed up as a responsive one. So the table keeps its semantics and its
`min-width`, and the overflow is confined to a wrapper that is:

- `overflow-x: auto`, so the **document** never scrolls sideways even though the table does;
- `role="region"` with `aria-labelledby` pointing at the table's `<caption>`, so it is announced
  as a named region rather than an unexplained scrolling box;
- `tabindex="0"`, so it can be scrolled with the keyboard (this is also what axe's
  `scrollable-region-focusable` rule requires).

Also upgraded while in there: the time column became `<th scope="row">`, so each cell is announced
with both its column and its row header.

---

## B14 — Motion

Three layers, because a media query alone is not enough for SC 2.2.2:

1. **A real control.** `<button aria-pressed="false">Pause sponsor scroll</button>` toggling
   `animation-play-state: paused`. SC 2.2.2 (Level A) requires a way to pause auto-starting motion
   that runs longer than five seconds, and it requires it regardless of OS settings. Per APG, the
   label stays constant and `aria-pressed` carries the state, so the button never renames itself
   under the user's cursor.
2. **A `prefers-reduced-motion: reduce` block** that sets `animation: none !important` and
   `transform: none` on the track, collapses transitions globally, and hides the duplicated ticker
   copy that only existed to make scrolling loop seamlessly. The animation is *removed*, not
   slowed, so a behavioural check can confirm the element has genuinely stopped moving rather than
   trusting that a media query exists.
3. **State sync in JS.** `matchMedia('(prefers-reduced-motion: reduce)')` is read on load and
   watched for changes, setting `aria-pressed="true"` when motion is reduced — so the button never
   reports "not paused" while nothing is moving.

The animation itself also slowed from 16s to 26s, which is gentler for vestibular sensitivity and
easier to read.

---

## B15 — Link text

| Before | After |
|---|---|
| "Click here" (group rates) | "See group booking rates" |
| "Read more" (programme) | "Read the full session descriptions" |
| "More info" (speakers) | "See all 24 speakers" |
| "Click here" (venue map) | "Open the venue map and access information" |
| "Read more" (payment) | "Read our payment and refund terms" |

Each one now says where it goes when read on its own. The speaker cards changed in the same
direction: their accessible name is the speaker's name and role rather than an unnamed clickable
region.

---

## B16 — Tab order

All three positive `tabindex` values are gone. Tab order is DOM order, which is also visual order.
The only `tabindex` left on the page is `tabindex="0"` on the two scrollable table regions, which
adds a stop without reordering anything.

---

## What this page does not prove

Kept in the same register as the tool's own reports, because the demo should not overclaim where
the tool must not.

`demo/after` is expected to produce **zero axe-core violations across all five passes** — default,
dark, forced-colors, reduced-motion, and 320×256 — with the dialog exercised. That statement has
three limits worth naming:

- **Zero violations is not zero results.** The hero's six gradient-backed elements come back as
  `incomplete` on every run, by design, for the reasons in B1. A report showing "no violations"
  while quietly dropping those is the exact failure mode this project exists to argue against.
- **Zero automatically detectable failures is not conformance.** Automated rules cover a minority
  of WCAG success criteria. This page has not been tested with NVDA, JAWS, VoiceOver or TalkBack,
  and it has not been used by anyone who relies on assistive technology.
- **Several fixes here are unverifiable by machine and were judgement calls.** Whether `alt=""`
  is right for the avatars, whether the venue map's alt text is actually useful, whether
  "See group booking rates" is descriptive enough, whether the reading level suits the audience,
  whether the dialog's initial focus lands where a user would expect — every one of these was
  decided by reading the page and thinking about it. A rule engine can tell you the attribute is
  present. It cannot tell you the sentence is good.
