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
| HelloGitHub (月刊) | Issue form on the website, not on GitHub (blank issues are disabled); sign-in with WeChat or GitHub | Self-recommendation. Chinese AI-content labelling applies to Chinese platforms [S] | Declined by the maintainer: submitting requires creating an account through a WeChat or GitHub login [V by the coordinator on 2026-10-19, relayed]. The sweep log agrees that the form was not filed for that reason | Form: <https://hellogithub.com/periodical> |
| hesreallyhim/awesome-claude-code (about 56,000 stars) | Web issue form only: `recommend-resource.yml` | Restricted channel. Gate: the resource is at least 14 days old with continued commits, or has 100 stars. One resource per submission. **The recommendation must be written by a human**, even if the resource was written by an agent. Description: one plain line, no emojis, not a sales pitch. Pull requests and `gh issue create` are prohibited and can get the submitter temporarily restricted. No review SLA. The maintainer says plainly that having users first is the likelier route | Restricted: when the form was tried it showed "Action restricted" (issues limited to collaborators) [V by the coordinator on 2026-10-19, relayed]. Nothing was filed by an agent | Form: <https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml> |

Notes on conflicts and gaps between the logs and the brief:

- The sweep logs of 2026-10-19 list awesome-copilot, the W3C list, and the Anthropic directory as "stopped, not submitted" because an agent may not create a public surface or give a person's consent. The maintainer then did all of them by hand. Those three rows therefore rest on [M], with no URL in the logs.
- skills.sh: the footprint check (morning of 2026-10-19) found no listing. After the 0.3.0 release the release log shows `skills.sh/ChanMeng666/a11y-loop -> 308 -> ... 200, lists skill a11y-loop, 0 installs (indexed)`. Indexing came from a test install, not from users; 0 installs is the honest figure.
- HelloGitHub (declined because filing needs a WeChat or GitHub login) and awesome-claude-code (form shows "Action restricted", issues limited to collaborators) were checked by the coordinator on 2026-10-19 and relayed to this document; the sweep logs I read record the account-creation reason for HelloGitHub but not the "Action restricted" screen.

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

---

## (e) Channel research detail

Source: the community and social channel research of 2026-10-19 (research only; nothing was posted by that work). Fit scores are 1 to 5 for a zero-star solo maintainer promoting an honesty-first tool. **[V]** checked against a primary page, API or repo on 2026-10-19; **[S]** reported by a research sub-agent with a URL, not re-fetched; **[U]** unverified. The underlying report is no longer on disk, so this section is the surviving record of its figures.

### What changes how to promote

