# Accessibility failure modes of generated UI code

These are not edge cases. They are what the training data contains, so they are
what gets generated unless you actively resist them.

- 84% of LLM-generated websites in a controlled study had accessibility issues
  ([W4A'24](https://doi.org/10.1145/3677846.3677854)).
- Accessibility-oriented *prompts alone* produced a slightly **worse** violation
  rate than agnostic prompts — 17.32% vs 15.93%
  ([W4A'25](https://doi.org/10.1145/3744257.3744266)). Instructions without
  verification do not work.
- "Bad patterns are not edge cases in the training set. They *are* the training
  set." — Simon Miner (IAAP), *AI-Generated Code is Inaccessible by Default*.
- **Broken ARIA references**, hallucinated image descriptions, and misleading
  compliance claims are documented as *emergent, LLM-specific* failure modes
  (arXiv:2605.13873, a 2026 review of 33 studies).

---

## 1. The clickable div — SC 2.1.1 (A), 4.1.2 (A)

```html
<!-- WRONG --> <div class="btn" onclick="submit()">Save</div>
<!-- RIGHT --> <button type="button" class="btn" onclick="submit()">Save</button>
```

A `div` is not focusable, is not announced as a control, ignores Enter and Space,
and has no disabled state. `role="button"` plus `tabindex="0"` plus two key
handlers reproduces perhaps half of what `<button>` already does. Set `type`
explicitly — a `<button>` in a form defaults to `submit`.

## 2. Icon-only control with no accessible name — SC 4.1.2 (A), 2.4.4 (A)

Empty buttons appear on 30.6% of home pages and empty links on 46.3%,
overwhelmingly because of this.

```html
<!-- WRONG -->
<button><svg><path d="..."/></svg></button>
<a href="/cart"><i class="icon-cart"></i></a>
<!-- RIGHT -->
<button aria-label="Close dialog"><svg aria-hidden="true"><path d="..."/></svg></button>
<a href="/cart"><span class="sr-only">Cart</span><i class="icon-cart" aria-hidden="true"></i></a>
```

Otherwise it announces as "button" with no name — unusable by voice control,
meaningless to a screen reader. Hide the decorative glyph so it cannot leak junk
into the name.

## 3. Placeholder as label — SC 1.3.1 (A), 3.3.2 (A), 4.1.2 (A)

Missing form labels appear on 51.0% of home pages.

```html
<!-- WRONG -->
<input type="email" placeholder="Email address">
<!-- RIGHT -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email">
```

A placeholder vanishes as soon as typing starts, is usually low contrast, is not
reliably announced, and leaves the field nameless once filled. `autocomplete`
also earns SC 1.3.5. If the design forbids a visible label use `aria-label` — but
a visible label is the better interface for everyone.

## 4. Skipped heading levels — SC 1.3.1 (A), 2.4.6 (AA)

```html
<!-- WRONG --> <h1>Pricing</h1> <h4 class="text-sm font-semibold">Starter</h4>
<!-- RIGHT --> <h1>Pricing</h1> <h2 class="text-sm font-semibold">Starter</h2>
```

Generated markup picks the level by visual size, breaking the outline screen
reader users navigate by. Pick the level from the outline; set size in CSS.

## 5. `outline: none` with no replacement — SC 2.4.7 (AA), 1.4.11 (AA)

```css
/* WRONG */ button:focus, a:focus, input:focus { outline: none; }
/* RIGHT */ :focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
```

Removing the outline makes the interface unusable by keyboard while looking fine
in a screenshot. `:focus-visible` shows the ring for keyboard use only. Confirm
the ring reaches 3:1 against its surroundings — including dark mode and forced
colors, where hard-coded ring colors disappear (use `currentColor` or
`Highlight`).

## 6. Broken ARIA references — SC 1.3.1 (A), 4.1.2 (A)

An id is referenced that was never rendered, was renamed, or is duplicated across
component instances.

```html
<!-- WRONG -->
<input aria-labelledby="email-label" aria-describedby="email-hint">
<span id="emailLabel">Email</span>
<!-- RIGHT -->
<span id="email-label">Email</span>
<input id="email" aria-labelledby="email-label" aria-describedby="email-hint">
<p id="email-hint">We only use this to send your receipt.</p>
```

A dangling reference is silently ignored, so the control ends up with **no**
name — worse than writing nothing, because it looks handled. In a component
rendered more than once per page, ids must be per-instance (`useId()`, a counter,
a prop), never hard-coded. Grep your diff: every `aria-labelledby`,
`aria-describedby`, `aria-controls`, `aria-owns`, and `for=` must resolve to one
element in the rendered page.

## 7. `aria-hidden` on something focusable — SC 1.3.1 (A), 4.1.2 (A)

Rule 4 of the four rules of ARIA use forbids this outright.

```html
<!-- WRONG -->
<button aria-hidden="true">Skip</button>
<div class="offscreen-menu" aria-hidden="true"><a href="/help">Help</a></div>
<!-- RIGHT -->
<button hidden>Skip</button>
<div class="offscreen-menu" inert hidden><a href="/help">Help</a></div>
```

`aria-hidden` removes an element from the accessibility tree but leaves it in the
tab order, so focus lands on something that announces nothing at all. Use
`hidden`, `display: none`, or `inert` — something that removes it from both.

## 8. A role whose behavior was never implemented — SC 2.1.1 (A), 4.1.2 (A)

"A role is a promise" (APG *Read Me First*).

```html
<!-- WRONG -->
<div role="tab" aria-selected="true">Overview</div>
<div role="tab">Billing</div>
<!-- RIGHT: implement the whole contract, or don't claim the role -->
<div role="tablist">
  <button role="tab" id="t1" aria-selected="true" aria-controls="p1" tabindex="0">Overview</button>
  <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabindex="-1">Billing</button>
</div>
<!-- plus arrow-key roving focus, Home/End, and aria-selected kept in sync -->
```

`role="tab"` promises the arrow-key contract, roving tabindex, a `tablist`
parent, and linked panels. ARIA creates no behavior — the role only changes what
is announced, so an unimplemented contract produces a control that says it works
one way and works another. Contracts in [apg-patterns.md](apg-patterns.md); if
you cannot implement one, use links, buttons, or a disclosure.

## 9. Missing document language — SC 3.1.1 (A)

Still missing on 13.5% of home pages, and free to fix.

```html
<!-- WRONG --> <html>
<!-- RIGHT --> <html lang="en">
```

Without it, screen readers use the user's default voice, so English content may
be read with, say, German phoneme rules. Mark inline language changes with `lang`
too (SC 3.1.2).

## 10. Animation that ignores reduced motion — SC 2.2.2 (A)

```css
/* WRONG */ .card { animation: slide-in 600ms ease-out; }
/* RIGHT */
.card { animation: slide-in 600ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .card { animation: none; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Generated code adds motion enthusiastically and the media query almost never.
Reduce it genuinely — a global reset that a later rule overrides is worse than
none — and verify under the reduced-motion pass of the audit. This also matters
beyond WCAG: unwanted motion triggers vestibular symptoms.

## 11. Focus lost on SPA route change — SC 2.4.3 (A), 4.1.3 (AA)

```jsx
// WRONG
function Route({ children }) { return <main>{children}</main>; }
// RIGHT
function Route({ title, children }) {
  const h = useRef(null);
  useEffect(() => { h.current?.focus(); }, [title]);
  return <main><h1 ref={h} tabIndex={-1}>{title}</h1>{children}</main>;
}
```

Client-side navigation replaces the DOM without a page load, so focus falls back
to `<body>` — the keyboard user is dumped at the top of the document with no
announcement that anything changed. Move focus to the new heading (or a
`tabindex="-1"` container) and update `document.title`.

## 12. Dynamic content that is never announced — SC 4.1.3 (AA)

```jsx
// WRONG
{error && <p className="text-red-600">{error}</p>}
{results.length > 0 && <p>{results.length} results</p>}
// RIGHT
<p role="alert">{error}</p>
<p role="status">{results.length ? `${results.length} results` : ''}</p>
```

Text that appears without focus moving is invisible to a screen reader unless it
lands in a live region — and the region must exist in the DOM **before** the text
arrives, because mounting an already-populated `aria-live` element usually
announces nothing. Render the container always and change only its text.
`role="alert"` (assertive) for errors, `role="status"` (polite) for counts,
saves, and loading. Do not wrap the whole page in `aria-live`.

## 13. Positive `tabindex` — SC 2.4.3 (A)

```html
<!-- WRONG --> <input tabindex="1"> <input tabindex="2"> <button tabindex="3">Go</button>
<!-- RIGHT --> <input> <input> <button>Go</button>
```

Any positive `tabindex` jumps ahead of every natural element on the page and
decays the moment someone inserts a field. It is always a defect. Only `0` (make
focusable in natural order) and `-1` (programmatic target only) are legitimate.

## 14. Invented alt text — SC 1.1.1 (A)

```html
<!-- WRONG -->
<img src="/hero-2.jpg" alt="A team collaborating in a modern office">
<img src="/decorative-swirl.svg" alt="decorative image">
<!-- RIGHT -->
<img src="/hero-2.jpg" alt="DRAFT: two people reviewing a document at a desk">
<img src="/decorative-swirl.svg" alt="">
```

You cannot see the image. A plausible description of an image you have not seen
is a factual claim you have no basis for, and a wrong `alt` is worse than a
missing one because nothing will ever flag it. Meanwhile `alt="decorative image"`
passes every automated check and is strictly worse than `alt=""`. Write the best
draft you can from filename, surrounding copy, and purpose; label it **DRAFT**;
ask the user to confirm or replace it. Same rule for `aria-label` text on icons
whose meaning you inferred rather than read.

---

## Self-review before saving a UI file

1. Any `div`/`span` with a click handler? → native element.
2. Every button and link has a non-empty accessible name?
3. Every input has `<label for>` or `aria-label`, plus `autocomplete` where it applies?
4. Heading levels descend without skipping, exactly one `<h1>`?
5. Any `outline: none` without a `:focus-visible` replacement?
6. Every `aria-*` id reference resolves; ids unique per instance?
7. No `aria-hidden` on anything focusable?
8. Every ARIA role's keyboard contract actually implemented?
9. `<html lang>` present?
10. Every animation has a `prefers-reduced-motion` branch?
11. Route changes move focus; async updates land in a pre-existing live region?
12. No positive `tabindex`?
13. All alt text and inferred labels marked DRAFT for human confirmation?

Then run the audit. This list is the setup, not the verification.

## Related

[wcag22-quick-ref.md](wcag22-quick-ref.md) · [apg-patterns.md](apg-patterns.md) · [manual-testing.md](manual-testing.md)
