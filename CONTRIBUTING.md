# Contributing to a11y-loop

Thank you for your interest in contributing! This guide explains how to get involved.

## How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/ChanMeng666/a11y-loop/issues/new/choose) with:

- Steps to reproduce the problem
- Expected vs. actual behavior (screenshots or logs help)
- Your environment (OS, and relevant runtime/version)

### Suggesting Features

Have an idea? [Open a feature request](https://github.com/ChanMeng666/a11y-loop/issues/new/choose) describing the problem you want to solve and your proposed solution.

### Submitting Changes

1. **Fork** the repository and **clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/a11y-loop.git
   cd a11y-loop
   ```
2. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and verify them locally (see Development Setup below).
4. **Commit** with a clear message following [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: short description of your change"
   ```
5. **Push** and open a Pull Request against the `main` branch.

## Development Setup

```bash
# Install dependencies
npm install

# Install the Chromium build the audit engine needs (required before tests or the CLI)
npx playwright install chromium

# Run the test suite
npm test
```

If you keep Playwright browsers off the system drive, set `PLAYWRIGHT_BROWSERS_PATH` before running
`npx playwright install chromium`.

When your change touches `demo/` or other seeded-violation fixtures, run the full
audit-fix-re-audit loop to convergence (`a11y-loop diff` should report "Converged") before opening
a PR — see [`AGENTS.md`](AGENTS.md) for the full discipline. Never soften the project's honesty
language (no "compliant", "guarantees", "fully accessible", "no manual testing needed", or a single
accessibility score) in code, docs, or output you add.

**Keep the skill portable.** `skills/a11y-loop/` is the whole product and it targets the open Agent
Skills standard, not one client. The Claude-Code-only layer (`plugin/`) is optional and
additive: nothing under `skills/` may depend on it, and no
Claude-Code-specific mechanism — hooks, plugin manifests, slash commands, `ExitPlanMode` — may
appear in `SKILL.md` or `references/`. A PR that blurs that line will be asked to split it.

**Don't edit the generated copies in `plugin/`.** `plugin/skills/a11y-loop/` (from
`skills/a11y-loop/`, minus `evals/`), `plugin/hooks/lib/plan-gate.mjs` (from
`src/lib/plan-gate.js`), `plugin/hooks/lib/audit-gate.mjs` (from `src/lib/audit-gate.js`) and
`plugin/LICENSE` (from `LICENSE`) are copies. Edit the original and run
`npm run sync-plugin`. `test/unit/plugin-sync.test.js` fails while any copy differs from its
source. `plugin/README.md` is not generated: edit it directly.

## Releasing

Releases are cut by pushing a version tag. There are no npm tokens anywhere in this project — not
in CI secrets, not on a maintainer's machine.

```bash
# after the version bump + CHANGELOG entry are committed on main
git tag v1.2.3
git push origin v1.2.3
```

**The version lives in six files.** Bump all of them in the same commit as the CHANGELOG entry,
then check before tagging. `test/unit/plugin-sync.test.js` fails when the first, third, fourth and
fifth rows disagree, or when the plugin's copy of `SKILL.md` drifts; nothing checks the lockfile.

| File | Field |
|---|---|
| `package.json` | `version` |
| `package-lock.json` | `version` **and** `packages[""].version` |
| `plugin/.claude-plugin/plugin.json` | `version` |
| `.claude-plugin/marketplace.json` | `metadata.version` **and** `plugins[0].version` |
| `skills/a11y-loop/SKILL.md` | `metadata."a11y-loop/version"` |
| `plugin/skills/a11y-loop/SKILL.md` | generated: run `npm run sync-plugin`, don't edit |

```bash
node -e "console.log(require('./package.json').version, require('./plugin/.claude-plugin/plugin.json').version, require('./.claude-plugin/marketplace.json').plugins[0].version)"
npm run sync-plugin   # the plugin's copy of SKILL.md carries the version too
grep -o '\"a11y-loop/version\": \"[^\"]*\"' skills/a11y-loop/SKILL.md
```

Publishing is the only irreversible step here — npm unpublish is heavily restricted, so a wrong
version is corrected by releasing another, not by withdrawing. `release.yml` skips a version already
on the registry, so re-running a failed release is safe.

Pushing a `vX.Y.Z` tag triggers [`.github/workflows/release.yml`](.github/workflows/release.yml),
which publishes to npm using [trusted publishing](https://docs.npmjs.com/trusted-publishers): the
workflow proves its own identity to npm over OIDC and receives a short-lived, publish-only
credential, so every release is signed with build provenance and no long-lived secret exists. The
workflow only publishes — tests run in `ci.yml` on every push. It also skips any version already on
the registry, so a failed release is safe to re-run (`gh workflow run release.yml`).

**Marketplace listing for the GitHub Action.** `action.yml` at the root is what makes
`uses: ChanMeng666/a11y-loop@vX.Y.Z` work; the tag is the release. Listing it in the GitHub Marketplace
is a manual step that needs the repository owner: on the first release that contains `action.yml`,
open the release on GitHub, tick "Publish this Action to the GitHub Marketplace", choose the category
and accept the Marketplace agreement. The `branding` block in `action.yml` is required for the
listing. Later releases only need the box ticked again. Also push or move a major tag if you want
`@v0` to work, and keep the version in the docs' `uses:` snippets in step with the release.

Two things to know before you touch this setup:

- **Do not rename `release.yml`.** The workflow filename is part of the trust contract registered
  on npmjs.com; renaming it breaks publishing.
- **If publishing fails with an authentication error, never add a token.** Re-register the trusted
  publisher on npmjs.com (package *Settings* → *Trusted Publisher* → GitHub Actions) with owner
  `ChanMeng666`, repository `a11y-loop`, workflow filename `release.yml`, empty environment, and
  "Allow npm publish" checked. That form requires an interactive 2FA code — it is the one step in
  the release process that a human has to do by hand.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). For questions or
support, see [SUPPORT.md](SUPPORT.md). For security issues, see [SECURITY.md](SECURITY.md).
