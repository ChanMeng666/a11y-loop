# Distribution Channels & Directory Mechanics — Briefing for `a11y-loop`

*As of 2026-10-20. Researched 2026-10-19; the status column was updated on 2026-10-20 from the maintainer's report. Companion to [market.md](market.md) (who else is in the space), [tooling.md](tooling.md) and [standards.md](standards.md).*

Evidence flags: **[V]** read from a primary page, API or repo, or by running the tool, on 2026-10-19/20. **[M]** reported by the maintainer; the research logs do not record it. **[S]** reported by a research sub-agent with a source URL, not re-fetched. **[U]** not verified.

---

## (a) Channel table

Statuses come from the 2026-10-19 sweep logs and the maintainer's report. Where they disagree, the logs win and the difference is stated in the notes under the table. Channels that require human-written text (see the rules column and the table after it) were filled in by the maintainer by hand. Much of this repository's documentation is written with AI coding agents, so launch copy for those channels deliberately is not. The two pull requests and the ruanyf issue were opened on 2026-10-19 from the research session's logs; the logs do not say who wrote each sentence, and that is not verified here.

| Channel | Mechanics | Rules (including bans on AI-written text) | Status | URL of what was submitted |
|---|---|---|---|---|
| awesome-a11y (brunopulis, 1,996 stars) | Pull request: one row in `topics/tools.md`, alphabetical, after `a11y-checker` | README excludes overlay tools. No AI-text rule found [V] | PR open on 2026-10-19; many other PRs already queued | <https://github.com/brunopulis/awesome-a11y/pull/341> |
| awesome-accessibility (lukeslp, 92 stars) | Pull request: one line in "AI tools for builders", alphabetical, limits and licence stated per its CONTRIBUTING | No AI-text rule found [V] | PR open on 2026-10-19 | <https://github.com/lukeslp/awesome-accessibility/pull/113> |
| ruanyf/weekly (阮一峰《科技爱好者周刊》) | New issue titled 【开源自荐】; the README says to submit an issue and designates no comment thread | English-only projects are included [S]. Chinese AI-content labelling measures apply to Chinese platforms since 2025-09-01 [S]; the issue body was written in Chinese by the maintainer and includes an honest-limits paragraph | Posted 2026-10-19 | <https://github.com/ruanyf/weekly/issues/12549> |
| skills.sh | No submission. Indexed from anonymous install telemetry of `npx skills add owner/repo` | None | Indexed. `/ChanMeng666/a11y-loop` returned 404 on 2026-10-19 morning and, after a real install, 308 then 200 listing skill `a11y-loop` with 0 installs [V] | <https://www.skills.sh/chanmeng666/a11y-loop> |
| W3C WAI Evaluation Tools List | Web form (3 sections). The email address is published on GitHub, so the submitter must consent to that. Fields: name, URL, vendor, email, release date, description (350 characters), purpose, product evaluated, standards, tool type, licence | Eligible: evaluation software. Excluded: assistive technology, tools that mainly change content, checklists. a11y-loop both evaluates and suggests contrast fixes, so it is described as an audit tool. W3C staff availability is limited; full processing is expected to resume in November 2026 [V] | Submitted by the maintainer by hand, 2026-10-19/20 [M]. Not submitted when the logs were written, because an agent cannot give the publish-my-email consent | Form: <https://www.w3.org/WAI/test-evaluate/tools/submit-a-tool/>. Resulting GitHub item: not verified |
| github/awesome-copilot | "External plugin submission" issue form (`external-plugin.yml`). Needs a release tag or 40-character SHA. Automated `vally lint`, an install smoke test, then human approval; re-reviewed about every six months [V] | Rejects content frontier models already produce, so the pitch leads with the CLI audit loop. No AI-text rule found. Copilot CLI compatibility was inferred from docs and not tested | Submitted by the maintainer by hand, 2026-10-19/20 [M]. The prepared values named ref `v0.3.0` at `694fc3f`; the ref actually submitted is not recorded | Form: <https://github.com/github/awesome-copilot/issues/new?template=external-plugin.yml>. Resulting issue: not verified |
| axe-con 2027 call for speakers | Web form. Talks are 50 minutes (about 40 of content, 10 of questions), English only. Tracks: Development (names AI and axe-core), Design, Organizational Success, Wildcard. Event 23-24 February 2027, virtual | Pitch a method talk, not a product demo. Page says nothing about product pitches or AI text [V]. Closes Friday 30 October 2026, 5:00 pm PT; notification by 13 November | Submitted by the maintainer by hand, 2026-10-19/20 [M] | Call: <https://www.deque.com/axe-con/call-for-speakers/>. Submission: no public URL |
| Anthropic plugin directory | Portal at `claude.ai/directory/manage` -> Submit new -> Plugin bundle. Paid claude.ai plan required. Details in section (b) | Terms and Directory Policy; four attestations on the Compliance step. Every version is scanned; a person reviews a new listing before it goes live | Submitted by the maintainer by hand, 2026-10-19/20 [M]. At the last log capture (2026-10-20) the manage page listed only two other submissions and the a11y-loop wizard was an unsaved draft on step 1 of 5 | No public URL: the portal shows the status, not a public listing, until published |
| HelloGitHub (月刊) | Issue form on the website, not on GitHub (blank issues are disabled); sign-in with WeChat or GitHub | Self-recommendation. Chinese AI-content labelling applies to Chinese platforms [S] | Declined [M]. The logs record only that the form was not filed (it would have created an account); the decline itself is not in them | Form: <https://hellogithub.com/periodical> |
| hesreallyhim/awesome-claude-code (about 56,000 stars) | Web issue form only: `recommend-resource.yml` | Restricted channel. Gate: the resource is at least 14 days old with continued commits, or has 100 stars. One resource per submission. **The recommendation must be written by a human**, even if the resource was written by an agent. Description: one plain line, no emojis, not a sales pitch. Pull requests and `gh issue create` are prohibited and can get the submitter temporarily restricted. No review SLA. The maintainer says plainly that having users first is the likelier route | Restricted per the maintainer [M]. The logs describe the gate and the prohibition; they do not record an actual restriction event, and nothing was filed by an agent | Form: <https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml> |

