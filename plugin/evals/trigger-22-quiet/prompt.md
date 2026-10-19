---
name: trigger-22-quiet
tags: [trigger, should-not-trigger]
runs: 1
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Refactor the argument parsing in bin/deploy.js to use node:util parseArgs
