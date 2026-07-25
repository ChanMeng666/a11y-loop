# Automated Accessibility Testing Technology — Briefing for `a11y-loop`

*Research current as of July 2026. All version numbers verified against the npm registry and GitHub API on 2026-07-26.*

---

## 1. axe-core

### Current state

| Fact | Value |
|---|---|
| Latest version | **4.12.1**, published 2026-06-10 |
| Previous releases | 4.12.0 (2026-06-01), 4.11.0 (2025-10-09), 4.10.0 (2024-07-29) |
| License | **MPL-2.0** |
| Weekly downloads | ~60.2M |
| GitHub | 7,337 stars, last push 2026-07-24, 461 open issues — actively maintained |

Release cadence is slow but real: roughly one minor per 8–12 months. 4.12.0 added the `aria-tab-name` rule and deprecated `landmark-complementary-is-top-level`; 4.11.0 added RGAA standard tags.

### Rule count — the precise numbers

`doc/rule-descriptions.md` and `lib/rules/*.json` both contain exactly **105 rules**:

| Category | Count | Runs by default? |
|---|---|---|
| WCAG 2.0 Level A & AA | 60 | Yes |
| WCAG 2.1 Level A & AA | 2 (`autocomplete-valid`, `avoid-inline-spacing`) | Yes |
| WCAG 2.2 Level A & AA | 1 (`target-size`) | **No** — `"enabled": false` |
| Best practices | 27 | Yes |
| WCAG 2.x Level AAA | 3 (`color-contrast-enhanced`, `identical-links-same-purpose`, `meta-refresh-no-exceptions`) | **No** — all `"enabled": false` |
| Experimental | 7 | **No** — excluded by tag |
| Deprecated | 5 | No |

**So `axe.run()` with no options executes 89 rules** (60 + 2 + 27). This is the honest headline number, much smaller than the "~96 rules" figure marketing copy repeats.

Two consequences:
- **WCAG 2.2 coverage is one rule, and it is off.** Deque's docs say `target-size` is "disabled by default, until WCAG 2.2 is more widely adopted," with a documented false-positive trail (overlapping elements, translucent targets — axe-core issues #4805, #4350, #4295). Deque has signalled `target-size` is likely the *only* WCAG 2.2 rule they will add.
- **`runOnly` tag filtering does not resurrect disabled rules.** To get `target-size` or AAA contrast you must pass `rules: { 'target-size': { enabled: true } }`. Calling `.withTags(['wcag22aa'])` alone gets you nothing new.

**58 of the 105 rules are marked "needs review"** — they can return results in the `incomplete` array rather than `violations`. The most under-used part of the axe result object; it matters enormously for an AI fix loop.

### The coverage claim, and its critics

axe-core's README: *"With axe-core, you can find on average **57% of WCAG issues automatically**"* and *"It returns zero false positives (bugs notwithstanding)."*

The 57% study covers 2,000+ audits, 13,000+ pages, ~300,000 issues. Critically, Deque **redefined the denominator**: it counts *volume of individual issue instances found*, not *percentage of WCAG Success Criteria covered*.

Three competing figures, all defensible under different definitions:

| Figure | Denominator | Source |
|---|---|---|
| **57%** | Volume of issue instances | Deque study |
| **31%** (17 of 55) | WCAG 2.2 A/AA SCs with any ACT-approved automated rule, March 2026 | Adrian Roselli — "it's not full coverage of that 31%" |
| **13%** (7 of 55) | WCAG 2.2 AA SCs *reliably* flagged; 45% partial, 42% not detectable | accessible.org |

Karl Groves' breakdown: **9 Level A/AA SCs cannot be meaningfully tested by any tool**, and **13 more** can be tested automatically but require a human to verify.

The seven SCs accessible.org considers reliably automatable: 1.3.5 Identify Input Purpose, 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast, 2.4.1 Bypass Blocks, 2.4.2 Page Titled, 2.5.8 Target Size, 3.1.1 Language of Page.

**Quote 57% *with its definition attached*, and quote 31%/13% alongside.** A tool that overstates coverage will cause agents to declare victory prematurely — the exact failure mode the tool exists to prevent.

### ACT conformance

