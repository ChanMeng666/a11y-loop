---
name: trigger-25-quiet
tags: [trigger, should-not-trigger]
runs: 1
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Add retry with exponential backoff to the S3 upload in workers/ingest.js