Notes on conflicts and gaps between the logs and the brief:

- The sweep logs of 2026-10-19 list awesome-copilot, the W3C list, and the Anthropic directory as "stopped, not submitted" because an agent may not create a public surface or give a person's consent. The maintainer then did all of them by hand. Those three rows therefore rest on [M], with no URL in the logs.
- skills.sh: the footprint check (morning of 2026-10-19) found no listing. After the 0.3.0 release the release log shows `skills.sh/ChanMeng666/a11y-loop -> 308 -> ... 200, lists skill a11y-loop, 0 installs (indexed)`. Indexing came from a test install, not from users; 0 installs is the honest figure.
- HelloGitHub "declined" and awesome-claude-code "restricted" are the maintainer's words. The logs show neither event.

### Other channels researched, not used

Fit scores are the research report's, not outcomes. Nothing here was posted.

| Channel | What the research found | Rules that bind a launch |
|---|---|---|
| Hacker News (Show HN) | Accessibility-tool Show HNs have all stayed under about 20 points; accessibility essays reach 90-300 | No generated or AI-edited text; maintainer present; runnable; no vote solicitation [V] |
| A11y Weekly (about 11,000 subscribers) | Wants human-written essays with a point of view | Explain any AI use; avoids product pages; no overlays [S] |
| dev.to, Hashnode | dev.to is not primarily promotional | Disclose AI use. Hashnode bans unsolicited promotion and automated content [S] |
| Frontend Masters guest posts | About 600 words, draft emailed to the editor | No AI-written articles [S] |
| Reddit (r/ClaudeCode, r/ClaudeAI, r/webdev and others) | Agent-plus-accessibility tool posts drew about one early upvote each | Per-subreddit; weekly showcase threads for project drops; r/Blind is closed to personal advertising and must not be used [S] |
| Chinese platforms (V2EX, 少数派, Juejin, OSChina) | Mostly unverified rules | AI-generated content must be labelled (measures effective 2025-09-01); 少数派 manually reviews an author's first three posts and does not exempt bulk AI-written promotion [S] |
| VoltAgent, heilcheng, ComposioHQ awesome-agent-skills lists | Blocked by star or usage gates | VoltAgent requires real community usage; heilcheng requires 20 or more stars [V] |

Skipped on purpose: `brandonhimpfen/awesome-web-accessibility` (its CONTRIBUTING says self-promotion and early-stage projects may be declined), `GonzagaAccess/awesome-accessibility` (last push 2020-10-01), `zenika-open-source/awesome-accessibility` (3 stars; asks for a prior discussion issue).

---

## (b) Anthropic plugin directory: facts

All from the portal's validation panels, captured read-only on 2026-10-19 and 2026-10-20, plus Anthropic's pre-submission checklist (`claude.com/docs/plugins/pre-submission-checklist`) [V].

**What it tracks.** The portal tracks the ref entered on the Source step, a branch or a tag. The banner reads: "Tracking v0.3.0 rather than the default branch. New commits on a branch are picked up and scanned (a tag stays on its commit)." Auto-publish of passing versions was ON and the update trigger was "GitHub push webhook (Recommended)". The consequence recorded in the log: a submission that tracks a tag never picks up a later release on its own. The tracked ref has to be changed for each release, or the submission has to track a branch. On 2026-10-20 the wizard tracked `v0.3.2` at `97ca0ca`, not the default branch. Nothing in the logs records which ref the maintainer finally submitted.

