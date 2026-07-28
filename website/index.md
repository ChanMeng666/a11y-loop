---
layout: home

hero:
  name: a11y-loop
  text: Write accessible UI by default.
  tagline: Verify it in a real browser. Say exactly what you couldn't check.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: CLI Usage
      link: /guide/cli-usage
    - theme: alt
      text: View on GitHub
      link: https://github.com/ChanMeng666/a11y-loop

features:
  - icon: 🧩
    title: An Agent Skill
    details: Standing generation rules — semantic HTML, ARIA discipline, APG keyboard contracts, labels, focus visibility, AA contrast, reduced motion, 24×24 targets — that apply while an AI agent writes UI code.
  - icon: 🔁
    title: A verification loop
    details: The a11y-loop CLI audits the rendered result in a real browser, feeds failures back to the agent to fix, and re-audits until the report converges on zero violations.
  - icon: 🖥️
    title: Five rendering passes
    details: Default viewport, dark mode, forced-colors mode, reduced motion, and a 320px reflow pass — because most real failures only show up under a specific rendering condition.
  - icon: 🧪
    title: Checks axe-core can't run
    details: Tab order, focus visibility, dialog focus traps, target size, reduced-motion effectiveness, ambiguous link text, and div-as-button — alongside axe-core, not instead of it.
  - icon: 📊
    title: Honest, structured output
    details: Every finding carries its WCAG success criterion, ACT rule ID, and provenance. A generated manual-review checklist ships with every run — no single accessibility score, ever.
  - icon: 🌐
    title: Portable as an Agent Skill
    details: Built on the open Agent Skills standard — the same SKILL.md works across 40+ clients, not just one vendor's agent.
---

## What is a11y-loop?

AI coding agents write inaccessible UI by default — 84% of AI-generated web pages carry
accessibility issues, and telling the model to "be accessible" barely moves that number.
a11y-loop pairs a **standing generation skill** with a **browser-verified audit loop**, so
accessibility becomes a default of the development workflow rather than an after-the-fact
compliance check.

Read the [full introduction and honest-coverage statement on GitHub](https://github.com/ChanMeng666/a11y-loop#-introduction),
or jump straight into the [Getting Started guide](/guide/getting-started).
