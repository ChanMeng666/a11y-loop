---
name: trigger-23-quiet
tags: [trigger, should-not-trigger]
runs: 1
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

This query times out, rewrite the correlated subquery as a window function
