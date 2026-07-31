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

**Keep the skill portable.** `skill/a11y-loop/` is the whole product and it targets the open Agent
Skills standard, not one client. The Claude-Code-only layer (`.claude-plugin/`, `hooks/`,
`commands/`) is optional and additive: nothing under `skill/` may depend on it, and no
Claude-Code-specific mechanism — hooks, plugin manifests, slash commands, `ExitPlanMode` — may
appear in `SKILL.md` or `references/`. A PR that blurs that line will be asked to split it.

## Releasing

Releases are cut by pushing a version tag. There are no npm tokens anywhere in this project — not
in CI secrets, not on a maintainer's machine.

```bash
# after the version bump + CHANGELOG entry are committed on main
git tag v1.2.3
git push origin v1.2.3
```

**The version lives in four files and nothing enforces that they agree.** Bump all of them in the
same commit as the CHANGELOG entry, then check before tagging:

| File | Field |
|---|---|
| `package.json` | `version` |
| `.claude-plugin/plugin.json` | `version` |
| `.claude-plugin/marketplace.json` | `metadata.version` **and** `plugins[0].version` |
| `skill/a11y-loop/SKILL.md` | `metadata."a11y-loop/version"` |

```bash
node -e "console.log(require('./package.json').version, require('./.claude-plugin/plugin.json').version, require('./.claude-plugin/marketplace.json').plugins[0].version)"
grep -o '\"a11y-loop/version\": \"[^\"]*\"' skill/a11y-loop/SKILL.md
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
