# Skill eval report, October 2026

First measured run of the native `claude plugin eval` suite in `plugin/evals/`. Sample sizes are
small. Read the numbers as a baseline to beat, not as a precise rate.

## Setup

| | |
|---|---|
| Date | 2026-10-20 |
| Tool | `claude plugin eval`, Claude Code 2.1.303 |
| Agent model | `claude-sonnet-5-5` |
| Judge model | the default (Haiku) for `llm` graders |
| Agent tools | read-only: `Read`, `Glob`, `Grep`, `Skill`. Native Windows has no sandbox backend, so no `Bash` or `Write`. |
| Suite | 32 trigger cases (21 should-trigger, 11 should-not) and 7 behaviour cases |
| Format | one folder per case: `prompt.md` plus `graders/*.md` (`regex`, `tool_used`, `llm`) |

The suite is built from `skills/a11y-loop/evals/trigger-evals.json` and the hand-written cases in
`skills/a11y-loop/evals/native/`. `npm run sync-plugin` copies both into `plugin/evals/`.

## What the graders check

- **Trigger cases.** A `tool_used` grader on `Skill` matches the a11y-loop skill. Should-trigger
  cases need one call. Should-not cases need zero, in both arms. The agent is capped at 3 turns.
- **Behaviour cases.** Free `regex` graders (conformance target named, `<label>` and
  `:focus-visible` present, no "compliant", "guarantees", "fully accessible" or score) and `llm`
  graders with a written rubric (plan has per-component criteria, APG modal and tabs contracts,
  audit ran or the agent says it could not). The skill-fired grader is an indicator only.

## Results

All behaviour numbers and the final trigger numbers are from the shipped description.

### Trigger accuracy

| Description | Runs per case | Should-trigger hit rate | False triggers |
|---|---|---|---|
| Before (0.3.2) | 1 | 11 of 21 (52%) | 0 of 11 |
| After (this PR) | 2 | 31 of 42 (74%) | 0 of 22 |

Still missing on both runs: the settings dialog in `src/App.jsx`, tabs in `Dashboard.tsx`, adding
alt text, "is this modal usable with a screen reader", and the checkout planning prompt with a
canvas chart. The first two name files that do not exist in the eval sandbox. The agent spends its
three turns searching for them and may never reach the skill, so part of that miss is the harness,
not the description. One more case misses once in two runs.

### Behaviour (3 runs per case, with and without the plugin)

| Case | With | Without | Delta |
|---|---|---|---|
| plan for a settings page | 1.00 | 0.33 | +0.67 |
| signup form labels and focus | 1.00 | 1.00 | 0 |
| modal follows APG | 1.00 | 1.00 | 0 |
| audit loop or says it could not | 1.00 | 0.83 | +0.17 |
| no overclaim on request for a score | 1.00 | 0.83 | +0.17 |
| tabs follow APG | 1.00 | 1.00 | 0 |
| backend task stays quiet | 1.00 | 1.00 | 0 |

7 of 7 cases pass. Mean delta is +0.14. The first full run, on the old description, also passed
7 of 7 with a mean delta of +0.17 on the behaviour half.

## What this tells us

- The plugin's clearest measured contribution is the plan phase and honest reporting. The baseline
  model already writes labelled forms, APG modals and APG tabs, so those three cases do not
  discriminate. They guard against regressions only.
- The shipped description was missing planning and discussion prompts. Adding "discussing", "even
  before any code exists and even for a small edit", "images and alt text" and "a roadmap, a
  rewrite" raised the hit rate from 52% to 74% and produced no false trigger.
- The skill never fired on the 11 should-not prompts, with or without the change.

## What was not measured

- Whether the audit loop runs. Tools were read-only, so the behaviour case only checks that the
  agent runs it or says plainly that it could not.
- Anything on other models. One agent model, one judge, 1 to 3 runs per case.
- The plan-mode hook. `ExitPlanMode` is not exercised by `claude plugin eval`.
- Judge reliability. `llm` verdicts are not hand-audited.

## Cost

| Run | Cases | Spend (list price) | Time |
|---|---|---|---|
| Full suite, old description, both arms | 39 | $5.40 | 650 s |
| Trigger half, new description, one arm, 2 runs | 32 | $3.76 | 423 s |
| Behaviour half, new description, both arms, 3 runs | 7 | $2.76 | 282 s |

Reproduce with `npm run eval:skill`. Expect about $5 and 11 minutes.