1. **The practitioners most worth reaching are openly tired of AI accessibility tools.** In the two months before 2026-10-19, Manuel Matuzovic, Sara Soueidan and Steve Faulkner each posted on Mastodon about tool fatigue, burnout from claims that AI made accessibility easy, and unsolicited tool pitches (re-verified through the Mastodon API). Cold DMs and @-mentions are the highest-risk action.
2. **The market got crowded and large vendors arrived.** Since February 2026: Deque's axe MCP server and Claude Code plugin, GitHub's accessibility agent (May), Google's Modern Web Guidance skills (critiqued by Adrian Roselli), accessiBe's "Code Agent" (2026-09-17), and at least six agent-plus-accessibility launches between February and October 2026. See [market.md](market.md), 2026-10 update.
3. **Developers state the need in workflow terms.** An open claude-code issue (anthropics/claude-code #56079, 2026-05-04, 26 thumbs-up) says the developer must remember to ask for an accessibility review because instructions and memory files are not followed. Simon Willison asked on Hacker News for agents that drive real screen readers (<https://news.ycombinator.com/item?id=46203241>, 2025-12-09).
4. **Tool announcements get little traction almost everywhere; essays and community threads get more.** Accessibility-tool Show HNs all stayed under about 20 points. Agent-plus-accessibility tool posts in r/ClaudeCode, r/ClaudeAI and r/cursor drew about one early upvote each. Hacker News accessibility essays reached 90 to 300 points, and r/ClaudeCode's skills showcase thread drew 128 points.
5. **Several high-value channels require human-written text.** Hacker News (no generated or AI-edited text), awesome-claude-code (the recommendation must be human-made), A11y Weekly (explain any AI use), dev.to and Hashnode (disclose AI), Frontend Masters (no AI-written articles), Chinese platforms (AI-content labelling since 2025-09-01).
6. **One hard deadline:** axe-con 2027 call for speakers closes Friday 30 October 2026, 5:00 pm PT [V].
7. **Timing has little measurable effect.** Show HN: 15:00-18:00 UTC is about 1.3 times the average and day of week is noise (analysis of 20,945 launches). Bluesky: flat across hours and days (sub-agent analysis of 3,942 posts). Use moderator-created windows (Reddit weekly threads) instead.

### Hacker News

Rules read directly from HN pages on 2026-10-19 [V]: a Show HN must be something people can run; non-trivial; the maintainer present in the thread; no generated or AI-edited text; no vote solicitation. One attempt only. Reference points: "AISlop, a CLI for catching AI-generated code smells" scored 73 points and 65 comments on Friday 2026-05-29 (<https://news.ycombinator.com/item?id=48322956>), an adjacent agent-tooling launch that did well. "Tells of a Slop UI" (2026-09-28) reached 386 points and drew the comment that Claude-generated Tailwind styles almost never pass WCAG; its URL was not captured. Expect "why not Chrome DevTools MCP / axe MCP / Lighthouse / Playwright MCP / AccessLint" as the first replies.

### Reddit

| Subreddit | Fit | Rule summary |
|---|---|---|
| r/ClaudeCode | 4 | Project drops go in the weekly showcase thread; standalone "Built with Claude Code" posts must be detailed write-ups; no repeated promotion |
| r/ClaudeAI | 3 | Feed showcase needs 50+ total karma, otherwise the Showcase Megathread (Rule 7) |
| r/webdev | 3 | Projects only on Showoff Saturday; no commercial promotion; 9:1 ratio |
| r/Frontend | 3 | Source or repo required; minimal self-promotion |
| r/reactjs | 3 | Demos need source; portfolios Sundays; no raw AI output |
| r/node | 3 | Rules unverified [U] |
| r/opensource | 3 | Under 10% promotion guideline; "Promotional" flair |
| r/ChatGPTCoding | 3 | Self-promotion thread historically; current rules unverified [U] |
| r/javascript | 2 | Keep promotion minimal; wiki not retrievable |
| r/SideProject | 2 | Permissive; audience is founders |
| r/cursor, r/vibecoding | 2 | Rules unverified [U] |
| r/accessibility | 2 | Media must be accessible; mostly disability and assistive-technology audience |
| r/programming | 1 | Link-only; demos and promotion removed; skip |
| r/Blind | 0 | Community of users; no personal advertisements; must relate to blindness. Do not post |

### Social, newsletters, blogs

| Channel | Fit | Facts and rules |
|---|---|---|
| Bluesky | 4 reach, 2 reception | No platform rule; community norm is no cold pitches; reply rather than @-mention; Tue-Thu 13:00-16:00 UTC for presence |
| Mastodon (mastodon.social, hachyderm.io) | 3 | front-end.social is closed to new members; a11y.info shut down; use #a11y |
| X / Twitter | [U] | Claude Code team posts there; nothing verified |
| LinkedIn | 3 | No tool-specific rules; link reach penalty reported |
| A11y Weekly | 5 | About 11,000 subscribers; issues go out Mondays; avoids product pages; wants human-written essays with a point of view; explain any AI use; no overlays [S] |
| Console.dev | 4 | Pre-1.0 tools qualify; 2-3 tools a week; email hello@console.dev; Thursday sends |
| Cooperpress (Node Weekly, Frontend Focus, JavaScript Weekly) | 4 | Reply to any issue or email the editor; picks small CLIs; 1-2 week lag |
| Smashing Magazine | 4 for credibility | Newsletter has about 176,000 subscribers per a third-party snippet and no submission route; the route is an article outline. Its newsletter issue 564 (2026-06-23) covered the Frontend Masters post "AI-Generated UI Is Inaccessible by Default" (2026-04-13) and the A11Y.md repo (about 470 stars) without a visible pitch |
| A List Apart, A11y Project, Frontend Masters | 4 for credibility | Pitch first; no product-led content; A List Apart wants unpublished work; Frontend Masters guest post about 600 words, draft to guest_writing@master.dev, no AI-written articles (<https://blog.master.dev/guest-writing/>) |
| dev.to | 3 | Not primarily promotional; disclose AI; four tags (a11y, claudecode, ai, webdev); canonical URL supported |
| Hashnode, Medium | 2 | Hashnode bans unsolicited promotion and automated content and holds the author responsible for AI text (<https://hashnode.com/terms>); A11y Project and A11y Weekly avoid Medium |
| Product Hunt | 2 | No upvote requests; company accounts prohibited |
| Lobsters | 2 | Invite only |

### Events and podcasts

| Event | Date and format | Call for speakers | Fit |
|---|---|---|---|
| axe-con 2027 | 23-24 Feb 2027, virtual [V] | Closes Fri 30 Oct 2026, 5:00 pm PT; notification by 13 Nov [V] | 5 |
| CSUN Assistive Technology Conference 2027 | 8-12 Mar 2027, Anaheim [S] | General call closed 22 Sep; next call likely Aug-Sep 2027 (inference) | 3 |
| a11yTO | 22-23 Oct 2026, Toronto with virtual option [S] | 2027 call [U] | 3 |
| Inclusive Design 24 | 24 Sep 2026, free, online [S] | 2027 call [U] | 3 |
| Global Accessibility Awareness Day | Thu 20 May 2027 [S] | Self-organised events, no central list | 4 |
| JSNation 2027 | 21 and 25 May, Amsterdam and remote [S] | Open until 1 Mar 2027 | 2 |
| React Summit 2027 | Page shows the same dates as JSNation (suspicious, verify) [S] | Open until 5 Feb 2027 | 1 |
| Node Congress | 2026 edition 26-27 Mar, online; 2027 [U] | [U] | 2 |
| AI Engineer: Code Summit SF 10-12 Nov 2026; Europe London 17-19 Feb 2027; World's Fair SF 29 Jun-1 Jul 2027 | [S] | Code Summit speaker call closed; 2027 calls [U] | 3 |
| Claude Code and Cursor local meetups | Ongoing; lightning demos (Claude Community meetups, Cursor five-minute demos); contact the host; Cursor ambassadors <https://cursor.com/ambassadors> | Per-host contact | 4 |

Podcasts: Accessibility Craft and Double Tap both ran AI-and-accessibility episodes in 2026 (contact forms; plan around GAAD). Latent Space has a tips address; Simon Willison has no pitch route.

**axe-con detail** (<https://www.deque.com/axe-con/call-for-speakers/>, read 2026-10-19 [V]): required are a short abstract, bio, speaking history and code-of-conduct acceptance; first-time presenters welcome [S]. Risks: Deque sells a competing axe MCP server, and a 50-minute slot needs real material. Lower-fit or closed: Accessing Higher Ground (Denver, Nov 2026, call closed), A11y Camp Sydney (Nov 2026), FOSDEM 2027 [U].

### Chinese-language channels

| Channel | Fit | Facts |
|---|---|---|
| ruanyf/weekly | 4 | Submit an issue in the repo; English-only projects are included; issue published Fridays |
| HelloGitHub 月刊 | 3 | Self-recommendation form on the site; monthly, on the 28th. Field set prepared: project URL, category (JS or AI), title (50 characters or fewer), description (32-256 characters), highlights. The community standards issue is <https://github.com/521xueweihan/HelloGitHub/issues/271> |
| V2EX (/go/create, /go/share) | 3 | New-work posts welcome; FAQ warns against registering only to push your own links; wrong node can lower account weight (<https://www.v2ex.com/faq>); a "no AI-generated content" rule is rumoured and unverified |
| Linux.do | 3 | Rules unverified; reported conditions on promotion posts |
| OSChina | 3 | Submit software; Chinese update notes; no marketing tone; review about a day |
| 掘金 Juejin | 3 | Rules unverified; tutorial-style articles |
| 少数派 sspai | 2 | Product and app focus; creator manual revised 2026-10-15: an author's first three posts are manually reviewed and bulk AI-written promotion of one's own app is not exempt |
| 知乎, Bilibili, 小红书, CSDN, WeChat aggregators | [U] | Not verified |

China's AI-generated-content labelling measures have applied since 2025-09-01 [S]: if a Chinese post is machine-translated or drafted, label it. No channel was shown to require a full Chinese README.

### Demand-side evidence (fourteen sources, paraphrased)

| Source | Date | What it says |
|---|---|---|
| anthropics/claude-code issue #56079 | 2026-05-04 | Developer must remember to ask for an accessibility review despite memory and instruction files; Claude fixes only the easy part. 26 thumbs-up. A comment: "Accessibility barriers are bugs, not features." |
| Simon Willison, Hacker News | 2025-12-09 | Distrusts heuristic ARIA scans; wants agents that drive a real screen reader |
| Axess Lab, Lovable conference site (<https://axesslab.com/lovable/>) | 2026-05-13 | Scored 100% in an axe-based checker; menus, modals and focus failed in VoiceOver |
| Frontend Masters, "AI-Generated UI Is Inaccessible by Default" (Durgesh Rajubhai Pawar) | 2026-04-13 | A sidebar generated in eight seconds, 29 lines, had ten distinct failures; clickable `div` standing in for a button |
| Michael Fairchild (Microsoft), dev.to, "AI-generated accessibility: an update, frontier models still fail but skills change the game" (<https://dev.to/mfairchild365/ai-generated-accessibility-an-update-frontier-models-still-fail-but-skills-change-the-game-5629>) | 2026-05-21 | Default output passed about 12% of checks, a basic instruction set about 60%, a dedicated accessibility skill about 82%, and 86% with a review pass; a perfect score means only that the sample passed the checks that ran |
| Pedal Point Solutions, "AI-Generated Code is Inaccessible by Default" (Simon Miner) | 2026-05-25 | A Lovable conference site with a perfect axe-based score still had serious screen-reader barriers; prompts do not replace expertise |
| thefrontkit | 2026-04-08 | Claude invents ARIA roles and generates 2.1:1 contrast; AI does not know when its output is inaccessible |
| Hacker News, "Tells of a Slop UI" | 2026-09-28 | 386 points; Claude-style Tailwind rarely passes WCAG |
| Hacker News, bichiliad (same thread) | 2026-09-28 | Design-skill accessibility checks are fine for beginners, provided you want to check |
| Hacker News, miki123211 | 2026-10-15 | If you do not ask, you get luck; asking from the start makes the model continue the pattern |
| Taylor Arndt, Substack | 2026-06-24 | Icon buttons without labels read as "button"; focus does not move after actions |
| r/vibecoding | 2026-05-04 | Wants a light pre-deploy PR check (alt, button labels, contrast, keyboard, ARIA) |
| r/vibecoding | 2025-12-08 | Folk remedy: add a line to the prompt |
| Adrian Roselli | 2026-05-25 | Even with Google's skill, the agent did not produce a WCAG-conforming example; model output is non-deterministic |

Vocabulary users use, usable in titles and search terms: inaccessible by default; passes the checker but fails with a screen reader; clickable div; icon button with no label; invented ARIA; having to remember to ask; before deploy / on every PR; treat the output as a draft.

---

## (f) Marketplace, registry and directory mechanics

Researched 2026-10-19. **[V]** from a primary source or by running the tool; **[V-local]** by running against the local checkout; **[I]** inferred; **[?]** not established.

### Findings about the repo itself (state on 2026-10-19, version 0.2.6)

| # | Finding | Evidence |
|---|---|---|
| R1 | `gh skill install ChanMeng666/a11y-loop` returned "no skills found in ChanMeng666/a11y-loop" because the skill sat in `skill/` (singular); `gh skill` scans `skills/*/SKILL.md` and a few other layouts. The Agent Plugins open standard also fixes `skills/<name>/SKILL.md`. Later, the 0.3.0 install check printed "gh skill install ok ... (ref v0.3.0)" [V] | `gh` 2.96.0 |
| R2 | `npx skills@latest add ChanMeng666/a11y-loop -l` found the skill ("Found 1 skill: a11y-loop") through the `skills` path in `.claude-plugin/plugin.json` [V] | vercel-labs/skills README |
| R3 | Codex installed and loaded the skill from the existing `.claude-plugin/marketplace.json` (`codex plugin marketplace add <checkout>`, then `codex plugin add a11y-loop@chanmeng-a11y-loop`, version 0.2.6) against a local path; the `owner/repo` form is documented but was not run against GitHub [V-local] | isolated `CODEX_HOME` |
| R4 | GitHub Releases were stale: tags v0.2.5 and v0.2.6 existed but the latest Release was v0.2.4 (2026-07-31). Releases v0.2.5 and v0.2.6 were created 2026-10-19 (08:37Z); v0.3.0 at 08:37:55Z (commit `694fc3f`), v0.3.1 at 10:00:45Z (`622b2a6`), v0.3.2 at 10:53:10Z, each published to npm by OIDC trusted publishing with SLSA provenance [V] | `gh release list` |
| R5 | `claude plugin validate --strict .` passed with one advisory (no marketplace install line in the README) [V-local] | |
| R6 | Footprint against the directory limits: 185 tracked files (limit 512), 3.0 MB archive (limit 50 MiB), largest non-image file 33 KB (`package-lock.json`; limit 256 KiB) [V-local] | |
| R7 | A root `package.json` with `package-lock.json` in the plugin folder triggers the "Dependencies install from a lockfile" reviewer hold [V] | pre-submission checklist |
| R8 | Provenance, `SECURITY.md`, MIT `LICENSE`, `CODE_OF_CONDUCT.md`, issue templates and Discussions in place [V] | |
| R9 | npm downloads, 30 days to 2026-10-16: 102 [V] | |
| R10 | [market.md](market.md) (July text) says not to ship another axe MCP server; that conflicts with the MCP-registry channels, which need a server. Left as a decision for the maintainer | 2026-10-20: decided for a thin server over a11y-loop's own loop (#31); reasoning in `AGENTS.md` under `src/commands/mcp.js` |

### Anthropic directory: process

- `claude.ai/directory` is the catalog browsed in claude.ai and Cowork; a listing "reaches people on claude.ai, in Cowork, and in Claude Code" (Claude Code receives it as a `<name>@synced` plugin through account sync). `claude.com/marketplace` has no separate submission [V].
- Submit at `https://claude.ai/directory/manage` -> Submit new -> Plugin bundle (the other option, MCP connector, is for one remote MCP server). Walkthrough: <https://www.claude.com/docs/plugins/submit>.
- Prerequisites: a paid claude.ai plan (Pro, Max, Team or Enterprise); a GitHub account connected to claude.ai with push access; a repo that may be private during validation but is public before the listing goes live; the Anthropic Software Directory Terms and Policy.
- Steps: repository, plugin path, Validate, Listing details (read from `plugin.json` and the README), Data handling questions, Compliance (contact email and four acknowledgements), update trigger, Submit for review. Limit: 10 submissions per organisation per 24 hours.
- Review: every version gets automated validation and a security scan; a person reviews a new listing before it goes live; review time "isn't fixed".
- Validation rules that touched this plugin: name lowercase, hyphenated, not reserved, permanent once listed; README at least 40 words outside code blocks; a licence; `description`, `author`, `version` set; component paths inside the plugin folder; "Describe in the README everything the plugin runs, sends, or fetches"; readable source only, no minified code.
- Surfaces: skills load in Chat, Cowork and Claude Code; commands load everywhere; hooks load only in Cowork and Claude Code per the platform-support page, while the portal form itself said hooks are not used on Cowork and the apps. Those two statements differ; the portal wording is what the 0.3.2 plugin README follows [V]. In claude.ai chat there is normally no Node or Playwright, so the audit cannot run there.
- Skills are not a submission type on their own: "Skills aren't a submission type on their own. Put them in a bundle." A folder with no `plugin.json` and at least one `skills/<name>/SKILL.md` passes with a note and is listed for Claude Code only.
- Reach signal: `claude.com/marketplace/plugins` showed 341 plugins, 24 per page, no install counts on the list page, and "Anthropic verified" on 13 of the 24 visible. A published plugin gets a Usage tab (installs, versions, skill runs, error rates).
- Likely knock-on: `anthropics/claude-plugins-community` (4.7k stars) is a read-only mirror, "synced nightly from Anthropic's internal review pipeline"; pull requests against it are closed automatically [I].
- `anthropics/claude-plugins-official` (42.8k stars) and `anthropics/skills` (182k stars): neither contained an accessibility skill or plugin on 2026-10-19; `anthropics/skills` has no community submission process (its Discussions have a Show and tell category where posts get about one upvote); `frontend-design` mentions keyboard focus and reduced motion in one sentence [V].
- Portal wizard on 2026-10-19: Data handling answered No / No / Not retained / No; contact email set; all four attestations ticked; auto-publish ON; update trigger "GitHub push webhook (Recommended)". Attestation three says the plugin "does not exfiltrate credentials or execute code outside its declared MCP servers"; the plugin declares no MCP servers but runs a Node hook, which the form discloses separately. The plugin README's "For contributors" section was noted as noise for directory users.

### Agent Skills ecosystem registries

| Registry | Mechanism | Status for a11y-loop |
|---|---|---|
| skills.sh (Vercel Labs) | Automatic from anonymous install telemetry of `npx skills add owner/repo`; ranked by installs; opt out with `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1`; search API `skills.sh/api/search?q=`. FAQ: <https://skills.sh/docs/faq> | Not indexed on 2026-10-19 morning (the author's other skills `chanmeng666/typst-claude-skill` and `archlang` were, with 17 and 12 installs, which confirms install-triggers-listing); indexed after the 0.3.0 release check, 0 installs |
| agentskills.io | Spec plus a client showcase of about 50 clients (Claude Code, Codex, Cursor, Copilot, VS Code, Gemini CLI, OpenCode, Junie, Kiro, Amp, Goose, Roo Code, OpenHands, Factory, Mistral Vibe); about 10,000 Discord members; says it keeps no directory of community skills | Not a listing channel; useful for "works with" wording |
| `gh skill` (GitHub CLI 2.90 or later, preview) | `gh skill install OWNER/REPO`, `gh skill search`; `gh skill publish` validates, adds topic `agent-skills`, creates a release | Failed before the `skills/` layout (R1); works from v0.3.0 |
| claude-plugins.dev | Says all public GitHub skills are auto-indexed; marketplace.json read hourly [I] | Passive; presence not confirmed |
| skillsmp.com | Aggregates from GitHub; one analysis reports a 2-star minimum [I] | Passive; client-rendered, presence not checkable |
| Tessl registry | Auto-indexes GitHub skills; to own the entry run `tessl skill import` and publish through their GitHub Action; evals in an `evals/` folder | Low priority; needs an account |
| awesomeclaudeplugins.com | Already lists `ChanMeng666/a11y-loop` | Check entry details after releases |
| netresearch marketplace, buildwithclaude, aitmpl.com, claudemarketplaces.com | Not researched in depth | Skipped |

### Awesome lists, with gates

| List | Stars (2026-10-19) | Mechanics and gates | Verdict |
|---|---|---|---|
| hesreallyhim/awesome-claude-code | 55,974 | Issue form `recommend-resource.yml`, web UI only; PRs and `gh issue create` prohibited and risk a restriction; 14 days since first commit with continued commits, or 100 stars; one resource per submission; recommendation must be human-written; one-line, non-salesy, no emojis; no review SLA | Maintainer files by hand; odds low at zero stars |
| VoltAgent/awesome-agent-skills | 35,958 | PR adding one line under "Community Skills"; requires real community usage, brand-new skills not accepted; description of 10 words or fewer; 10 of the last 30 closed PRs merged | Wait for installs and stars |
| heilcheng/awesome-agent-skills | 6,288 | PR, README only, one line under 100 characters, 20 or more stars, older than 14 days, public `SKILL.md`; its AGENTS.md is written for AI agents; CLIs without `SKILL.md` are out of scope | Blocked at 0 stars |
| travisvn/awesome-claude-skills | about 15,000 | Social proof required; last push April 2026 [S] | Not eligible |
| ComposioHQ/awesome-claude-skills | 77,393 | PR adding a skill folder plus a README line; 0 of the last 30 closed PRs merged | Low yield; skip |
| BehiSecc/awesome-claude-skills | 10,269 | README only; no CONTRIBUTING; sponsor banners | Low priority |
| hashgraph-online/awesome-codex-plugins | 1,347 | README line; requires `.codex-plugin/plugin.json`, SECURITY.md, LICENSE, lockfile, scanner score of at least 80/100 and no critical or high findings | Needs a `.codex-plugin/plugin.json` first |
| composio-community/awesome-codex-skills | 16,956 | Folder-based; no CONTRIBUTING | Low priority |
| punkpeye/awesome-mcp-servers | 96,579 | PR; requires an installable server with a public repo | Needs an MCP server |
| brunopulis/awesome-a11y | 1,996 | PR to `topics/tools.md`, alphabetical; overlay tools excluded; last push 2026-08-03 | PR #341 open |
| lukeslp/awesome-accessibility | 92 | PR; CONTRIBUTING present; pushed 2026-10-18 | PR #113 open |

### Other platforms

- **GitHub Copilot / awesome-copilot** (40.2k stars): external-plugin issue form, GitHub-only public repo, release tag or 40-character SHA; automated `vally lint`, an install smoke test, then human approval; re-reviewed about every six months; rejects generic content frontier models already produce. It also hosts `agents/accessibility.agent.md`, `agents/accessibility-runtime-tester.agent.md` (prefers Chrome DevTools MCP, then Playwright) and `instructions/a11y.instructions.md`. Copilot CLI also reads `.claude-plugin/marketplace.json`, so `copilot plugin install ChanMeng666/a11y-loop` should work [I; the `copilot` CLI was not installed to test].
- **OpenAI Codex**: no submission needed; README lines `codex plugin marketplace add ChanMeng666/a11y-loop` and `codex plugin add a11y-loop@chanmeng-a11y-loop` (R3). OpenAI's public directory was deferred: packages with hooks cannot currently be submitted, and it needs identity verification.
- **MCP registries**: the official registry and Glama need a server; nothing was filed.
- **GitHub Marketplace (Actions)**: needs an `action.yml`; docs at docs.github.com.
- **Later platforms** (each needs its own manifest): Cursor Marketplace, Kiro Powers, Gemini extensions gallery (`gemini-extension.json`; Gemini CLI installs from the "Latest" release).
- **W3C WAI Evaluation Tools List**: 119 tools listed on 2026-10-19 [V]; fields as in table (a); questions and removals to `group-wai-list-eval-tools@w3.org`. Describe a11y-loop as an audit tool, and fill "standards" as "checks the WCAG 2.2 rules that automation can detect", not as a conformance claim.
- **axe-core `doc/projects.md`**: pull request under "Community Projects" to `dequelabs/axe-core`; lists Playwright and CLI wrappers but no AI-agent tools; whether the file is maintained is unknown.
- **A11Y Project, WebAIM, Deque community lists**: no primary-source tool-submission page found.

Ranked shortlist from that research, highest leverage first: Anthropic directory; awesome-claude-code; awesome-a11y; W3C list; skills.sh; awesome-copilot (in-product visibility inside Copilot CLI); lukeslp list; gated lists later. Items gated by a Release: `gh skill`, awesome-copilot, Gemini CLI, the Marketplace Action.

---

## (g) Footprint baseline: further detail

- Repository: 14 topics on 2026-10-19 (`claude-code-plugin`, `claude-skills` and `codex-plugin` present; `gh search` shows the repo under each). Eight Releases at that time. Discussions enabled. Social preview was the default generated card. The description started with promotional text ("【Be a star, give a star!⭐️】").
- Docs site <https://chanmeng666.github.io/a11y-loop/>: returned 200; `og:image` 1200x630; the homepage had no install command (only the getting-started guide); the `og:description` said it "writes UI to WCAG 2.2 AA by default", flagged at the time for checking against the honesty rules.
- npm page: returned 403 to scripted fetches. The registry's readme field served the Chinese README on 0.2.6 while the tarball `README.md` was English; on 0.3.1 it served the English one. The README's bare video URL does not embed on npm.
- Product film: YouTube `HIjLTA7HS64`, 2026-07-27, 28 views.
- Prior press for the maintainer (DataCamp, PulseMCP newsletter, 小宇宙FM) was about other projects; a February 2026 Show HN was for a different project. GitHub: 244 followers, 56 repositories, since 2023-11. X `@chanmeng666` and LinkedIn `/in/chanmeng666` exist (counts not visible); Bluesky unconfirmed; no dev.to account.
- GitHub repository search for the name found only `ChanMeng666/a11y-loop-promo-video` (0 stars).

---

## (h) Update 2026-10-20: submissions resolved

Facts recorded on 2026-10-20. They are listings and queue states, not measures of use.

- **GitHub Marketplace: live.** <https://github.com/marketplace/actions/a11y-loop-audit>, categories Code quality and Testing, published from v0.4.1. The Marketplace validates `action.yml` at the release's own tag and rejected v0.4.0 because the action's `description` was about 260 characters; the limit is 125 characters. The description is now 116 characters and `test/unit/action-manifest.test.js` holds it there.
- **Anthropic plugin directory: in review.** The submission is In review for v0.3.2. The tracked ref cannot be changed while it is under review, so the switch from a tag to the `release` branch (see section (f)) waits for the outcome. The `release` branch itself is at v0.4.1.
- **awesome-accessibility: merged.** Pull request #113 was merged.
- **Still open:** the awesome-a11y pull request #341, and the ruanyf/weekly issue <https://github.com/ruanyf/weekly/issues/12549>. No outcome yet.
