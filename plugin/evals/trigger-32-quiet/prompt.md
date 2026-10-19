---
name: trigger-32-quiet
tags: [trigger, should-not-trigger]
runs: 1
max_turns: 3
allowed_tools: [Read, Glob, Grep, Skill]
---

Design the ETL pipeline: Kafka into a staging table, dbt models on top, nightly reconciliation job
