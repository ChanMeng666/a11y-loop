# Context contamination probe (2026-10)

Before the clean arms were added, a fresh Agent-tool subagent (model `sonnet`)
was asked, with no tools, whether its context held any project instruction
file, memory or skill text mentioning a11y-loop, accessibility, WCAG or
axe-core. It answered **YES** and quoted the first lines of
`D:\github_repository\a11y-loop\AGENTS.md` and of the a11y-loop project's
auto-memory index. Agent-tool subagents spawned from a session in this
repository inherit that context, so the `agent-tool/baseline` arm was not a
no-guidance condition: its model could read a project file that describes
writing accessible UI by default.

The same question asked of `claude -p --model sonnet` started from an empty
directory outside the repository (the clean arms' setup) got **NO**. It reported
the user-level instructions about scratch files and execution style, no memory
index, and no accessibility skill. The a11y-loop Claude Code plugin is installed
on this machine at user scope but was disabled (`claude plugin list`:
`Status: ✘ disabled`) for every run.

Both answers are a model's self-report about its own context. They are strong
evidence, not proof.
