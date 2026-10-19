<script setup>
/**
 * Wraps VitePress's default layout to fill two slots on the homepage only:
 * the promo video under the hero, and the developer signature footer.
 *
 * `layout-bottom` renders on every page, so the signature is gated on the home
 * layout. VitePress's own VPFooter already hides itself on any page that has a
 * sidebar — which is every guide page here — so the homepage was the only place
 * it appeared, and gating this the same way leaves the rest of the site alone.
 */
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';
import VideoShowcase from './VideoShowcase.vue';
import DeveloperSignature from './DeveloperSignature.vue';

const { Layout: DefaultLayout } = DefaultTheme;
const { frontmatter } = useData();

const isHome = computed(() => frontmatter.value.layout === 'home');
</script>

<template>
  <DefaultLayout>
    <template #home-hero-info-after>
      <div class="hero-install">
        <p class="hero-install-label">Install the skill for any agent that reads Agent Skills</p>
        <pre class="hero-install-code" tabindex="0"><code>npx skills add ChanMeng666/a11y-loop -g -y</code></pre>
      </div>
    </template>

    <template #home-hero-after>
      <VideoShowcase />
    </template>

    <template #layout-bottom>
      <DeveloperSignature v-if="isHome" />
    </template>
  </DefaultLayout>
</template>

<style scoped>
.hero-install {
  margin-top: 24px;
  max-width: 480px;
}
.hero-install-label {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
.hero-install-code {
  margin: 0;
  padding: 12px 16px;
  overflow-x: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
}
</style>
