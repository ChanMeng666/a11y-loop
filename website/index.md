---
layout: home

# The developer signature block in .vitepress/theme/DeveloperSignature.vue takes
# over the footer on this page and carries the MIT/copyright line itself, so
# VitePress's stock VPFooter is switched off here to avoid a second contentinfo
# landmark. Every other page keeps the default footer.
footer: false

hero:
  name: a11y-loop
  text: Write accessible UI by default.
  tagline: Verify it in a real browser. Say exactly what you couldn't check.
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: a11y-loop logo — three connected nodes in a closed loop
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
  - icon: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 14V18.4C4 18.7314 4.26863 19 4.6 19H10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 14V18.4C19 18.7314 18.7314 19 18.4 19H14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 5H18.4C18.7314 5 19 5.26863 19 5.6V10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10V5.6C4 5.26863 4.26863 5 4.6 5H10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 19V20C14 21.1046 13.1046 22 12 22C10.8954 22 10 21.1046 10 20V19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10H5C6.10457 10 7 10.8954 7 12C7 13.1046 6.10457 14 5 14H4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10H20C21.1046 10 22 10.8954 22 12C22 13.1046 21.1046 14 20 14H19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 5V4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4V5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    title: An Agent Skill
    details: Plan rules that apply while the work is still being scoped, then standing generation rules — semantic HTML, ARIA discipline, APG keyboard contracts, labels, focus visibility, AA contrast, reduced motion, 24×24 targets — that apply while an AI agent writes UI code.
  - icon: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 4H5.6C5.26863 4 5 4.26863 5 4.6V20.4C5 20.7314 5.26863 21 5.6 21H18.4C18.7314 21 19 20.7314 19 20.4V4.6C19 4.26863 18.7314 4 18.4 4H15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 3.6C9 3.26863 9.26863 3 9.6 3H14.4C14.7314 3 15 3.26863 15 3.6V4.6C15 4.93137 14.7314 5.2 14.4 5.2H9.6C9.26863 5.2 9 4.93137 9 4.6V3.6Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12.5L11 14.5L15 10.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    title: Accessibility enters at the plan
    details: §0 settles the conformance target, the per-component acceptance criteria, the structure, and the color tokens — contrast --fix needs no browser and no code — and names the product choices that foreclose accessibility, like drag-only reordering (SC 2.5.7) or hover-only menus (SC 1.4.13), each with its alternative, while changing them is still a sentence rather than a rewrite.
    link: /guide/planning
    linkText: How the plan phase works
  - icon: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor"/><path d="M16.5829 9.66667C15.8095 8.09697 14.043 7 11.9876 7C9.38854 7 7.25148 8.75408 7 11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.4939 9.72222H16.4001C16.7315 9.72222 17.0001 9.45359 17.0001 9.12222V7.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.41707 13.6667C8.19054 15.6288 9.95698 17 12.0124 17C14.6115 17 16.7485 14.8074 17 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5061 13.6222H7.59992C7.26855 13.6222 6.99992 13.8909 6.99992 14.2222V16.4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    title: A verification loop
    details: The a11y-loop CLI audits the rendered result in a real browser, feeds failures back to the agent to fix, and re-audits until the report converges on zero violations.
  - icon: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 19V11C7 9.89543 7.89543 9 9 9H20C21.1046 9 22 9.89543 22 11V19C22 20.1046 21.1046 21 20 21H9C7.89543 21 7 20.1046 7 19Z" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 16H4C2.89543 16 2 15.1046 2 14V6C2 4.89543 2.89543 4 4 4H15C16.1046 4 17 4.89543 17 6V9" stroke="currentColor" stroke-width="1.5"/><path d="M10 12H11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 7H6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    title: Five rendering passes
    details: Default viewport, dark mode, forced-colors mode, reduced motion, and a 320px reflow pass — because most real failures only show up under a specific rendering condition.
  - icon: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6.1414 19.995C8.59885 21.7157 10.4224 19.9831 11.4592 18.5025L18.7592 8.07692L20.7255 7.0122L14.1723 2.42358L5.7251 14.4875C4.68838 15.9681 3.68394 18.2743 6.1414 19.995Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.091 11.0194C13.2146 10.1673 11.6877 11.801 8.81128 10.9489" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    title: Checks axe-core can't run
    details: Tab order, focus visibility, dialog focus traps, target size, reduced-motion effectiveness, ambiguous link text, and div-as-button — alongside axe-core, not instead of it. The dialog and tab-order checks survey portalled dialogs, the kind Base UI, Radix and anything on floating-ui ships, not only a native dialog element opened with showModal().
  - icon: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10 9H6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 11C14.1193 11 13 9.88071 13 8.5C13 7.11929 14.1193 6 15.5 6C16.8807 6 18 7.11929 18 8.5C18 9.88071 16.8807 11 15.5 11Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 6H9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 18L13.5 15L11 17L6 13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4Z" stroke="currentColor" stroke-width="1.5"/></svg>'
    title: Honest, structured output
    details: Every finding carries its WCAG success criterion, ACT rule ID, and provenance. A generated manual-review checklist ships with every run — no single accessibility score, ever.
  - icon: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 12.5L8 14.5L7 18L8 21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 20.5L16.5 18L14 17V13.5L17 12.5L21.5 13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 5.5L18.5 7L15 7.5V10.5L17.5 9.5H19.5L21.5 10.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 10.5L5 8.5L7.5 8L9.5 5L8.5 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    title: Portable as an Agent Skill
    details: Built on the open Agent Skills standard — the same SKILL.md works across 40+ clients, not just one vendor's agent.
---

## What is a11y-loop?

AI coding agents write inaccessible UI by default — 84% of AI-generated web pages carry
accessibility issues, and telling the model to "be accessible" barely moves that number.
a11y-loop puts accessibility in three places instead: the **plan**, where the decisions that
foreclose it are still a sentence to change rather than a rewrite; the **standing generation
rules** the agent writes UI under; and a **browser-verified audit loop** that checks the rendered
result and states plainly what it could not check. Accessibility becomes a default of the
development workflow rather than an after-the-fact compliance check.

Start with [Planning with Accessibility](/guide/planning) if the UI work is still being scoped, or
the [Getting Started guide](/guide/getting-started) if there is already code. The
[full introduction and honest-coverage statement](https://github.com/ChanMeng666/a11y-loop#-introduction)
is on GitHub.
