<script setup>
/**
 * Developer signature for the homepage footer.
 *
 * Deliberately one band, one accent colour and one primary call to action. The
 * brief was to invite custom-build enquiries without the block reading as an
 * advertisement, so the pitch is a single sentence in Chan Meng's own wording
 * from the README, the email is the only filled control on the page below the
 * hero, and the GitHub portfolio sits beside it as a plain text link rather than
 * competing for the same visual weight.
 *
 * This replaces VitePress's own VPFooter on the homepage (index.md sets
 * `footer: false`), so the MIT/copyright line is reproduced here — otherwise the
 * page would either lose it or grow a second contentinfo landmark.
 */
import ChanLogo from './ChanLogo.vue';

const EMAIL = 'chanmeng.dev@gmail.com';
const GITHUB = 'https://github.com/ChanMeng666';
</script>

<template>
  <footer class="dev-footer">
    <div class="dev-footer__inner">
      <div class="dev-footer__brand">
        <span class="dev-footer__mark"><ChanLogo /></span>
        <span class="dev-footer__id">
          <span class="dev-footer__kicker">Built and maintained by</span>
          <span class="dev-footer__name">Chan Meng</span>
        </span>
      </div>

      <div class="dev-footer__pitch">
        <p class="dev-footer__line">Need a custom app like this one? I build them — let's talk.</p>
        <div class="dev-footer__actions">
          <a class="dev-footer__cta" :href="`mailto:${EMAIL}`">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path
                d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5zM3.5 7l8.5 6 8.5-6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ EMAIL }}
          </a>

          <a class="dev-footer__link" :href="GITHUB" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path
                d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85l-.01 2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2z"
                fill="currentColor"
              />
            </svg>
            github.com/ChanMeng666<span class="dev-footer__sr"> (portfolio, opens in a new tab)</span>
          </a>
        </div>
      </div>
    </div>

    <p class="dev-footer__legal">Released under the MIT License. Copyright © 2026 Chan Meng</p>
  </footer>
</template>

<style scoped>
.dev-footer {
  box-sizing: border-box;
  border-top: 1px solid var(--vp-c-gutter);
  padding: 36px 24px 32px;
  background-color: var(--vp-c-bg);
}

.dev-footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px 40px;
  max-width: 1152px;
  margin: 0 auto;
}

.dev-footer__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.dev-footer__mark {
  flex: none;
  width: 44px;
  height: 44px;
  color: var(--vp-c-text-1);
}

.dev-footer__id {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dev-footer__kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.dev-footer__name {
  font-family: var(--a11y-font-display);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.dev-footer__pitch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.dev-footer__line {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.dev-footer__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
}

/* --vp-c-brand-3 resolves to the same #2554e5 in both themes, so the one filled
   control on the page keeps a fixed identity: white on it is 6.03:1, and its
   edge against the dark canvas is 3.21:1 — past the 3:1 SC 1.4.11 wants of a
   component boundary, which the lighter dark-mode brand token would not be. */
.dev-footer__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background-color: var(--vp-c-brand-3);
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.dev-footer__cta:hover {
  background-color: #1a45bd;
}

.dev-footer__link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 2px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dev-footer__link:hover {
  color: var(--vp-c-brand-2);
}

@media (prefers-reduced-motion: no-preference) {
  .dev-footer__cta,
  .dev-footer__link {
    transition:
      background-color 0.25s ease,
      color 0.25s ease;
  }
}

.dev-footer__cta:focus-visible,
.dev-footer__link:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
  border-radius: 999px;
}

.dev-footer__legal {
  max-width: 1152px;
  margin: 28px auto 0;
  padding-top: 20px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.dev-footer__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Windows High Contrast: the cobalt fill is dropped for system colors so the
   call to action keeps a real fill/text/border boundary, and the logo — which
   inherits currentColor — follows the forced text colour rather than vanishing. */
@media (forced-colors: active) {
  .dev-footer__cta {
    background-color: ButtonFace;
    color: ButtonText;
    border: 1px solid ButtonText;
  }

  .dev-footer__cta:focus-visible,
  .dev-footer__link:focus-visible {
    outline-color: Highlight;
  }
}

@media (max-width: 720px) {
  .dev-footer {
    padding: 28px 22px 26px;
  }

  .dev-footer__inner {
    align-items: flex-start;
    gap: 20px;
  }

  .dev-footer__pitch {
    align-items: flex-start;
    gap: 14px;
  }
}
</style>
