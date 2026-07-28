# Using it in CI

Run an audit as a build step and gate on the exit code:

```bash
a11y-loop audit http://localhost:3000 --json --out report.json
```

## Exit codes are the loop's contract

| Code | Meaning |
|---|---|
| `0` | No violations, threshold met, or no regression |
| `1` | Violations found, or a regression was introduced |
| `2` | Tool error (e.g. a missing browser) |

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
