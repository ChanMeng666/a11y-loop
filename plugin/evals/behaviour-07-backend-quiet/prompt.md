---
name: behaviour-07-backend-quiet
tags: [behaviour, negative]
runs: 3
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

Our nightly job in workers/ingest.js occasionally double-processes messages after a retry. Add an idempotency key check using the message id and a KV lookup.
