# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| Latest  | :white_check_mark: |

We provide security updates for the latest released version on the `main` branch.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email **chanmeng.dev@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce or a proof of concept
- The potential impact
- A suggested fix, if you have one

## Response Timeline

- **Acknowledgment**: within 48 hours of receiving your report
- **Assessment**: within 7 days we will confirm the issue and assess severity
- **Resolution**: we aim to release a fix within 30 days for confirmed vulnerabilities

## Scope

Security concerns most likely to apply to this project include:

- Injection or insecure handling of user-supplied input
- Exposure or leakage of sensitive data
- Dependencies with known vulnerabilities
- `a11y-loop audit` launches a real Chromium instance against a URL, a local file, or an HTML
  fragment you supply — treat any code path that could make it fetch or render untrusted,
  attacker-controlled targets (e.g. an internal network URL passed through from an unvalidated
  input) as in scope
- `a11y-loop audit --interact <module>` imports and executes the JavaScript module you point it at.
  It is your code by design, but treat any path that could cause an untrusted module to be loaded
  as in scope
- The optional Claude Code plugin runs `hooks/plan-gate.mjs` on every `ExitPlanMode`. It reads the
  plan from the hook payload — including, when the payload carries only a path, from
  `tool_input.planFilePath` — writes only a small state file under `CLAUDE_PLUGIN_DATA` (or the
  system temp directory), makes no network calls, and executes nothing from the plan. Report
  anything that contradicts that

## Attribution

We appreciate responsible disclosure. With your permission, contributors who report valid security
issues will be acknowledged in the project.
