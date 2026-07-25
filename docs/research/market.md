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
- *Does ChatGPT Generate Accessible Code?* (W4A'24): **84% of generated websites had accessibility issues.**
- Simon Miner (IAAP), "AI-Generated Code is Inaccessible by Default" (May 2026): "Bad patterns are not edge cases in the training set. They *are* the training set." Failure taxonomy (ready-made ruleset spec): clickable divs instead of buttons, skipped heading levels, hidden focus indicators, missing/mismatched labels, ignored reduced-motion, content updates unannounced to AT, broken SPA focus management, inaccessible live regions.

**The killer finding: prompting alone is not enough.**
*When LLM-Generated Code Perpetuates UI Accessibility Barriers…* (W4A'25): UIs generated with **accessibility-oriented prompts had a slightly *higher* violation rate (17.32%) than accessibility-agnostic prompts (15.93%)**. **This is the strongest argument for a11y-loop's architecture: a skill that only injects accessibility instructions is not demonstrably effective. The verification loop is the product; the instructions are the setup.**

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

- `paths` — glob gating for auto-activation. `paths: ["**/*.tsx","**/*.jsx","**/*.vue","**/*.svelte","**/*.html"]` solves "triggers too often" structurally.
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

1. **Closed-loop generation, not audit-after.** The pairing — standing generation rules + mandatory verification whose failures feed back — is unoccupied, and W4A'25 proves the generation half alone is insufficient.
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