**Plugin path.** `plugin`. The plugin lives in the `plugin/` subfolder of the repo; the Source step and every finding link point into `.../plugin/...`.

**Icon.** The validator looks for `icon` in `plugin.json`, or `.claude-plugin/icon.png`/`.svg`, `assets/icon.png`/`.svg`. It wants a square PNG or JPEG, 512 to 2048 px a side, under 2 MB; SVG and WebP are not accepted. Its warning says: "That file may become the listing icon only once: the first time the plugin is saved or submitted in the developer portal. Adding or changing it later does not change the icon." So the icon must be right before the first save or submit. On the 0.3.1 capture the listing preview showed no icon even though `.claude-plugin/icon.png` (23.8 kB) was in the file list and `plugin.json` had no field pointing at it; whether the listing shows it after submission is not verified.

**Where hooks run.** The portal lists the plugin on Claude Code, Cowork, and the Claude apps (web, desktop, mobile) and states: "Not used here: hooks. Slash commands load as skills here." The plan-gate hook, the plugin's headline feature, runs only in Claude Code. Elsewhere users get the skill's plan, generation and reporting rules; the audit loop cannot run there because it needs Node and a browser, so those rules apply but nothing is verified. The 0.3.2 plugin README says this in a "Where each part works" section ([CHANGELOG](../../CHANGELOG.md)).

**What the scanner flagged on 0.3.0 (plugin root = the whole repository).** `v0.3.0` at `694fc3f`: 232 files, 2.9 MB, "Validation passed: 5 warnings, 12 policy holds". The 12 holds were five findings groups:

| Hold | Count | Cause |
|---|---|---|
| Dependencies install from a lockfile | 1 | Root `package.json` + `package-lock.json` make Claude Code run `npm ci` at install |
| Pre-approves broad shell access in `allowed-tools` | 1 | `SKILL.md` allowed `Bash(node ${CLAUDE_SKILL_DIR}/../../src/cli.js *)`, a path containing `..` and a variable |
| Image or font file the plugin's code could run | 6 | Docs and website files naming `docs/demo.gif`, `website/public/og-image.png`, `website/public/video-poster.jpg` |
| Uses a credential from the user's machine | 3 | Looked like false positives from prose, a test file and a brand SVG; the report calls them that |
| Files the validator could not inspect | 1 | `src/lib/fingerprint.js` classed as binary |

The 5 warnings were: no icon, hook output uninspected (`PreToolUse` on `ExitPlanMode` can approve tool calls and its decision is computed at run time), and a download-and-run pattern found in three documentation files (`CONTRIBUTING.md`, `docs/overview.md`, `docs/research/market.md`).

**How 0.3.1 fixed it.** The plugin now ships from `plugin/` and the portal's plugin path is `plugin`; `.claude-plugin/marketplace.json` stays at the root with `source: "./plugin"`. The plugin folder holds only the skill, the `/a11y-plan` command, the hook and its logic, a README and the licence, with no `package.json` or lockfile, so installing fetches nothing. `allowed-tools` was narrowed, `fingerprint.js` no longer reads as binary, and an icon was added ([CHANGELOG](../../CHANGELOG.md), 0.3.1). Re-validation of `v0.3.1` at `622b2a6`: 21 files, 158.1 kB, "4 warnings, 1 policy hold"; `v0.3.2` at `97ca0ca`: 21 files, 158.7 kB, the same 4 and 1.

**What remains on 0.3.1 and 0.3.2.** One policy hold, "Scripts the validator couldn't follow" for `hooks/plan-gate.mjs` (`COMMAND_SCRIPT_NOT_FOLLOWED`): the validator wants a plain shell script at a literal path under `CLAUDE_PLUGIN_ROOT`, and a file that script runs in turn "always goes to a reviewer"; leaving it and waiting for review is stated to be fine. Four warnings: three informational unknown `plugin.json` keys (`documentationUrl`, `privacyPolicyUrl`, `supportUrl`, which the directory itself reads), and the uninspected hook output. These are reviewer-read items, not rejections.

---

## (c) Footprint baseline, 2026-10-19