Per the W3C ACT implementation report, axe-core implements **40 ACT rules** (26 WCAG 2 + 14 proposed): **35 consistent, 5 partially consistent, 0 inconsistent** — axe never contradicts reference test expectations.

### `@axe-core/playwright` — current API

Version **4.12.1**, MPL-2.0, ~6.88M weekly downloads, versioned in lockstep with axe-core.

```js
import { AxeBuilder } from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .include('.results-panel')      // one selector per call; arrays of >1 not supported
  .exclude('.third-party-widget')
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .disableRules(['color-contrast'])
  .options({ resultTypes: ['violations', 'incomplete'] })
  .analyze();
```

Full chainable surface: `include()`, `exclude()`, `withTags()`, `withRules()`, `disableRules()`, `options()`, `setLegacyMode()`, `analyze()`.

Notes:
- `.options()` **overrides** other configured options — don't mix with `withTags()` carelessly.
- Auto-injects into all frames by default. `setLegacyMode()` is "a last resort."
- `.include()` accepting only single selectors per call is a real ergonomic constraint.

### MPL-2.0 in an MIT tool — verdict: fine, with one obligation

MPL-2.0 is file-level (weak) copyleft. Depending on `axe-core` via npm is unambiguously fine; your MIT code stays MIT. If bundling `axe.min.js` into a dist artifact, retain the MPL notice and point to source — a `THIRD-PARTY-NOTICES.md` satisfies this. Do not copy axe-core source into your own files; do not vendor a patched `axe.min.js` without publishing the patch. A documentation task, not an architectural constraint.

---

## 2. Alternative and complementary engines

| Engine | Version | License | Weekly DL | Verdict |
|---|---|---|---|---|
| **axe-core** | 4.12.1 | MPL-2.0 | 60.2M | **The professional default** |
| **Pa11y** | 9.1.1 | **LGPL-3.0-only** | 282k | Skip |
| **IBM Equal Access** (`accessibility-checker`) | 4.0.29 | Apache-2.0 | 33k | Optional second opinion |
| **Lighthouse** | 13.4.1 | Apache-2.0 | — | Redundant — axe subset |
| **WAVE API** | hosted | commercial | — | Disqualified |
| **Accessibility Insights** (`accessibility-insights-scan`) | 3.4.0 | MIT | — | axe wrapper, no new rules |

**Pa11y — three disqualifying problems:** (a) LGPL-3.0-only in the dependency tree; (b) a second ~300MB Chromium via Puppeteer alongside Playwright's; (c) a stale pinned axe-core (~4.11.1) that will disagree with the primary engine. HTML_CodeSniffer's unique contribution over axe is small and skews toward findings axe deliberately omits as false-positive-prone. **Do not integrate.**

