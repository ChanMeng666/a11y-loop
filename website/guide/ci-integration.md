# Using it in CI

Install the CLI and its browser, then run an audit as a build step and gate on the exit code:

```bash
npm i -g a11y-loop
a11y-loop install-browser --only-shell   # the headless shell is enough for audits
a11y-loop doctor                         # exits 2, with the reason, if an audit cannot run
a11y-loop audit http://localhost:3000 --json --out report.json
```

To cache the browser between runs, set `PLAYWRIGHT_BROWSERS_PATH` to a cached directory for both
`install-browser` and the audit, and key the cache on a11y-loop's Playwright version. Every
command is non-interactive: none of them prompts, and `install-browser` ignores stdin.

A composite GitHub Action (`action.yml`) ships in release 0.4.0 and later:
`uses: ChanMeng666/a11y-loop@v0.4.1`, listed on the
[GitHub Marketplace](https://github.com/marketplace/actions/a11y-loop-audit). On 0.3.2 or earlier,
call the CLI from a `run:` step as above. The
[overview](https://github.com/ChanMeng666/a11y-loop/blob/main/docs/overview.md#%EF%B8%8F-using-it-in-ci)
lists its inputs and outputs.

## Exit codes are the loop's contract

| Code | Meaning |
|---|---|
| `0` | No violations, threshold met, no regression, the plan carries accessibility content (or is not UI work, or is too short to assess), or (`doctor`) an audit can run |
| `1` | Violations found, a regression was introduced, or a UI plan names no accessibility decisions |
| `2` | Tool or usage error (e.g. a missing browser), or (`doctor`) an audit cannot run here |

That means a CI pipeline can branch on the result directly, with no prose parsing:

```bash
a11y-loop audit http://localhost:3000 --json --out report.json || exit 1
```

## Regression gating with `diff`

```bash
a11y-loop diff --before base.json --after head.json
```

in a PR check turns the audit into a regression gate: it fails only on genuinely `NEW`
violations, so a PR that fixes ten violations and introduces none still passes, even though the
raw count changed.

A typical pipeline runs `audit` against the `main` branch's deployed preview to produce
`base.json`, runs `audit` again against the PR's preview to produce `head.json`, then runs `diff`
between them as the merge gate.

## Gating the plan with `plan-check`

```bash
a11y-loop plan-check --file plan.md
```

checks the step before any of that: it exits `1` when a plan that changes UI work names no
accessibility decisions. It needs no browser and keeps no state, so it can run on a plan file
committed with the PR, or by an agent before it builds. It checks that the questions were asked,
not that the answers are any good.