| Measure | Value | Source |
|---|---|---|
| GitHub stars / forks / watchers / issues | 0 / 0 / 0 / 0 | footprint check [V] |
| Repository created / last push | 2026-07-25 / 2026-10-12 | same |
| npm downloads, 30 days (2026-09-17 to 2026-10-16) | 102 | registry API [V] |
| npm downloads, last full week (2026-10-10 to 2026-10-16) | 21 | registry API [V] |
| Third-party mentions (HN, Reddit, X, Bluesky, Mastodon, LinkedIn, dev.to, Zhihu, Juejin) | 0 found | search; several platforms blocked direct access, so search-only |
| Already listed | npm, Socket.dev, libraries.io, Snyk, npmtrends, awesomeclaudeplugins.com | footprint check |
| Not listed on 2026-10-19 morning | skills.sh, Anthropic directory, awesome-claude-code, six accessibility awesome lists, W3C WAI tools list, official MCP registry, Codex directories | same |
| Product film (YouTube, 2026-07-27) | 28 views | same |
| Maintainer reach | GitHub 244 followers, YouTube 32 subscribers | same |

Context for the star count: the GitHub topic `agent-skills` holds 35,269 repositories (18,326 with at least one star) and `claude-code-plugin` holds 11,263 (5,423 with at least one star), so a zero-star repository sorts below all of them. Both the stars gate on several awesome lists and the install gate on skills.sh make this the number to move first. Version at that time: 0.2.6 on npm (published 2026-09-13), with GitHub Releases stale at v0.2.4 until the 0.3.0 release on 2026-10-19.

---

## (d) Positioning rules

The one-sentence positioning in [market.md](market.md) stands: *a11y-loop makes AI coding agents write accessible UI by default, then proves what it can prove with a real browser audit across the states it built, and tells you exactly what it could not check.*

**What we say.**
- Lead with limits, in this order: what it cannot do (no screen-reader testing, no judgement of alt-text correctness, focus-order sense or cognitive load); that every run ends with a page-specific manual checklist; what it does; one line to try it; how it differs from X.
- Numbers always carry a denominator and a version, for example "159 detectable failures on the seeded demo page at axe-core 4.14.0".
- The suggested form of a result: "no automatically detectable failures were found in N states across 5 passes (axe-core 4.14.0). This is not a conformance claim. Here is what still needs a person."
- Honesty is the entry ticket, not the differentiator: credible players (AccessLint, Community-Access, Michael Fairchild's benchmark write-up) already speak in that register. What is distinctive is the plan-phase gate and the five rendering passes over states the agent itself built, judged by a fingerprint `diff`. The N=6 self-run [benchmark](../../evals/benchmark-results.md) is evidence, not a headline; AccessLint's benchmark is scored against an independent hand-labelled oracle, which ours is not.

**What we never say.** Anywhere (README, SKILL.md, CLI output, posts, commit messages, directory forms): "compliant" or "compliance" about the tool's results, "guarantees", "fully accessible" or "100% accessible", "automatically fixes accessibility" (say instead that it suggests colour values that pass), "reduces legal risk" or any lawsuit-protection language, "no manual testing needed", any single accessibility score, grade or passing badge, and "AI makes accessibility easy". See the red line in [AGENTS.md](../../AGENTS.md) and [market.md](market.md) §A2. Do not cite W4A'25 as showing that prompting does not work (see the 2026-10 update in [market.md](market.md)).

**How we differ from overlays.** Overlay vendors sell a script on the live site and, now, "compliance" for AI-written code; the FTC ordered accessiBe to pay $1 million in 2025. a11y-loop injects nothing into a site, edits only the source code a person reviews, and never promises an outcome. In 2026-10 AudioEye's agent launch copy used phrases a11y-loop forbids itself (quoted as theirs: "ship compliant code from the start", "lower legal risk"). Do not benchmark against overlay products or borrow their vocabulary.

**How we differ from Deque's tooling.** Deque owns axe-core, which a11y-loop uses; the two are complementary at the engine level. Deque's agent products (the axe MCP server and the `axe-accessibility` Claude Code plugin) need a paid Axe DevTools subscription and run an analyze, remediate, verify loop; a11y-loop is MIT-licensed, free, runs locally on the open axe-core, adds a plan phase before code exists and a "could not check" list after, and does not claim zero as a finished state. Say "free and open", not "better". Details and dates in [market.md](market.md) (2026-10 update).

**Other recurring questions to have answered.** "Why not Chrome DevTools MCP?": it leads with a Lighthouse score and analyses the current page state; a11y-loop gives no score, runs five rendering passes over the states the agent built, and has a plan phase and a convergence `diff`. "Why not Playwright MCP or a plain axe run?": a plain axe run on page load sees none of the states behind a closed dialog or menu.

---

*Key sources: claude.com/docs/plugins/pre-submission-checklist · claude.com/docs/plugins/submit · claude.ai/directory/manage (portal captures 2026-10-19/20) · hesreallyhim/awesome-claude-code CONTRIBUTING.md · github.com/github/awesome-copilot external-plugin form · w3.org/WAI/test-evaluate/tools/submit-a-tool · deque.com/axe-con/call-for-speakers · skills.sh · community-channel and marketplace research reports of 2026-10-19 (maintainer scratch, not in the repo).*