**Lighthouse — genuinely redundant:** its accessibility category *is* a curated axe subset (~50 rules vs axe's 89 defaults). Its 0–100 score is actively harmful for an agent loop: a gameable target implying coverage that does not exist.

**IBM Equal Access — the only engine that adds real signal:** Apache-2.0, supports Playwright, policies for `IBM_Accessibility`, `WCAG_2_1`, `WCAG_2_2`, `EN_301_549` including requirements with no WCAG equivalent. But 33k weekly downloads, heavier config, and a rule taxonomy that does not map cleanly onto axe's impact levels. **Defer to an opt-in `--engine=axe,ibm` if demand appears.**

**WAVE API — disqualified:** credit-based commercial, requires a publicly reachable URL — defeats a localhost loop.

**What serious CI setups actually run in 2026:** `@axe-core/playwright` in the test suite on every PR, blocking on critical/serious violations. Target WCAG 2.2 AA. **axe-core alone is the professional default for v1. Ship one engine well.**

---

## 3. Beyond static-DOM scanning — the frontier

Where `a11y-loop` differentiates: axe inspects one DOM snapshot and never interacts.

### 3a. Keyboard navigation — highest value, lowest effort

Playwright natively suffices. **`tabbable` (6.5.0, MIT, 24.3M weekly downloads)** computes the expected tabbable set for a container, so you can diff *expected* vs *observed* tab order.

Verified patterns:

```js
// Tab order — walk and record
const order = [];
for (let i = 0; i < 50; i++) {
  await page.keyboard.press('Tab');
  order.push(await page.evaluate(() => {
    const el = document.activeElement;
    return el ? { tag: el.tagName, role: el.getAttribute('role'),
                  name: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) } : null;
  }));
}

// Focus trap in a modal
await page.getByRole('button', { name: 'Open dialog' }).click();
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() =>
    document.activeElement?.closest('[role="dialog"]') !== null);
  expect(inside).toBe(true);
}
await page.keyboard.press('Escape');
// Focus returns to trigger on close — very commonly broken, trivially detectable
await expect(trigger).toBeFocused();
```

Checks worth implementing, all cheap and all invisible to axe:
- **Positive `tabindex` values** — always a defect.
- **Focus visibility (SC 2.4.7)**: computed `outline-*`, `box-shadow`, `border` on `:focus-visible`; flag `outline: none` with no compensating indicator. Compute the contrast of the focus ring itself against adjacent background (SC 1.4.11 territory; essentially nobody automates it).
- **Focus order matches DOM order** — flag divergences for review, don't fail.
- **Keyboard-reachable interactive elements**: diff `tabbable()` expected set vs elements with click handlers / `role="button"`.
- **Escape closes dialogs; focus returns to trigger.**
- **Enter *and* Space both activate `role="button"`** — classic div-as-button failure.

### 3b. Screen-reader automation

**`@guidepup/guidepup` 0.29.2, MIT** — drives *real* VoiceOver (macOS) and NVDA (Windows). Needs a real desktop session; works on GitHub `windows-latest` via setup-action but slow and flaky-prone. **Opt-in CI job only — a 60-second NVDA boot is fatal to a tight inner loop.**

**`@guidepup/virtual-screen-reader` 0.32.1, MIT** — simulator walking the computed accessibility tree, producing a spoken-phrase log. Runs in Node via jsdom. API: `virtual.start({ container })`, `virtual.next()`, `virtual.spokenPhraseLog()`. Caveats: repo active (2026-07-21) but **last npm publish 2025-05-19**; 396 passing / 81 failing / 338 skipped WPTs; states plainly it augments, never replaces, real screen reader testing.

The angle for `a11y-loop`: extract `page.content()` from Playwright, load into jsdom, produce a **spoken-phrase transcript**. That transcript is exactly what an AI agent can reason about — it turns "is this accessible name useful?" from unautomatable judgment into a text problem an LLM handles well. Ship behind a flag.

Lighter alternative for accessible-name computation alone: **`dom-accessibility-api` 0.7.1, MIT**.

### 3c. `prefers-reduced-motion` etc. — trivial, verified

`page.emulateMedia()` options (Playwright 1.62.0): `media`, `colorScheme` (`'light'|'dark'`), `reducedMotion` (`'reduce'|'no-preference'`), `forcedColors` (`'active'|'none'` — **Chromium only**), `contrast` (`'more'|'no-preference'`).

Check: (a) animations actually stop under `reducedMotion: 'reduce'` — sample `getComputedStyle().animationName` / `transitionDuration`; (b) **re-run the full axe scan under `colorScheme: 'dark'`, `forcedColors: 'active'`, `contrast: 'more'`** — dark-mode contrast failures are extremely common and invisible to a single default-mode scan. The cheapest large win available.

### 3d. Zoom / reflow (400%) — via viewport, not zoom

**Playwright has no browser zoom API** (issue #2497, open since 2020). SC 1.4.10 normatively: *"320 CSS pixels is equivalent to a starting viewport width of 1280 CSS pixels wide at 400% zoom."* So `page.setViewportSize({ width: 320, height: 256 })` **is** the 400% zoom test. Detect directly:

```js
await page.setViewportSize({ width: 320, height: 256 });
const overflow = await page.evaluate(() => {
  const doc = document.documentElement;
  const bad = [];
  if (doc.scrollWidth > doc.clientWidth + 1) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > 0)
        bad.push({ tag: el.tagName, cls: el.className, right: Math.round(r.right) });
    }
  }
  return { horizontalScroll: doc.scrollWidth > doc.clientWidth + 1, culprits: bad.slice(0, 20) };
});
```

Report the *specific overflowing elements*. Remember the SC exception for content genuinely requiring 2D layout (tables, maps, data viz) — warning with named culprits, not a hard failure.

### 3e. Touch target size (SC 2.5.8)

Two paths; take both:
1. Enable axe's `target-size` explicitly — report as **needs-review**, never a hard failure (documented false-positive history).
2. Own simpler check: `getBoundingClientRect()` on interactive elements, flag `< 24×24`, compute center-to-center spacing for the exception. Explains itself better to an agent than axe's opaque `target-offset`.

---

## 4. Linting layer — what's catchable pre-render

| Tool | Version | License | Rules | Maintenance |
|---|---|---|---|---|
| `eslint-plugin-jsx-a11y` | 6.10.2 | MIT | 39 | npm publish 2024-10-26 — **slowing** |
| `@biomejs/biome` (a11y group) | 2.5.5 | MIT OR Apache-2.0 | 37 | Very active |
| `html-validate` | 11.5.6 | MIT | 7 `wcag/*` + ~21 a11y | Active |
| `axe-linter` (Deque) | — | proprietary | — | Commercial; LoC-priced, API-key-gated — unusable |

**The static/rendered boundary — the important conceptual point:**

*Statically catchable:* missing `alt`, missing `<label>` association, invalid ARIA role names, ARIA attributes not permitted on a role, `aria-hidden` on focusable elements, positive `tabindex`, click handlers on non-interactive elements without keyboard handlers, missing `<html lang>`, missing `<iframe title>`, `<button>` without `type`, redundant roles, abstract roles, autoplay media, `autofocus`, `<marquee>`/`<blink>`.

*Requires a rendered page:* **all** color contrast (computed style + layout + compositing), focus order, focus visibility, reflow/overflow, touch target size, accessible-name quality composed from runtime sources, state transitions (`aria-expanded` after click), duplicate IDs across composed components, landmark uniqueness in a composed page, actual visibility.

Roughly: **linting catches static structure; only a rendered page catches anything geometric, computed, stateful, or compositional.** This is the honest justification for `a11y-loop` existing rather than being an ESLint config — put it in the README.

**Recommend Biome** (active) for new projects, jsx-a11y for ESLint teams, html-validate for plain HTML. Delegate, don't reimplement.

**Do NOT use jsdom+axe as a substitute for the rendered scan** (what jest-axe does): `color-contrast` does not work at all in jsdom (axe-core #595), `link-in-text-block` disabled, `region` false-positives, zero geometry, timer conflicts. jsdom is only useful for the virtual-screen-reader transcript.

---

## 5. Contrast tooling

### WCAG 2.x reference math — implement yourself (~15 lines, zero ambiguity)

```
Normalize:      c_srgb = c_8bit / 255
Linearize:      c = c_srgb <= 0.04045 ? c_srgb / 12.92 : ((c_srgb + 0.055) / 1.055) ** 2.4
Luminance:      L = 0.2126 * R + 0.7152 * G + 0.0722 * B
Contrast ratio: (L_lighter + 0.05) / (L_darker + 0.05)
```

Thresholds:

| | Normal text | Large text |
|---|---|---|
| **AA** (1.4.3) | 4.5:1 | 3:1 |
| **AAA** (1.4.6) | 7:1 | 4.5:1 |
| **Non-text / UI** (1.4.11) | 3:1 | — |

Large text = 18pt+ regular or 14pt+ bold = **≥24px regular or ≥18.5px bold** (1pt = 1.333px). Get this boundary right — the most common source of disagreement between contrast tools.

Alpha compositing: composite foreground over background in **non-linear sRGB** space before linearizing, matching browsers and axe.

### "Nearest accessible color" — no well-maintained library exists

| Package | Version | License | Modified | Notes |
|---|---|---|---|---|
| `accessible-colors` | 1.0.9 | MIT | 2026-03-01 | Right algorithm, 3.4k DL, single maintainer |
| `colorizr` | 5.1.1 | MIT | 2026-06-17 | Healthiest general option; WCAG + APCA |
| `@adobe/leonardo-contrast-colors` | 1.1.0 | Apache-2.0 | 2026-07-08 | Different problem (palette generation) |

**Recommendation: implement the suggester yourself, ~60 lines.** Binary-search lightness in **OKLCh** (preserves hue and chroma far better than HSL — suggestions look like the designer's intent, not washed out), using **`culori` 4.0.2 (MIT, active)** for color-space conversion only. Return *both* a lighter and a darker passing candidate with ratios and hex, and let the agent or human pick — a loop that silently picks one direction will destroy a brand palette.

This is a differentiator: existing tools say "3.8:1, fails." Emitting `#6B7280 → #4B5563 (3.8:1 → 7.1:1), or lighten background to #F9FAFB (3.8:1 → 4.6:1)` is what closes the loop for an agent.

### APCA — do not ship as a primary mode

Two independent reasons: (1) **Licensing landmine** — `apca-w3` is 0.1.9, last published 2022-07-04, non-standard "Limited W3 License", and depends on `colorparsley` licensed **AGPL v3**. An AGPL transitive dep in an MIT CLI is a serious problem. No permissive canonical implementation exists. (2) **The standard isn't ready** — contrast was removed from the WCAG 3 draft in July 2023; the WCAG 3 algorithm is "yet to be determined". If APCA at all: behind `--experimental-apca`, implemented from the published spec in an own MIT file, labeled "informational, non-normative, not a compliance signal."

---

## 6. Report design and SARIF

### Structure findings axe-compatibly

- Four result arrays: `violations`, `passes`, `incomplete`, `inapplicable`.
- Four impact levels: `minor`, `moderate`, `serious`, `critical`.
- Per-violation: `id`, `impact`, `tags` (`wcag2aa`, `wcag143`, `best-practice`, `ACT`, `section508.*`, `EN-9.*`, `cat.*`), `description`, `help`, `helpUrl`, `nodes[]`.
- Per-node: `html`, `target` (CSS selector array), `failureSummary`, `any`/`all`/`none` check results.
- Selector modes: `selectors`, `ancestry`, `xpath`, `absolutePaths`.

Three design decisions for an AI fix loop:

1. **Surface `incomplete` as a first-class category** (58 of 105 rules can return it — every one a place axe knows it doesn't know). Name it `needsReview`, never merge into passes.
2. **Emit a stable fingerprint per finding** — hash(ruleId + normalized target + html shape) — so the loop distinguishes "fixed" / "moved" / "new" across iterations. Without it a loop cannot detect regressions or oscillation (fix A, break B, fix B, break A, forever). **The single most important thing the format must provide that no existing tool does.**
3. **Separate WCAG-required from best-practice.** 27 of axe's 89 default rules are `best-practice` with no SC behind them. Tag distinctly, default non-blocking.

### SARIF — support, with eyes open

`axe-sarif-converter` (Microsoft): 3.1.0, MIT, published 2026-07-16, SARIF v2.1, ~20.9k weekly DL.

**The fundamental catch:** GitHub code scanning only displays results whose locations are file paths; results without a valid `physicalLocation.artifactLocation.uri` are **silently dropped**. An a11y finding's natural location is (page URL, CSS selector) — not a repo file path. Naive axe→SARIF upload produces an empty Code Scanning view.

Options: (1) map audited URL back to source template/component (best; needs route manifest); (2) synthetic manifest file anchor (cheap, honest); (3) ship SARIF for Azure DevOps / VS Code SARIF viewer interop and document the GitHub limitation. **Emit plain JSON as the primary machine format** — SARIF is verbose and hostile to LLM context budgets.

---

## 7. Playwright on Windows

- Default browser location `%USERPROFILE%\AppData\Local\ms-playwright`; Chromium ~281MB. **Never run bare `npx playwright install`** — always `install chromium`. Honor `PLAYWRIGHT_BROWSERS_PATH` (this machine: `D:\playwright-browsers`, set at install AND run time). Detect missing-browser and print the exact install command, not a stack trace. `--with-deps` is a Linux concern; don't emit on win32.
- Default headless is `chromium-headless-shell` (not Chrome's `--headless=new`). Fine generally; expose `--headed` for debugging; **always set explicit viewport** (1280×720 default — makes the 320px reflow test a clean 400% equivalent).
- `forcedColors: 'active'` is Chromium-only (Playwright #33765).
- **`file://` is forbidden**: null origin breaks axe frame injection (`allowedOrigins value 'null'`, axe-core #3002), ES modules, `fetch`; Windows path→URL conversion is its own bug source. Support three modes: `--url` (dev server; primary loop path), `--file` (ephemeral `node:http` static server on 127.0.0.1, ~20 lines, zero deps), `--html` (wrap fragment in minimal document, serve same way — **the mode an AI agent will use most**).

---

## 8. Recommended verification architecture (summary)

**Engine:** axe-core 4.12.1 via `@axe-core/playwright` 4.12.1, alone, Chromium only.

**Five passes per audit** (costs almost nothing, roughly doubles real-world contrast findings):

| Pass | Configuration |
|---|---|
| 1 | Default, 1280×720 |
| 2 | `emulateMedia({ colorScheme: 'dark' })` |
| 3 | `emulateMedia({ forcedColors: 'active' })` |
| 4 | `emulateMedia({ reducedMotion: 'reduce' })` |
| 5 | `setViewportSize({ width: 320, height: 256 })` — SC 1.4.10 |

axe config: `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa','best-practice'])`, `resultTypes: ['violations','incomplete']`, `ancestry: true`, `rules: { 'target-size': { enabled: true } }` (needs-review, never blocking).

**Own checks ranked by value ÷ effort:**

| # | Check | Value | Effort |
|---|---|---|---|
| 1 | Contrast fix suggester (OKLCh binary search, both directions) | Very high | Low |
| 2 | Multi-mode axe re-scan (dark / forced-colors / reduced-motion) | Very high | Very low |
| 3 | Reflow at 320×256 with named overflowing elements | High | Low |
| 4 | Focus visibility — computed `:focus-visible` styles + ring contrast | High | Low–Med |
| 5 | Tab order capture + diff vs `tabbable()`; positive-tabindex | High | Low |
| 6 | Focus trap / Escape / focus-return-to-trigger on dialogs | High | Medium |
| 7 | Finding fingerprints + cross-iteration diff | High | Medium |
| 8 | Touch target size (own rect + spacing) | Medium | Low |
| 9 | Keyboard activation — Enter *and* Space; `aria-expanded` transitions | Medium | Medium |
| 10 | Reduced-motion effectiveness | Medium | Low |
| 11 | Virtual screen-reader transcript (jsdom) — behind a flag | High (novel) | Med–High |
| 12 | Ambiguous link text heuristic ("read more", "click here") | Low–Med | Very low |
| 13 | Real NVDA via guidepup — opt-in CI only, never in the loop | Medium | High |

**Items 1–6 constitute a defensible v1. Item 7 is not optional if the tool claims to drive a loop.**

---

## 9. Document as NOT automatable — the honesty section (a feature, not a disclaimer)

**Coverage numbers with denominators:** 89/105 default rules; WCAG 2.2 coverage = 1 rule, off by default; 57% by issue volume (Deque) / 31% of SCs have any ACT-approved rule / 13% reliably flagged; 9 SCs untestable by any tool + 13 needing human verification.

**Requires human or AI judgment:** alt/name *accuracy and usefulness* (`alt="decorative image"` passes axe and is worse than `alt=""`); heading structure semantics; link text meaning out of context; *logical* focus order; error-message actionability; caption/transcript quality; whether reflow preserves meaning; whether a focus indicator is *visually* adequate (e.g. occluded by a sticky header); consistent navigation; cognitive load, plain language, authentication alternatives; ARIA used *appropriately* vs merely validly; real AT behavior (NVDA/JAWS/VoiceOver diverge).

**Known engine limitations to surface in-report:** `color-contrast` gives up on background images, gradients, pseudo-element backgrounds, foreground opacity/occlusion (→ `incomplete`; a 1:1 computed ratio is the tell); hover/focus state contrast never checked unless you drive the state and re-scan; `target-size` false-positive history; cross-origin iframes may go untested (`frame-tested`); anything needing interaction, timing, or multi-page state.

**One-line framing for the README:** *a11y-loop makes the automatable portion of WCAG fast and machine-actionable. It does not make a page accessible, and a clean report is a starting point for human review, not a conformance claim.*

---

*Source URLs: see the session research; key ones — axe-core repo/docs, Deque 57% study, Roselli "Automated WCAG Testing Is Grrreat!" (2025-04), accessible.org 13% analysis, playwright.dev docs, guidepup.dev, tabbable npm, culori npm, axe-sarif-converter repo, GitHub SARIF support docs, Mozilla MPL-2.0 FAQ.*
