# Manual checklist: header-nav.html

- **Test with a real screen reader (NVDA or JAWS on Windows, VoiceOver on macOS/iOS).**  
  Why: No automated tool, and no simulator, reproduces real AT behaviour — NVDA, JAWS and VoiceOver diverge from each other and from the specification.
- **Tab through the page and confirm the focus order is logical, not merely present.**  
  Why: a11y-loop can see that focus moves and where it goes, but whether the sequence makes sense for this content is a human judgment.
- **Complete the page’s main task using only the keyboard.**  
  Why: Automated checks probe individual controls; they do not know what the user is trying to accomplish.
- **Submit the form with 1 field in an invalid state and confirm each error is announced, identifies the field, and says how to fix it.**  
  Why: SC 3.3.1 and 3.3.3 are about whether an error message is actionable, which no tool can assess. Error states also usually only exist after interaction — audit them with --interact.
- **Confirm every field label describes what to enter, not just that a label exists.**  
  Why: A label of "Field 1" satisfies every automated rule and tells the user nothing.
- **Read each link text out of context and confirm the destination is still clear.**  
  Why: SC 2.4.4 permits vague link text when the surrounding context supplies the purpose — whether it does is a judgment call.
- **Confirm the heading structure describes the content hierarchy, not the visual sizes.**  
  Why: Automation can detect skipped levels but not whether the outline reflects the actual structure of the page.
- **Review the 13 ARIA attributes on this page: is each one appropriate, or merely valid?**  
  Why: Pages using ARIA average more accessibility errors than pages without it (WebAIM Million 2026: 59.1 vs 42.0). A role is a promise — role="button" commits to the full keyboard behaviour of a button. No ARIA is better than bad ARIA.
- **Confirm colour is never the only way information is conveyed.**  
  Why: SC 1.4.1 is one of the criteria no tool can test: recognising that "the required fields are in red" needs comprehension of the content.
