import DefaultTheme from 'vitepress/theme';
import './custom.css';

// ARIA button-role contract fix: any role="button" element must activate on
// both Enter and Space (APG button pattern). VitePress's own sidebar-group
// caret only wires Enter, which axe-core's role-button-keyboard-activation
// rule (correctly) flags. Applied globally rather than patched per-component
// since the same gap can occur wherever role="button" is used on a non-<button>.
function bindButtonRoleSpaceKey() {
  if (typeof window === 'undefined') return;
  document.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.code !== 'Space') return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.getAttribute('role') === 'button' &&
      target.tagName !== 'BUTTON'
    ) {
      event.preventDefault();
      target.click();
    }
  });
}

export default {
  extends: DefaultTheme,
  enhanceApp() {
    bindButtonRoleSpaceKey();
  }
};
