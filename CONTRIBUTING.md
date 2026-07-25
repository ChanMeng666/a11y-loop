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

This project is not yet published to npm and has no GitHub remote pushed yet, so `npm install`
means installing from your local clone. If you keep Playwright browsers off the system drive, set
`PLAYWRIGHT_BROWSERS_PATH` before running `npx playwright install chromium`.

When your change touches `demo/` or other seeded-violation fixtures, run the full
audit-fix-re-audit loop to convergence (`a11y-loop diff` should report "Converged") before opening
a PR — see [`AGENTS.md`](AGENTS.md) for the full discipline. Never soften the project's honesty
language (no "compliant", "guarantees", "fully accessible", "no manual testing needed", or a single
accessibility score) in code, docs, or output you add.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). For questions or
support, see [SUPPORT.md](SUPPORT.md). For security issues, see [SECURITY.md](SECURITY.md).
