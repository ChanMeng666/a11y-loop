# Digital Accessibility Standards & Regulations — Briefing for `a11y-loop`

*Research current as of 26 July 2026. Primary sources (w3.org, digital.govt.nz, webaim.org, ec.europa.eu) preferred; where secondary sources conflict with primaries, the conflict is flagged.*

---

## 1. WCAG 2.2 — the target standard

**Status:** W3C Recommendation, published **5 October 2023**, with an **updated Recommendation published 12 December 2024**. Ratified internationally as **ISO/IEC 40500:2025** (identical to the October 2023 text); W3C notes an expected **ISO/IEC 40500:2026 update by late 2026**.
Source: [WCAG 2 Overview (W3C WAI)](https://www.w3.org/WAI/standards-guidelines/wcag/), [WCAG 2.2 spec](https://www.w3.org/TR/WCAG22/)

**WCAG 2.2 is the final version in the WCAG 2 line.** There is no WCAG 2.3 planned; the AG Working Group has moved to WCAG 3. W3C explicitly states WCAG 2.2 does **not** deprecate or supersede 2.1, and 2.1 does not supersede 2.0 — all three remain live standards, which is exactly why different jurisdictions cite different versions (see §5).

**The 9 new success criteria vs WCAG 2.1** (verified against [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)):

| SC | Name | Level |
|---|---|---|
| 2.4.11 | Focus Not Obscured (Minimum) | **AA** |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA |
| 2.4.13 | Focus Appearance | AAA |
| 2.5.7 | Dragging Movements | **AA** |
| 2.5.8 | Target Size (Minimum) | **AA** |
| 3.2.6 | Consistent Help | **A** |
| 3.3.7 | Redundant Entry | **A** |
| 3.3.8 | Accessible Authentication (Minimum) | **AA** |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA |

Level AA conformance gained 6 new obligations (2 at A + 4 at AA). **4.1.1 Parsing was removed** (declared obsolete — assistive tech no longer parses HTML directly), so any tool still reporting "duplicate ID" / "invalid nesting" as a WCAG failure is citing a criterion that no longer exists.

**Criteria counts — sources conflict, and the correct number is 86, not 87.** Derivation from the specs: WCAG 2.1 has 78 SC (30 A / 20 AA / 28 AAA). WCAG 2.2 removes one Level A criterion (4.1.1) and adds 2 A + 4 AA + 3 AAA → **31 A / 24 AA / 31 AAA = 86 total**, of which **55 must be met for Level AA conformance**. Several SEO-heavy blogs advertise "all 87 success criteria" — they add the 9 new criteria without subtracting the removed one, or still list 4.1.1. The 86/55 figures are internally consistent and match [Level Access's breakdown](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/). **Do not hardcode 87.**

**Which level a professional tool should target in 2026: Level AA.** Unambiguous — AA is the level referenced by every major regulation (EU, US, NZ, UK), and W3C itself says "use the latest version." AAA is not a realistic conformance target for whole sites (W3C says so explicitly), but individual AAA criteria are useful as opt-in advisories.

---

## 2. WCAG 3.0 and APCA — not ready; do not build against it

**Status:** **W3C Working Draft, published 3 March 2026.** Requirements have reached "Developing" maturity ("details have been added, but are yet to be worked out"). The draft carries the standard hard warning: *"it is inappropriate to cite this document as other than a work in progress,"* and states the guidelines work "still has several years of work" remaining, and that **"the final set of requirements in WCAG 3 will be different from what is in this draft."**
Source: [W3C Accessibility Guidelines 3.0 (WD 2026-03-03)](https://www.w3.org/TR/wcag-3.0/)

**Timeline — sources conflict significantly.** Secondary sources claim Candidate Recommendation ~Q4 2027 and Recommendation "no earlier than 2028." Practitioners are far more pessimistic: Adrian Roselli puts completion at **2030 or later** ([WCAG3 Contrast as of April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)), and Deque similarly estimated "won't be finished before 2030" citing WCAG 2.0's seven-year gestation ([Deque](https://www.deque.com/blog/w3c-unveils-174-new-outcomes-for-wcag-3-0/)). W3C's own [What We're Working On](https://www.w3.org/WAI/update/) page gives **no date at all**, saying only that WCAG 3 is "in an exploratory phase, and will change substantially. It's years away from being finalized." **Treat 2030+ as the planning assumption.**

**Conceptual changes** (directional, not stable): success criteria are replaced by more granular **"requirements"** (renamed from "outcomes" in the March 2026 draft); pass/fail A/AA/AAA is replaced by a scored model with **Bronze / Silver / Gold** levels, Bronze roughly equivalent to today's WCAG 2.2 AA; **assertions** (documented process claims) become part of conformance. Caution on the widely-circulated **"174 outcomes/requirements"** figure: it originates from the **May 2024** draft and is being recycled by 2026-dated blogs as if new. The March 2026 draft's conformance model is described in the spec itself as unsettled, with open questions posed to reviewers.

**APCA — the critical finding: APCA is NOT in WCAG 3.** The April 2026 WCAG 3 editor's draft states plainly: **"The contrast algorithm used in WCAG 3 is yet to be determined."** APCA was only ever an *exploratory* item and was **removed in July 2023** after failing to gain Working Group support within the required six-month exploratory window. APCA's own documentation still markets itself as "the candidate contrast method for the future WCAG 3" ([APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)) — **this claim is out of date and contradicted by W3C**. APCA now develops outside W3C via the independent APCA Readability Criterion (ARC).

APCA's technical critique of WCAG 2 is legitimate — WCAG 2.x overstates contrast for dark colors, such that 4.5:1 can be functionally unreadable near black, and APCA's Lc values (Lc 90 preferred body text, Lc 75 minimum body text, Lc 60 non-body, Lc 45 headlines, Lc 30 spot-readable, Lc 15 non-semantic) are perceptually uniform in a way ratios are not. But it has no normative standing and no legal weight.

**Recommendation for `a11y-loop`: WCAG 2.x contrast ratios are the only normative check** (1.4.3: 4.5:1 normal text, 3:1 large text; 1.4.11: 3:1 for UI components and graphical objects). APCA may be offered as an **opt-in advisory signal only**, and if implemented, follow Roselli's risk guidance: prefer colors that satisfy **both** APCA and WCAG 2, and never let an APCA pass suppress a WCAG 2 failure.

---

## 3. WAI-ARIA and the APG

**ARIA 1.2 is the current stable standard** — W3C Recommendation, **6 June 2023**. Target this.
**ARIA 1.3 is a W3C Working Draft dated 4 June 2026** — not Candidate Recommendation, not stable. Additions since its First Public Working Draft include the `sectionheader`/`aria-sectionfooter` roles, the **`aria-notify` API**, and a prohibition on `aria-hidden="true"` on document root elements. Earlier-announced 1.3 features include roles `suggestion`, `comment`, `mark`, and attributes `aria-description`, `aria-braillelabel`, `aria-brailleroledescription`, plus multiple ID references for `aria-details`. The ARIA WG charter treats WAI-ARIA as a **Living Recommendation** with 1.3 targeted around Q3 2026, but W3C's own update page gives no date. **1.3 features should be flagged as emerging, never required.**
Sources: [WAI-ARIA Overview](https://www.w3.org/WAI/standards-guidelines/aria/), [WAI-ARIA 1.3 WD](https://www.w3.org/TR/wai-aria-1.3/)

**The APG's canonical patterns — all 30**, exactly as named at [w3.org/WAI/ARIA/apg/patterns](https://www.w3.org/WAI/ARIA/apg/patterns/):

Accordion (Sections With Show/Hide Functionality) · Alert · Alert and Message Dialogs · Breadcrumb · Button · Carousel (Slide Show or Image Rotator) · Checkbox · Combobox · Dialog (Modal) · Disclosure (Show/Hide) · Feed · Grid (Interactive Tabular Data and Layout Containers) · Landmarks · Link · Listbox · Menu and Menubar · Menu Button · Meter · Radio Group · Slider · Slider (Multi-Thumb) · Spinbutton · Switch · Table · Tabs · Toolbar · Tooltip · Tree View · Treegrid · Window Splitter

**Key rules — an important correction.** The canonical "rules of ARIA use" live in *Using ARIA*, and there are **four, not five**. Critically, that document is now a **W3C Discontinued Draft dated 24 February 2026** with no plans for continued development, though the rules are preserved for reference ([w3.org/TR/using-aria](https://www.w3.org/TR/using-aria/)):

1. If you *can* use a native HTML element or attribute with the semantics and behavior you require already built in, instead of re-purposing an element and adding an ARIA role, state or property to make it accessible, then do so.
2. Do not change native semantics, unless you really have to.
3. All interactive ARIA controls must be usable with the keyboard.
4. Do not use `role="presentation"` or `aria-hidden="true"` on a **focusable** element.

The APG's own [Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) supplies the framing that matters most for AI-generated code:
- **"No ARIA is better than bad ARIA"** — incorrect ARIA actively harms screen reader users by misrepresenting the interface.
- **"A role is a promise"** — `role="button"` commits you to every corresponding keyboard interaction and behavior. ARIA alone creates no functionality; an unfulfilled promise is a false accessibility interface.
- **ARIA can both cloak and enhance** — it overrides original semantics (`role="menuitem"` on a link) or adds to them (`aria-pressed` on a button); authors routinely mask correct semantics by accident.
- Testing with real assistive technology remains essential; APG examples target spec compliance, not AT bug workarounds.

---

## 4. ACT Rules — worth citing, with caveats

**What they are:** the W3C's **Accessibility Conformance Testing (ACT) Rules Format** defines a standard format for writing accessibility test rules usable by automated tools and manual methodologies. The rules themselves describe how to test conformance to WCAG and WAI-ARIA, so different tools evaluate edge cases consistently.

**ACT Rules Format 1.1 became a W3C Recommendation on 5 February 2026** — a genuinely recent status change worth citing. Source: [W3C WAI news, 2026-02-05](https://www.w3.org/WAI/news/2026-02-05/act-rules-11/), spec at [w3.org/TR/act-rules-format](https://www.w3.org/TR/act-rules-format/)

**Crucially: the rules are *informative*, not normative.** W3C states explicitly that "ACT Rules are informative — that means they are not required for determining conformance to WCAG or ARIA." Rules carry a status of **Proposed** (agreed by ACT Task Force) or **Approved** (reviewed and approved by the AG WG for WCAG rules, ARIA WG for ARIA rules; requires implementation by at least one tool). Rules from the ACT Rules Community Group have no formal W3C standing.

**Counts:** the Community Group site [act-rules.github.io/rules](https://act-rules.github.io/rules/) lists **143 rules**. The W3C-published set at [w3.org/WAI/standards-guidelines/act/rules](https://www.w3.org/WAI/standards-guidelines/act/rules/) is smaller and does not display a headline total (counts vary with filters).

**Rule IDs are 6-character alphanumeric slugs**, each mapping to one or more WCAG success criteria — e.g. `97a4e1` "Button has non-empty accessible name" → SC 4.1.2; `23a2a8` "Image has non-empty accessible name" → SC 1.1.1; `c487ae` "Link has non-empty accessible name" → SC 2.4.4 + 4.1.2; `2779a5` "HTML page has non-empty title" → SC 2.4.2; `afw4f7` "Text has minimum contrast" → SC 1.4.3.

**axe-core's ACT mapping:** the official [W3C axe-core implementation report](https://www.w3.org/WAI/standards-guidelines/act/implementations/axe-core) shows **26 consistent + 1 partially consistent** approved WCAG 2 rules, and **3 consistent + 11 partially consistent** proposed rules. Note a data-quality problem: that report cites axe-core **4.10.2** while stating "last updated 2 November 2023" — internally inconsistent, since 4.10.2 postdates that. **The W3C report is stale.** axe-core itself carries ACT rule IDs inline in its rule metadata and exposes an `ACT` tag alongside `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`, `section508`, `TTv5`, and `EN-301-549` tags. Current axe-core is **4.12.1** (published ~29 June 2026), covering WCAG 2.0/2.1/2.2 at A/AA/AAA. Sources: [axe-core API docs](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md), [npm](https://www.npmjs.com/package/axe-core)

---

## 5. Legal and regulatory landscape

**Headline finding: no single WCAG version is universally mandated. The tool must not assume one.**

**European Accessibility Act (Directive 2019/882) — in force since 28 June 2025.** Member States had to transpose it by June 2022; obligations bit on 28 June 2025. It covers ten categories: computers and operating systems, smartphones, ATMs/ticketing/check-in machines, TV equipment, telephony services, audiovisual media services, passenger transport (air/bus/rail/waterborne), banking services, **e-books, and e-commerce**. Scope is extraterritorial — any company offering covered products or services to EU consumers is caught regardless of headquarters. Transition periods: service contracts agreed before 28 June 2025 may run unaltered until expiry or **28 June 2030**, whichever is earlier; products already in use in service provision before 28 June 2025 get until 28 June 2030; existing self-service terminals may run to end of lifespan, **max 20 years** (hence the stray "2045" dates). Microenterprises (<10 employees, <€2m turnover) are exempt **only as service providers** — microenterprises *manufacturing* covered products are not exempt. Penalties vary by Member State, reaching €500,000+ in some.
Sources: [European Commission — EAA](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en), [European Disability Forum](https://www.edf-feph.org/accessibility-act-enters-into-force-products-and-services-must-be-accessible/)

**EN 301 549 — the EU's technical standard, currently pinned to WCAG 2.1 AA.** Conformance grants a **presumption of conformity** under both the EAA (Art. 15) and the Web Accessibility Directive (2016/2102). The harmonised version in force is **v3.2.1 (March 2021), which incorporates WCAG 2.1 Level AA**. Draft **v4.1.0 was released November 2025**; final **v4.1.1 is expected to be cited in the Official Journal around October 2026**, at which point it replaces v3.2.1 and **moves the EU baseline to WCAG 2.2 AA**. This is a live transition during `a11y-loop`'s lifetime.
Sources: [Draft EN 301 549 V4.1.0 (ETSI PDF)](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.00_20/en_301549v040100ev.pdf), [Level Access](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/)

**US Section 508 — still legally pinned to WCAG 2.0 AA.** The 2017/2018 ICT Refresh aligned Section 508 with **WCAG 2.0 Level AA** and **has not been updated since**. In practice many federal agencies expect 2.1 AA and increasingly benchmark new procurement against 2.2. A proposed *Section 508 Refresh Act* is pending. GSA's most recent governmentwide assessment scored federal conformance **1.74 / 5**, the lowest ever recorded.
Sources: [Section508.gov](https://www.section508.gov/blog/accessibility-news-the-section-508-Update/), [Deque](https://www.deque.com/blog/section-508-refresh-news-ict-final-rule-update/)

**US ADA Title II web rule — WCAG 2.1 AA, and the deadlines just moved.** DOJ's final rule of **24 April 2024** requires state and local public entities to make web content and mobile apps accessible, with **WCAG 2.1 Level AA** as the incorporated technical standard. **On 17 April 2026 DOJ extended the compliance deadlines by one year**: large public entities (population ≥50,000) now have until **26 April 2027**; smaller entities and special district governments until **26 April 2028**. Note the trap: HHS's parallel Section 504 rule (May 2024) imposes similar web/mobile obligations on HHS funding recipients with a first deadline of **11 May 2026**, and **HHS did not match DOJ's extension**.
Sources: [Venable](https://www.venable.com/insights/publications/2026/04/ada-title-ii-website-accessibility-regulations), [Jackson Lewis](https://www.jacksonlewis.com/insights/doj-extends-public-entities-compliance-deadline-ada-related-website-accessibility-hhss-may-2026-deadline-still-looms)

**New Zealand — WCAG 2.2 Level AA. This is the strictest of the major jurisdictions.** The **NZ Government Web Accessibility Standard 1.2** has been mandatory since **17 March 2025**. The exact conformance wording: *"Every Web Page must conform to the Web Content Accessibility Guidelines (WCAG 2.2) at Level AA, subject to the exceptions in Section 3."* It binds all public service departments plus NZ Police, NZ Defence Force, Parliamentary Counsel Office, and the Security Intelligence Service. A companion **Web Usability Standard 1.4** is mandatory for the same bodies.

NZ-specific modifications worth knowing: complex visual maps need no text alternative if data is published in open machine-readable form via data.govt.nz; modified time-based-media alternatives; live captions required for synchronised media carrying high-stakes information or services lacking simultaneous text alternatives; audio description recommended for prerecorded video and **mandatory** for high-stakes information/services; pages marked inactive/archived are exempt if instructions for obtaining an accessible version are given. Agencies must run accessibility assessments and supply conformance reports plus risk management plans on request from the Government Chief Digital Officer.

Forward-looking: a broader **Digital Accessibility Standard (DAS)** is under development to cover all digital technology (mobile apps, email, documents), not just websites, and is expected to be **based on EN 301 549** — which would eventually align NZ with the EU technical standard. **DAS is not yet in force; WCAG 2.2 AA is the operative requirement today.**
Sources: [Web Accessibility Standard 1.2](https://www.digital.govt.nz/standards-and-guidance/nz-government-web-standards/web-accessibility-standard-1-2), [NZ Government Web Standards](https://www.digital.govt.nz/standards-and-guidance/nz-government-web-standards)

**UK** (relevant since GOV.UK guidance is a reference source): public sector bodies must meet **WCAG 2.2 AA**; the GOV.UK Design System is maintained to meet 2.2.
Sources: [GDS Way — Building accessible services](https://gds-way.digital.cabinet-office.gov.uk/manuals/accessibility.html)

**Summary of the version fragmentation:**

| Jurisdiction / instrument | Version + level | Status |
|---|---|---|
| **New Zealand** Web Accessibility Standard 1.2 | **WCAG 2.2 AA** | In force 17 Mar 2025 |
| UK public sector | WCAG 2.2 AA | In force |
| EU — EN 301 549 v3.2.1 (EAA / WAD) | WCAG 2.1 AA | In force; → 2.2 AA with v4.1.1, expected OJEU ~Oct 2026 |
| US — ADA Title II (DOJ 2024 rule) | WCAG 2.1 AA | Deadlines 26 Apr 2027 / 26 Apr 2028 |
| US — HHS Section 504 rule | WCAG 2.1 AA | First deadline 11 May 2026, not extended |
| US — Section 508 | WCAG 2.0 AA | Unchanged since 2017/2018 refresh |
| ISO/IEC 40500:2025 | WCAG 2.2 (Oct 2023 text) | Ratified 21 Oct 2025 |

---

## 6. Authoritative sources for the tool's reference docs

**Tier 1 — normative, cite directly:**
- [WCAG 2.2 spec](https://www.w3.org/TR/WCAG22/) and [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/) — the only normative text for success criteria
- [How to Meet WCAG (Quick Reference)](https://www.w3.org/WAI/WCAG22/quickref/) — filterable, the best per-SC technique index
- [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) — normative role/state/property definitions
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) — the 30 patterns, each with keyboard interaction tables and working examples; the single best source for "how should this widget behave"
- [ACT Rules Format 1.1](https://www.w3.org/TR/act-rules-format/) and [W3C ACT Rules list](https://www.w3.org/WAI/standards-guidelines/act/rules/)
- [ARIA in HTML](https://www.w3.org/TR/html-aria/) — which ARIA roles/attributes are permitted on which HTML elements (the machine-checkable basis for "bad ARIA" detection)

**Tier 2 — high-quality practitioner guidance:**
- [WebAIM](https://webaim.org/resources/) — the [WebAIM Million](https://webaim.org/projects/million/) is the definitive empirical picture of real-world failures; [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) is the de facto reference implementation of WCAG 2 contrast
- [Deque University resources](https://dequeuniversity.com/resources/) — per-rule remediation guidance keyed to axe-core rule IDs
- [GOV.UK / GDS Way accessibility](https://gds-way.digital.cabinet-office.gov.uk/manuals/accessibility.html) and the [GOV.UK accessibility blog](https://accessibility.blog.gov.uk/) — best source for pragmatic testing process and plain-language framing
- [The A11Y Project checklist](https://www.a11yproject.com/checklist/) — WCAG-referenced, AA-targeted, developer-friendly phrasing; good model for human-readable rule descriptions
- [MDN ARIA reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA) — practical, well-maintained
- [Adrian Roselli](https://adrianroselli.com/) — reliable for corrections to widely-repeated misinformation, especially contrast and ARIA patterns
- **NZ-specific:** [Web Accessibility Guide — NZ Government](https://govtnz.github.io/web-a11y-guidance/) and [Web Accessibility Standard 1.2](https://www.digital.govt.nz/standards-and-guidance/nz-government-web-standards/web-accessibility-standard-1-2)

**Avoid as sources:** the large volume of SEO-optimised "WCAG 2026 compliance guide" content that dominates search results. These recycle stale figures, propagate the 87-criteria error, repeat the "APCA is in WCAG 3" claim that W3C contradicts, and present overlay-vendor marketing as guidance.

---

## 7. What this means for `a11y-loop`

**Standard versions and levels to target and cite**

1. **Primary target: WCAG 2.2 Level AA (86 criteria, 55 in the AA set).** Cite `WCAG 2.2` explicitly with the version number in every report. This is correct for New Zealand (mandated since 17 March 2025, the strictest of the major jurisdictions), correct for the UK, forward-compatible with the EU's late-2026 move to EN 301 549 v4.1.1, and — because WCAG 2.2 is fully backward compatible — automatically satisfies the WCAG 2.1 AA and 2.0 AA baselines that US ADA Title II, HHS §504, and Section 508 still reference. Targeting 2.2 AA is the single choice that satisfies every jurisdiction simultaneously.
2. **Report the jurisdictional mapping, don't hide it.** Tag each finding with the lowest WCAG version that contains it, so a US Title II user can filter to the 2.1 AA subset and an EU user to the current v3.2.1 subset. Emit a "this finding is WCAG 2.2-only" marker on the 6 new A/AA criteria — that distinction is exactly what a compliance-driven user needs and what no competing tool surfaces well.
3. **ARIA baseline: WAI-ARIA 1.2 (Rec, 6 June 2023).** Validate against [ARIA in HTML](https://www.w3.org/TR/html-aria/) for allowed role/element combinations. Treat ARIA 1.3 features (`aria-notify`, `sectionheader`, `aria-braillelabel`, `suggestion`/`comment`/`mark`) as emerging: never require them, and warn if generated code depends on them.
4. **Do not implement WCAG 3.0.** It is a Working Draft (3 March 2026) that explicitly forbids citation as anything but work in progress and states its requirement set will change. Realistic Recommendation date is 2030+. A forward-looking note in docs is fine; a `--wcag3` mode is not.

**Contrast algorithms**

5. **WCAG 2.x contrast ratios are the normative check, full stop.** Implement 1.4.3 (4.5:1 normal, 3:1 large-scale) and 1.4.11 (3:1 for UI components and graphical objects). Match WebAIM Contrast Checker's rounding behavior so results are reproducible against the tool practitioners actually use.
6. **APCA: optional, advisory, off by default, and never allowed to override.** The pitch "APCA is the WCAG 3 algorithm" is false as of 2026 — W3C says the WCAG 3 algorithm is undetermined and APCA was removed in July 2023. If offered (`--apca`), present Lc values as supplementary perceptual information alongside the WCAG 2 verdict, and flag the genuine WCAG 2 weakness it exposes (overstated contrast for near-black pairs) as a design advisory. An APCA pass must never suppress a WCAG 2 failure — that inverts the legal risk.

**Findings mapping**

7. **Yes — map every finding to a WCAG 2.2 success criterion number and name.** Non-negotiable for a professional tool; it is how findings get triaged, ticketed, and defended.
8. **Yes — include ACT rule IDs where they exist, as secondary identifiers.** ACT Rules Format 1.1 became a W3C Recommendation on 5 February 2026, and axe-core already carries ACT IDs in rule metadata plus an `ACT` tag, so the mapping is essentially free. Present them as `SC 4.1.2 Name, Role, Value (Level A) · ACT 97a4e1 · axe: button-name`. Two caveats to encode honestly: **ACT rules are informative, not normative** — never phrase an ACT ID as the source of the obligation, always the SC; and **respect Approved vs Proposed status**. The W3C implementation report is stale — derive mappings from axe-core's own metadata at the pinned version rather than from the W3C report.
9. **Pin the axe-core version and record it in output.** Current is **4.12.1**. Use the tag set `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` — remember axe tags are **not cumulative**, so each must be listed explicitly or coverage silently drops.
10. **Never claim conformance.** Automated testing catches a minority of WCAG issues. Report "no automatically detectable failures" and enumerate what still needs human review (the APG's own guidance: test with real assistive technology before production).

**Top real-world failure classes the tool must catch**

From the [WebAIM Million 2026 report](https://webaim.org/projects/million/) — **95.9% of the top million home pages had detected WCAG 2 failures**, up from 94.8% in 2025, reversing six years of improvement; **56,114,377 errors across one million pages, averaging 56.1 per page** (up 10.1% from 51 in 2025). **Six categories account for 96% of all detected errors, and they have been the same six for seven straight years.** These must be caught with essentially zero false negatives — they are both the most common failures in the wild and the failures AI-generated UI code reproduces most readily:

1. **Low contrast text — 83.9% of pages** (up from 79.1%; averaging 34 distinct instances per affected page, a 15% jump). SC 1.4.3. The single highest-value check.
2. **Missing alternative text for images — 53.1%** (down from 55.5%). SC 1.1.1, ACT `23a2a8`.
3. **Missing form input labels — 51.0%** (up from 48.2%). SC 1.3.1 / 3.3.2 / 4.1.2.
4. **Empty links — 46.3%** (up from 45.4%). SC 2.4.4 / 4.1.2, ACT `c487ae`. Overwhelmingly icon-only links — a signature AI-codegen failure.
5. **Empty buttons — 30.6%** (up from 29.6%). SC 4.1.2, ACT `97a4e1`. Same icon-only root cause.
6. **Missing document language — 13.5%** (down from 15.8%). SC 3.1.1. Trivially auto-fixable; `<html lang>` should simply be emitted.

Beyond the canonical six, four further classes belong in the top ten for a tool whose input is AI-generated component code:

7. **Broken/invalid ARIA — the fastest-growing risk.** WebAIM detected **133,589,803 ARIA attributes, over 133 per page, up 27% in one year and more than 6× the 2019 level. Pages with ARIA averaged 59.1 errors versus 42.0 on pages without it.** ARIA correlates with *more* failures, not fewer. This is precisely the "role is a promise" gap. Validate role/element combinations against ARIA in HTML, check required states and properties per role, and check `aria-labelledby`/`aria-describedby` ID references resolve. **This is `a11y-loop`'s strongest differentiator** — the failure class most specific to AI-generated code and least well served by generic scanners.
8. **Keyboard operability and focus management** — SC 2.1.1, 2.1.2, 2.4.3, 2.4.7, plus new **2.4.11 Focus Not Obscured (AA)**. Div-as-button and click-handler-without-keyboard-handler are archetypal codegen failures, and this class is largely invisible to static scanning, so it justifies the real-browser audit step.
9. **Heading structure and landmarks** — SC 1.3.1, 2.4.6. Compounded by rising complexity: average elements per home page reached **1,437 in February 2026, up 22.5% in a single year**.
10. **The WCAG 2.2 additions that codegen reliably misses** — **2.5.8 Target Size (Minimum)** (24×24 CSS px), **2.5.7 Dragging Movements** (single-pointer alternative required), **3.3.8 Accessible Authentication (Minimum)**, **3.3.7 Redundant Entry**, **3.2.6 Consistent Help**. Checking these is what makes the tool WCAG **2.2**-current rather than 2.1-current, and 2.5.8 in particular is well suited to automated measurement in a real browser.

**One design note the data supports:** the six dominant failures have been unchanged for seven years while error counts rise, which means the bottleneck is not detection — existing scanners already find these — but **fixing at the point of authoring**. That is the gap `a11y-loop` addresses by intervening in generation and then verifying in a real browser, and it is worth stating explicitly in the tool's own positioning.
