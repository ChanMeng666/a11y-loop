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
    <template #home-hero-after>
      <VideoShowcase />
    </template>

    <template #layout-bottom>
      <DeveloperSignature v-if="isHome" />
    </template>
  </DefaultLayout>
</template>
