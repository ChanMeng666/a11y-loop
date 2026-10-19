# Competitive Landscape, Credibility & Agent Skills Standard — Briefing for `a11y-loop`

*Research current as of July 2026.*

---

## A1 — Competitive landscape

### Deque (the incumbent to be measured against)

Deque owns the substrate everyone builds on: **axe-core**. Commercial layers:

| Product | What it is | Relevance |
|---|---|---|
| axe DevTools Extension | DevTools panel, ~875,000 installs claimed | Human-driven, not agent-driven |
| axe DevTools Linter | 44 rules, IDE + CI, "block every inaccessible pull request" | Closest to "linter for generated code"; proprietary |
| axe Assistant | AI chatbot over Deque University KB | Advisory, not verifying |
| axe MCP Server | Official, public repo, but requires **paid axe DevTools subscription + API key + Docker** | Leaves space for an open MIT tool |

Deque's AI roadmap shows how a credible vendor hedges: a machine-vision ruleset that will "increase automated coverage by **up to 10% by volume**" with a "commitment to zero false positives"; AI-assisted guided tests the developer can "accept, reject, or refine". Note the claim shape: **bounded percentage, volume-qualified, human-in-the-loop, no compliance promise. Copy this register.**

Key number: Deque's study (13,000+ pages, ~300,000 issues) found **57% of accessibility issues completely covered by automated testing** — by volume. Practitioners put automation at 30–40% of real WCAG violations; Deque's own engineers debate it publicly (axe-core #4415).

### Others

- **Evinced** — enterprise AI a11y platform, $55M Series C. **Evinced MCP Tools run inside Cursor and GitHub Copilot** — the preventive-advice slot is already occupied at the enterprise tier. Closed-source, sales-gated.
- **Stark** — design-time (Figma/Sketch), different layer.
- **AudioEye** — overlay vendor at core. Reputational hazard: do not benchmark against it or borrow vocabulary.
- **Microsoft Accessibility Insights** — free, respected, not agent-integrated.
- **GitHub Copilot** — first-party guidance on exactly a11y-loop's premise: "Optimizing GitHub Copilot for Accessibility with Custom Instructions", "Copilot Custom Agents for Accessibility", an "Accessibility auditor" recipe in the customization library. Prompt-only; no verification. Prior art to beat, not ignore.

### The already-crowded Claude/agent skill space

| Project | Scale | Approach | Weakness to exploit |
|---|---|---|---|
| Community-Access/accessibility-agents | 367 stars, 79 agents, 18 skills | axe + Playwright runtime, SARIF, VPAT/ACR output | Breadth over depth; `curl \| bash` install |
| masuP9/a11y-specialist-skills | 54 stars, MIT | **Closest architectural precedent**: 4 skills wrapping npm pkg `@a11y-skills/audit` (focus appearance, reflow, text spacing, target size); Claude Code + Codex | Reactive audit framing; no generation-time defaults; doesn't foreground coverage limits |
| designedbysom/accessibility-linter | prompt-only | Best *framing*: "mid-design craft challenge, not compliance audit"; 3 tiers | **Zero verification** |
| airowe/claude-a11y-skill | 14 stars, 1 commit | axe via Claude-in-Chrome + eslint-plugin-jsx-a11y | Reactive only; abandoned |

**MCP servers are fully saturated** (Deque official + priyankark/a11y-mcp + at least 5 more). **Do not ship another axe MCP server.**

> *2026-10 addendum:* `a11y-loop mcp` ships a thin stdio server over a11y-loop's own loop (passes and states, its own checks, diff, manual checklist, contrast fixes, plan check), not over `axe.run()`. The note above still rules out an axe wrapper. The reasoning is in `AGENTS.md` under `src/commands/mcp.js`.

### Study hardest: AccessLint MCP

Cameron Cundiff, "Accessibility Tooling for Agentic Coding Loops" (dev.to) — the most sophisticated published thinking on agent-facing a11y tooling. `@accesslint/mcp` over `@accesslint/core` (92 rules / 23 WCAG 2.1 SC).

Adopt outright:
- **Closed set of machine-executable fix types**: add-attribute, set-attribute, remove-attribute, add-element, remove-element, add-text-content, suggest. "Not a report to interpret, but structured diagnostics it can act on directly."
- **Fixability tiers**: mechanical (deterministic) / contextual (needs DOM reasoning) / visual (needs rendered output). Lets a pipeline run mechanical-only batches and route the rest.
- **Per-rule context collection** front-loaded for single-pass fixes: for `button-name` — CSS class names, enclosing form labels, nearest heading; for `img-alt` — parent link href, figcaption, adjacent content.
- **Diff loop** matching violations by `ruleId + selector`, classifying FIXED / NEW / REMAINING so agent-introduced regressions surface immediately.
- **Benchmark** (25 HTML cases, 67 fixable violations, 3 runs, Claude Opus): 99.5% fixed with MCP vs 93.5% without; 23% fewer output tokens; 270s vs 377s; 0 vs 2 timeouts.

Its gaps (a11y-loop's openings): MCP-only (not portable as an Agent Skill), static-markup oriented (doesn't drive a live app through states), silent on generation-time behavior.

---

## A2 — The overlay controversy and what credibility requires

### The legal record

FTC filed against **accessiBe** January 3, 2025; final order April 2025: **$1 million** + prohibition on misleading claims. Core allegation: advertising `accessWidget` as able to "automatically comply" with WCAG 2.1 AA when it "failed to make many basic website components accessible." Also: **800+ businesses running accessiBe were sued anyway** — the "it protects you legally" claim is empirically dead.

Disability rights lawyer Lainey Feingold ("Beware of AI Accessibility Promises"): the deeper harm is that "by selling the false promise that a business need only use its faulty product," vendors "prevent American businesses from properly remediating their websites."

### The Overlay Fact Sheet (overlayfactsheet.com)

**800+ signatories** including WCAG/ARIA/HTML spec contributors and a11y staff at Google, Microsoft, Apple, Shopify, BBC. Technical findings that map onto what an automated agent loop must NOT claim to solve:
- "Automated application of text alternatives for images is not reliable"
- "Automated repair of field labels, error management, and focus control on forms is not reliable"
- "Automated repair of keyboard access is not reliable"
- Governing sentence: "these products' documented inability to repair **all** possible issues means that they cannot bring a website into compliance"

Model its honesty: it concedes "a non-trivial array of accessibility problems can be repaired." **Nuance is what makes it credible.** A tool that mirrors that register reads as an ally; one that mirrors overlay marketing reads as an enemy no matter how good the code is.

### Credibility requirements checklist

**Never say** (each maps to an FTC-charged or Fact-Sheet-refuted claim):
- "compliant" / "WCAG compliant" / "WCAG 2.2 AA compliant" as an outcome the tool produces
- "guarantees", "ensures", "certified", "fully accessible", "100%"
- "automatically fixes accessibility" / "makes your app accessible"
- "reduces legal risk", "protects you from lawsuits", "ADA compliant"
- "accessible by default" as an achieved *fact* rather than a default *posture*
- "no manual testing needed", "replaces audits", "replaces accessibility expertise"
- Any single score/grade presented as a compliance verdict

**Say instead:**
- "catches the subset of WCAG failures that automation can detect" — with the number and citation
- "verified against a real browser at the states we drove" — naming the states
- "these criteria require human judgment and assistive-technology testing" — with the specific list
- "does not constitute an accessibility audit or conformance claim"
- WCAG references as numbered success criteria with level + link to the W3C Understanding doc

**Disclosures to ship in README, SKILL.md body, and every CLI report:**
1. Coverage statement with a cited figure and its provenance.
2. Explicit not-covered list: descriptive quality of alt text, logical focus order, caption accuracy, error-message helpfulness, cognitive accessibility (COGA), reading level, media alternatives, anything needing a screen reader.
3. Tool + version provenance per report: axe-core version, browser version, URL, viewport, timestamp, which states were exercised.
4. Surface axe-core's `incomplete` results rather than suppressing them.
5. A generated manual-verification checklist scoped to the components actually built, plus pointers to real AT testing (NVDA, JAWS, VoiceOver, TalkBack) and to testing with disabled users.
6. **Never auto-generate alt text and present it as correct** — "hallucinated image descriptions" is a documented LLM-specific risk. Mark generated alt text as draft requiring human confirmation.
7. Attribute the rules engine — axe-core is MPL-2.0.

What earns respect: transparency about limits, correct WCAG citation, crediting axe-core/W3C rather than implying proprietary magic, engaging with the Fact Sheet's argument, and involving disabled users (the 2026 SLR found "few studies involve users with disabilities" — even a modest honest statement about who tested with which AT is differentiating).

---

## A3 — Research on accessibility of AI-generated code

**Baseline: AI-generated UI is inaccessible by default.**
- *Does ChatGPT Generate Accessible Code?* (W4A'24): **84% of the websites ChatGPT (GPT-3.5) generated had accessibility problems**, as found by automated checkers.
- Simon Miner (IAAP), "AI-Generated Code is Inaccessible by Default" (May 2026): "Bad patterns are not edge cases in the training set. They *are* the training set." Failure taxonomy (ready-made ruleset spec): clickable divs instead of buttons, skipped heading levels, hidden focus indicators, missing/mismatched labels, ignored reduced-motion, content updates unannounced to AT, broken SPA focus management, inaccessible live regions.

**Prompting helps but leaves gaps.**
*When LLM-Generated Code Perpetuates UI Accessibility Barriers…* (W4A'25): accessibility-oriented prompts **cut expert-judged violation rates from 58% to 19%** (one automated tool, MAUVE++, showed a slightly higher rate, 17.32% vs 15.93%), but persistent barriers remained, particularly in semantic structure, alt text and status messages. One task (a banking-app homepage), two models (Claude 3.5 Haiku and GPT-4-turbo), 40 first-pass UIs, no verification loop tested. This supports pairing instructions with verification; it does not show that instructions alone fail.

**Structured tool-assisted pipelines beat naked prompting by a wide margin.**
- **AccessGuru**: detection **82%** vs standard LLM baseline **31%**; correction **74%** vs **16%**.
- A11YN (arXiv 2510.13914): GRPO training against a WCAG-violation reward — inaccessibility rate down 60%, not to zero. Verification still required.

**LLMs are decent judges of the semantic gap automation can't reach.**
*Measuring the Semantic Accessibility Gap in LLM-Generated Web UIs* (CHI 2026 EA): LLM judges detect non-descriptive alt text and vague link purposes at **80–92% recall**. Licenses an "LLM-assisted semantic review" tier, clearly labeled heuristic, between the deterministic axe pass and human review.

**2026 systematic review — anchor citation** (*LLMs for Web Accessibility: A Systematic Literature Review*, arXiv:2605.13873, 33 studies): ChatGPT 3.5 fixed 46–47% of violations; **"broken ARIA references" identified as an emergent, LLM-specific failure mode**; open gaps — COGA barely covered, few studies involve users with disabilities, "hallucinated image descriptions" and "misleading compliance claims" named as novel risks.

---

## B — Agent Skills standard, exactly

Anthropic released Agent Skills as an **open standard December 18, 2025**. Spec: https://agentskills.io/specification. Validator: `skills-ref validate ./my-skill`.

### Directory structure

```
<skill-name>/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
└── assets/           # Optional: templates, resources
```

### Frontmatter (portable across all clients)

| Field | Required | Constraints |
|---|---|---|
| `name` | Yes | 1–64 chars; lowercase alphanumeric + hyphens; no leading/trailing/consecutive hyphens; **must match parent directory name** |
| `description` | Yes | 1–1024 chars; what it does AND when to use it; include matchable keywords |
| `license` | No | Short name or bundled-file reference |
| `compatibility` | No | 1–500 chars; environment requirements (a11y-loop needs: Node + a browser) |
| `metadata` | No | String map; namespace keys |
| `allowed-tools` | No | Space-separated; experimental, support varies |

### Progressive disclosure budget

1. Metadata (~100 tokens) — loaded at startup for every installed skill
2. Instructions (<5,000 tokens; **keep SKILL.md under 500 lines**) — loaded on activation
3. Resources (`scripts/`, `references/`, `assets/`) — on demand; **unused bundled content costs nothing**

File references: relative paths from skill root, one level deep. **When the agent runs a script, the script's code never enters the context window — only its output costs tokens.** This is the economic case for skill+CLI.

### Cross-agent portability (2026)

40+ client implementations: Claude Code, Claude.ai, OpenAI Codex, GitHub Copilot, VS Code, Cursor, Gemini CLI, Goose, Amp, Roo Code, OpenHands, JetBrains Junie, etc. Staying inside the spec's six fields + a plain Node CLI = one artifact works across all of them. **Portability is the cheapest differentiator available.**

### Claude Code extensions (use, degrade gracefully)

- ~~`paths` — glob gating for auto-activation. `paths: ["**/*.tsx","**/*.jsx","**/*.vue","**/*.svelte","**/*.html"]` solves "triggers too often" structurally.~~ **Corrected 2026-07-31 — do not act on this.** `paths` does not narrow an always-listed skill; it gates one. Claude Code partitions skills on load: a skill declaring a non-empty `paths` and not yet activated is held in a separate `conditionalSkills` registry and kept *out* of the skill listing the model can see, until a matching file is touched (`[skills] Activated conditional skill '<name>' (matched path: …)`). Its own frontmatter doc string says so: *"The skill only loads when the model touches matching files."* For a skill that must fire during planning — before any UI file exists — or on an audit request naming only a URL, that is fatal, not selective. `paths` was removed from `SKILL.md`; the `description` is the trigger, and it is the only one that works across all 40+ clients. Solve over-triggering in the description's negative clauses instead (see `evals/trigger-evals.json`).
- `allowed-tools` with `${CLAUDE_SKILL_DIR}` substitution (v2.1.129+) — skill runs its own bundled CLI without permission prompts; degrades to a prompt on older versions:

```yaml
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/a11y-loop.js *)
```

- `context: fork` + `background` for long audits; `hooks` for a genuinely automatic loop (PostToolUse noticing UI file edits); `when_to_use`, `argument-hint`, `model`, `effort`.
- **Lifecycle fact:** SKILL.md enters the conversation once and **persists all session** — write generation rules as **standing instructions** ("for the remainder of this session, when you write UI…").
- Description-triggering: listing budget 1% of context window; description + when_to_use capped at 1,536 chars; put the key use case first. Malformed YAML silently kills automatic triggering (`--debug` shows parse errors).

### Distribution

- Project: `.claude/skills/<name>/`; Personal: `~/.claude/skills/<name>/`
- Plugin (bundles skills + hooks + MCP config): `skills/` + `.claude-plugin/marketplace.json`; `/plugin marketplace add owner/repo`
- `npx skills add <owner/repo>` installs from GitHub
- Community registries: claude-plugins.dev, netresearch/claude-code-marketplace (markets Agent-Skills portability)

Strongest story for a11y-loop is dual: `npx a11y-loop` for CI and non-Claude agents, plus a plain `SKILL.md` any skills-compatible agent can drop in, plus a plugin/marketplace entry.

### Evals — do this; it is itself a credibility artifact

skill-creator plugin automates: test cases in `evals/evals.json`, one subagent per case, assertion grading, **with-skill vs without-skill benchmark**, blind A/B, description tuning with should-trigger/should-not-trigger hit rates. For a11y-loop this is the evidence answering W4A'25. A published benchmark ("N UI generation tasks, violations per task with and without a11y-loop, token/time overhead") converts a11y-loop from another skill into a defensible claim. Only AccessLint has one — doing it puts a11y-loop in a category of two.

---

## Gap analysis — what nobody does yet that a11y-loop could own

1. **Closed-loop generation, not audit-after.** The pairing — standing generation rules + mandatory verification whose failures feed back — is unoccupied, and W4A'25 found that even with accessibility-oriented prompts, barriers persisted in the generated code.
2. **State coverage.** Nobody systematically drives the *states the agent just built*: modal open, menu expanded, form in error, async content loaded, post-route-change focus. Where the SPA-focus/live-region failure taxonomy actually lives; axe-on-load finds nothing there. **Most defensible technical claim available; natural fit for "loop".**
3. **The not-covered list as a first-class output.** Per-run scoped manual-verification checklist naming the components built and the criteria automation could not judge + axe `incomplete` passed through. The direct inverse of overlay marketing.
4. **AI-specific ruleset** targeting failure modes of *generated* code (clickable divs, hidden focus, skipped headings, ignored reduced-motion, broken ARIA references), each rule citing the research motivating it.
5. **Portability** via the Agent Skills open standard (everything else except masuP9 is Claude-only).
6. **Zero-infrastructure install**: `npx a11y-loop` + one SKILL.md; runs in CI.
7. **Published with/without benchmark** (category of two, with AccessLint).
8. **COGA + disabled-user involvement** — both named open gaps in the 2026 SLR; even modest honest positions differentiate.

**Do not:** ship another axe MCP server; try to out-breadth Community-Access; generate alt text presented as final; produce a single accessibility score; claim compliance, coverage completeness, or legal protection.

**Positioning sentence that survives community scrutiny:** *a11y-loop makes AI coding agents write accessible UI by default, then proves what it can prove with a real browser audit across the states it built — and tells you exactly what it could not check.*

---

*Key sources: ftc.gov accessiBe orders (Jan/Apr 2025) · overlayfactsheet.com · lflegal.com · dev.to/cameron-accesslint (AccessLint MCP) · W4A'24 10.1145/3677846.3677854 · W4A'25 10.1145/3744257.3744266 · arXiv:2510.13914 (A11YN) · CHI 2026 10.1145/3772363.3799364 · arXiv:2605.13873 (SLR) · arXiv:2507.19549 (AccessGuru) · pedalpoint.com "AI-Generated Code is Inaccessible by Default" · agentskills.io/specification · code.claude.com/docs/en/skills · github.com/anthropics/skills · accessibility.github.com Copilot guides.*

---

## Update 2026-10

*Researched 2026-10-19, written 2026-10-20. Baseline: the July 2026 text above, which is left unedited; where it conflicts with this section, this section is later. Flags: **[V]** read from a repo, registry, release page or primary source; **[V-sec]** seen only through a vendor or press page, so treat as reported; **[I]** inferred. Other agent products appeared in the same window; this section covers only the ones that bear on a11y-loop. Distribution channels are in [distribution.md](distribution.md).*

### Deque: the axe agent products

| Item | What it is | Date | Source | Relation to a11y-loop |
|---|---|---|---|---|
| `dequelabs/axe-accessibility` (Claude Code plugin) | Four skills (`mcp-usage`, `mcp-setup`, `mcp-generate-instructions`, `mcp-audit`) over Deque's MCP server. `mcp-audit` runs analyze, remediate, verify "until automated accessibility violations hit zero" or a round cap; guided tests for keyboard, interactive elements and modal dialogs. MIT; 1 star. Needs a paid Axe DevTools subscription. Commit messages of 2026-10-06 read "address plugin directory review findings", so it was being prepared for Anthropic's plugin directory [V] | Created 2026-06-05; last push 2026-10-06 | <https://github.com/dequelabs/axe-accessibility> | Same loop shape from the engine vendor. The July text above says the paid MCP "leaves space for an open MIT tool"; that space is now partly contested by a plugin. a11y-loop's remaining differences are that it is free and open, has a plan phase, and ends every run with a list of what it could not check [I] |
| Deque axe MCP Server | Public repo `dequelabs/axe-mcp-server-public` (proprietary licence, 8 stars). npm `axe-mcp-server` 1.7.0 (2026-10-16), about 2,100 downloads a week. Tools `analyze` and `remediate`; needs an Axe DevTools for Web subscription and an API key or OAuth; runs from npm (Node 22.19 or later) or Docker. Since server 1.4.0, `analyze` merges screenshot, computer-vision and LLM findings flagged `isAdvanced`; Deque's guidance treats `isAdvanced: false` as authoritative and `true` as "a strong signal to verify, not a verdict" [V] | Repo created 2026-02-10 | <https://github.com/dequelabs/axe-mcp-server-public>, <https://www.npmjs.com/package/axe-mcp-server> | Deque separates deterministic rules from heuristic findings in its own output, the same distinction a11y-loop draws between violations and needs-review. The July advice not to ship another axe MCP server stands |
| axe-core 4.13.0 and 4.14.0 | 4.14.0 enables `label-content-name-mismatch` (SC 2.5.3) by default; see the [tooling.md](tooling.md) update | 4.13.0 2026-08-05; 4.14.0 2026-10-05 | <https://github.com/dequelabs/axe-core/releases> | a11y-loop pins 4.14.0 exactly |

Deque press: searches found no Deque press release or blog post for September or October 2026. That is absence of evidence [I].

### Overlay and platform vendors entering agent workflows

All four rows are [V-sec]: vendor announcements or press coverage, not tested.

| Vendor | What | Date | Source | Relation |
|---|---|---|---|---|
| AudioEye | "Agentic Audits" (an agent opens menus, types into fields, navigates checkout; the vendor claims "up to 50% more high-severity issues than automation alone") and an SDK MCP. Copy quoted here as the vendor's own: "ship compliant code from the start", "lower legal risk", "protection against lawsuits". No pricing listed | 2026-10-08 | <https://finviz.com/news/400365/audioeye-launches-agentic-audits-and-sdk-mcp-enhancing-the-industrys-strongest-compliance-protection> | The honesty red line in [AGENTS.md](../../AGENTS.md) is now a visible market contrast, not only a defensive rule. Section A2 above still applies: do not benchmark against it or borrow its vocabulary |
| accessiBe | "Code Agent" in accessFlow: reviews GitHub pull requests against WCAG 2.2 AA, marks the line, proposes an inline fix, severity levels, accept or dismiss. Beta for eligible customers. Earlier, an accessFlow MCP server for Copilot and Cursor (2025-12-23) | 2026-09-17 | <https://support.accessibe.com/hc/en-us/articles/37026392065682-accessFlow-Code-Agent-overview> | Vendor of the product the FTC ordered to pay $1 million (2025, section A2). A vague claim from a11y-loop would be filed in the same bucket |
| Siteimprove | MCP server wiring its Accessibility Agent into Claude, Lovable, VS Code and Figma; agent-to-agent audits during generation. Press coverage is thin; detection accuracy not independently evaluated | 2026-06-30 | <https://letsdatascience.com/news/siteimprove-launches-mcp-server-to-embed-accessibility-in-ai-76d12655> | Enterprise, closed |
| UserWay | "FixMyCode.ai", a coding assistant "trained with expertise in digital accessibility and ADA compliance" (the vendor's wording). Date not confirmed | not verified | <https://itwire.com/business-software/accessibiity-firm-userway-launches-coding-assistant-fixmycode-ai.html> | Overlay-vendor vocabulary; same caution |

### Agent skills and plugins

| Project | What it is (2026-10-19) | Date | Source | Relation |
|---|---|---|---|---|
| AccessLint skills | `AccessLint/skills`: 107 stars, five Agent Skills (`accessibility-scan`, `-inspect`, `-audit` with WCAG-EM sampling and per-criterion pass/fail/undetermined, `-fix`, `-diff`). Findings graded on severity and evidence basis (verified, confirm with a human, human-required). Hosted MCP connector. Own rule engine, not axe. A published calibration benchmark scored against an independent hand-labelled oracle. `@accesslint/core` about 7,700 downloads a week, about 360 times a11y-loop's [V] | Created 2025-10-31; last push 2026-08-25 | <https://github.com/AccessLint/skills> | **Supersedes two statements in the July text:** AccessLint is no longer "MCP-only", and a benchmark no longer puts a11y-loop in "a category of two". Its honesty register is shared with a11y-loop, so honesty does not differentiate against it. Still different: a11y-loop's plan phase and plan gate, five fixed rendering passes, `contrast --fix`, and axe-core as a third-party engine. a11y-loop's own benchmark (N=6, self-audited, [results](../../evals/benchmark-results.md)) is evidence, not a claim of parity |
| smukh/a11y-agent-skills | 11 stars, MIT. Twelve portable skills, deterministic Playwright and axe core, `scan --state --route`, `verify --baseline` by fingerprint, regression-test generation, an MCP server and a GitHub Action. `@a11y-agent/*` packages at 8-9 downloads a week each [V] | Created 2026-09-05; last push 2026-09-15 | <https://github.com/smukh/a11y-agent-skills> | Highest functional overlap with the loop, state driving and fingerprint diff. It weakens gap 2 above ("nobody systematically drives the states the agent just built"): say instead that a11y-loop runs agent-written states through five rendering passes and judges convergence by fingerprint `diff`. No plan phase found in its README [I] |
| Community-Access/accessibility-agents | 426 stars (367 in July); v6.0.0 added Codex packaging and enforced specialist dispatch [V] | v6.0.0 2026-06-15 | <https://github.com/Community-Access/accessibility-agents> | Unchanged verdict: breadth over depth |
| masuP9/a11y-specialist-skills | 60 stars (54 in July); six skills; Claude Code and Codex plugin marketplaces; Japanese README [V] | pushed 2026-10-16 | <https://github.com/masuP9/a11y-specialist-skills> | Unchanged: closest architectural precedent |
| kinti/a11y-toolkit | 2 stars; 31 MCP tools; a 0-100 score, VPAT 2.5 draft, EAA statement generator, and the claim "51 of 55 A/AA criteria carry automated signals (93%)" (the project's claim) [V] | pushed 2026-10-18 | <https://github.com/kinti/a11y-toolkit> | Opposite philosophy (a score). Its 93% sits against Deque's 57% by volume and the lower practitioner figures in [tooling.md](tooling.md) section 9 |
| MCP Registry | 21 results for "accessibility", about 12 distinct servers; several sell a score, a grade or VPAT 2.5 reports [V] | 2026-10-19 | <https://registry.modelcontextprotocol.io> | Saturated, as the July text says |

### Chrome DevTools MCP

`ChromeDevTools/chrome-devtools-mcp`: 53,806 stars, 1.44 million downloads a week, version 1.11.0 (2026-10-15; 1.0.0 was 2026-05-18). Its `lighthouse_audit` tool covers accessibility, SEO and best practices, and a snapshot mode analyses the current page state. It ships an `a11y-debugging` skill (since about February 2026) that tells the agent to use Lighthouse, the accessibility tree, `press_key`, and tap-target and contrast snippets [V]. Source: <https://github.com/ChromeDevTools/chrome-devtools-mcp>.

Relation: this is the same "skill plus real browser" lane as a11y-loop, maintained by Google and distributed several orders of magnitude wider; the July text does not mention it. a11y-loop does not compete on distribution. The differences to state: it is score-first and a11y-loop gives no score; it analyses one current state at a time while a11y-loop runs five rendering passes over each state the agent built; it has no plan phase and no convergence `diff`. Expect "why not Chrome DevTools MCP?" as one of the first questions on any launch thread.

### Correction: how to cite W4A'25

The July text above (section A3) and some other repo files describe W4A'25 as showing that prompting alone is not enough, or that accessibility-oriented prompts produced a *higher* violation rate. **Do not cite W4A'25 as "prompting doesn't work".** Gurita and Vatavu, "When LLM-Generated Code Perpetuates User Interface Accessibility Barriers, How Can We Break the Cycle?", W4A 2025, <https://doi.org/10.1145/3744257.3744266>. The authors' PDF (<https://mintviz.usv.ro/publications/2025.W4A.3.pdf>) was read in full on 2026-10-19:

- Abstract: "accessibility-oriented prompts increase success counts and reduce violation rates in WCAG criteria, but persistent barriers remain, particularly in semantic structure."
- Expert evaluation (two accessibility experts, ten WCAG criteria): violation rate 58.0% with accessibility-agnostic prompts against 19.0% with accessibility-oriented prompts; average severity score 1.53 to 0.30 (-80.4%).
- The 17.32% against 15.93% figure is a single cell of Table 2: the "Violation Rate (VR)" row of the automated MAUVE++ run, 17.32% for the oriented condition and 15.93% for the agnostic one, beside higher success counts for focus visibility, info and relationships, and parsing in the same table (section 4.1.1). The July text quoted this one sub-measure as if it were the paper's conclusion. The authors' own reading (section 5.1) is that "the stark difference in violation rates in our experiment indicates the effectiveness of explicit accessibility guidance integrated into prompts", and also that prompting "does not automatically translate into comprehensive implementation across all criteria".
- Scope: one task ("design the homepage of a banking app"), two models (Claude 3.5 Haiku and GPT-4-turbo), 10 UIs per model and prompt cell (40 first-pass UIs; 80 with the self-reflection rewrites), a February 2025 snapshot. The oriented condition was a one-line prompt naming WCAG 2.1 AA requirements, not a skill and not followed by any audit.
- No verification loop was measured, so the paper can neither show nor rule out that a loop is needed.

Defensible wording: *accessibility-oriented prompting cut expert-judged violation rates from 58% to 19% in one 2025 study, but barriers persisted, especially in semantic structure; the study did not test a verification loop.* Likewise W4A'24 (Aljedaani et al., <https://doi.org/10.1145/3677846.3677854>): 84% of the websites produced by 88 developers prompting ChatGPT (GPT-3.5) had accessibility problems as found by automated checkers, not "84% of AI-generated pages". The ACM pages returned HTTP 403 to scripted fetches; W4A'24 details beyond its abstract come from a third-party summary and are not verified against the paper.

### Regulation dates verified against primary sources

Full text and quotes are in [standards.md](standards.md) section 5.

- **ADA Title II web rule.** DOJ interim final rule, 91 FR 20902, published and effective **2026-04-20** (not 17 April): state and local governments with a population of 50,000 or more move from 24 April 2026 to **26 April 2027**; entities under 50,000 and special district governments move from 26 April 2027 to **26 April 2028**. The standard stays WCAG 2.1 AA; only the dates moved. Primary: <https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web>; DOJ's own page: <https://www.ada.gov/resources/web-rule-first-steps/>. Comments closed 2026-06-22 [V-sec]. A court challenge is reported by one source and not confirmed.
- **HHS Section 504.** The July text says HHS did not match the extension. It did: 91 FR 25496, published 2026-05-11, effective 2026-05-07; recipients with 15 or more employees move to **11 May 2027** and those with fewer than 15 to **10 May 2028**. Primary: <https://www.federalregister.gov/documents/2026/05/11/2026-09266/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web>.
- **EN 301 549 V4.1.1** (WCAG 2.2 AA): online publication 2 September 2026; binding with a presumption of conformity only after citation in the Official Journal, expected 16 December 2026 per the Irish NDA (<https://nda.ie/news/en301549-published>) or about 30 November 2026 per Deque. Both dates are recorded in [standards.md](standards.md); no primary source seen settles which is right.
- None of this supports an outcome claim about legal exposure. The honest use is a jurisdiction note with dates and an "as of" stamp.

### Further competitor and platform detail (2026-10-19)

Counts are GitHub stars and npm downloads for the week 2026-10-10 to 2026-10-16, read on 2026-10-19 [V] unless marked. The source research report is no longer on disk; this section preserves its figures.

| Project | Detail | Source |
|---|---|---|
| AccessLint ecosystem | Claude plugin `accesslint@accesslint`; install `npx skills add AccessLint/skills`; hosted connector at `mcp.accesslint.com`; `@accesslint/core` 7,684 a week, `@accesslint/mcp` 654 a week, `@accesslint/cli` 0.13.0; also Jest, Vitest and Playwright matchers, a Storybook addon and `@accesslint/source` (static JSX audit). Licence type not verified | <https://github.com/AccessLint/skills> |
| masuP9/a11y-specialist-skills | `@a11y-skills/audit` 0.15.0, 1,273 a week | <https://github.com/masuP9/a11y-specialist-skills> |
| squirrelscan | 286 stars, 1,301 downloads a week; general website QA for agents, 300+ rules of which 61 are accessibility | <https://github.com/squirrelscan/squirrelscan> |
| real-a11y/real-a11y-dev | 2 stars, beta; semantic tree as data: CLI, testing library, MCP, Storybook addon, Chrome extension | <https://github.com/real-a11y/real-a11y-dev> |
| Gemini CLI extension | `gemini-cli-extensions/web-accessibility`: 85 stars, created 2025-12-12, last push 2026-02-20; dormant | <https://github.com/gemini-cli-extensions/web-accessibility> |
| github/awesome-copilot | 40.2k stars; carries `accessibility.agent.md`, `accessibility-runtime-tester.agent.md` and `a11y.instructions.md` | <https://github.com/github/awesome-copilot> |
| anthropics/skills, anthropics/claude-plugins-official | 182k and 42.8k stars; no accessibility skill or plugin in either on 2026-10-19 | repository trees |
| Older axe MCP wrappers | `ronantakizawa/a11ymcp` 93 stars, `JustasMonkev/mcp-accessibility-scanner` 57, `priyankark/a11y-mcp` 53 | GitHub |
| Adjacent UI-quality skills | `addyosmani/web-quality-skills` 2,961 stars (Lighthouse-based), `plugin87/ux-ui-agent-skills` 2,310 ("WCAG 2.2 AA-AAA"), `miqdadbadjuber/anti-slop` 6,456. Descriptions read only | GitHub |
| MCP Registry examples that sell a score | `com.lazynext/accessibility-checker` ("weighted score"), `com.ratedwithai/accessibility-checker` ("score, grade"), `io.github.groundlogic-ai-source/accessibility-ai` ("VPAT 2.5 compliance reports"); the last is the registry entry's own wording | <https://registry.modelcontextprotocol.io> |
| Cypress Cloud MCP | Accessibility triage support announced 2026-04-08 [V-sec] | <https://www.cypress.io/releases/cypress-cloud-mcp-accessibility-support> |
| Evinced, Stark, Level Access, Allyant | Searches returned nothing for 2026 agent launches. Not researched beyond search; do not read this as "nothing happened" | web search |

Where a11y-loop is weaker than the closest competitors, per that research: AccessLint has an independent calibration benchmark, WCAG-EM site sampling, `file:line` source mapping, test-runner matchers and hosted persistence; smukh has regression-test generation, specialist component skills, a GitHub Action and an MCP server; masuP9 has a Japanese localisation, a per-criterion knowledge base and a text-spacing check. GitHub Copilot's first-party material ("Optimizing GitHub Copilot for Accessibility with Custom Instructions", "Copilot Custom Agents for Accessibility") remains prompt-only with no verification, as the July text says.

A plan-phase gate was not found in any competitor README that was read [I]; Community-Access's "enforced dispatch" is the nearest and works at the agent-routing level.

### Research since July

| Paper | Date | Finding | Source |
|---|---|---|---|
| "From Blind Edits to Verified Repair", arXiv:2608.24913 | submitted 2026-07-26 | Unverified LLM edits: 24 improvements against 20 regressions in 100 trials. A repair loop that accepts a change only if violations strictly decrease detected 57 of 57 seeded violations and rejected 126 of 126 harmful candidates. Small 7B to 14B models. Supports the design in which `diff` flags NEW findings | <https://arxiv.org/abs/2608.24913> |
| "Agentic Web Accessibility Auditing", arXiv:2609.09379 | 2026-09-08 | Per-criterion vision-language agents on 40 WCAG requirements: recall 86% (67 of 78) against axe-core's 36%, precision only 56%; found 9 of 10 keyboard-trap cases both baselines missed. The ceiling and the precision cost of agentic audit; supports a labelled heuristic tier, not a verdict tier | <https://arxiv.org/abs/2609.09379> |
| "LLM Based Web Accessibility Repair", arXiv:2605.27716 | 2026-05-26 | Kimi K2.5: 99.7% of fixes syntactically valid; violations per file 3.98 to 1.7; fewer than 26% fully resolved; about 30% of patches changed structure; iterative refinement cost 52% more with no gain. Argues for bounded loops and oscillation detection | <https://arxiv.org/abs/2605.27716> |
| A11YRepair, arXiv:2606.21926 | 2026-06-20 | Clusters violations by root cause with WCAG-driven knowledge; A11YBench of 60 GitHub projects; patches merged upstream | <https://arxiv.org/abs/2606.21926> |
| Calo, Gurita, De Russis, CHI EA '26 | 2026-04 | 541 semantic violations in 300 LLM-generated UIs; LLM-as-judge recall 80 to 92% in fault injection [V-sec] | <https://dl.acm.org/doi/10.1145/3772363.3799364> |
| arXiv:2608.05116 and arXiv:2606.10311 | 2026-08 and 2026-06 | Visual accessibility of AI developer tools themselves; how developers engage with accessibility in LLM-assisted development. Abstracts not read | <https://arxiv.org/pdf/2608.05116>, <https://arxiv.org/html/2606.10311> |
| WebAIM Million 2026 (February 2026 data) | 2026 | 95.9% of home pages with failures; 56.1 errors per page; low contrast 83.9%; empty links 46.3%; empty buttons 30.6%; missing form labels 51%. Pages with ARIA averaged 59.1 errors against 42.0 without, with WebAIM's own caveat that pages with more ARIA are also more complex (so the comparison is not causal). Mentions "vibe coding" as a possible contributor | <https://webaim.org/projects/million/> |

No 2026 study of axe results on Lovable, v0 or Bolt output was found [I].

### Regulation, further detail

- **EAA enforcement.** In force since 2025-06-28. As of early October 2026 no confirmed fine under the EAA anywhere in the EU was found; enforcement so far is court orders, regulator action and private warning letters in Germany [V-sec, vendor blogs: <https://accessdrum.com/en/one-year-of-eaa-enforcement-measured-in-court-orders/>]. France: a Carrefour court order of 2026-06-04 to make site and app accessible within six months or face daily penalties (EUR 500 a day reported), rejecting a "71% compliant" defence on the reasoning that a standard is met in full or not at all; Auchan dismissed in 2026-05 on procedural grounds (turnover threshold) with the court recording that the site does not meet the standard, appeal reported. Spain: a EUR 90,000 fine on Vueling upheld (predates the EAA deadline). Norway: an inspection-based penalty of NOK 50,000 a day since 2025-12-19 (not a court order, not EAA). No case naming AI-generated code or overlays was found [I].
- **DOJ's stated reasoning.** The DOJ said it "overestimated the capabilities (whether staffing or technology) of covered entities" and that automated remediation tools are not yet reliable enough [V-sec: <https://www.duanemorris.com/alerts/doj_extends_ada_title_ii_digital_accessibility_deadlines_one_year_0426.html>]. Litigation challenging the rule is reported by Lainey Feingold (<https://www.lflegal.com/2026/03/title-ii-action-needed/>); not confirmed here. A GAO report of 2026-05-05 treats the DOJ rule as a major rule under the Congressional Review Act (search result summary, not read).
- **WCAG 3.0.** Latest W3C Working Draft is dated 2026-09-10 (<https://www.w3.org/TR/2026/WD-wcag-3.0-20260910/>); it "does not deprecate WCAG 2". Candidate Recommendation timing remains third-party speculation (Q4 2027 per AbilityNet); the conformance tier names could not be confirmed.
- **EN 301 549 V4.1.1** secondary sources: <https://www.dwt.com/insights/2026/09/european-accessibility-act-ict-standards-update>, <https://www.deque.com/fr/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/>.
