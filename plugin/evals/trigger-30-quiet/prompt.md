---
name: trigger-30-quiet
tags: [trigger, should-not-trigger]
runs: 1
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Plan the migration that splits the users table into users and user_profiles with zero downtime
