import { withMermaid } from 'vitepress-plugin-mermaid';

const siteUrl = 'https://ChanMeng666.github.io/a11y-loop/';
const ogImage = `${siteUrl}og-image.png`;
const ogDescription =
  "An Agent Skill + CLI that audits AI-generated UI against WCAG 2.2 AA in a real browser — and says exactly what it couldn't check.";

export default withMermaid({
  title: 'a11y-loop',
  description: 'Write accessible UI by default. Verify it in a real browser.',
  base: '/a11y-loop/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/a11y-loop/favicon.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
      }
    ],

    // Open Graph / Twitter Card — static parts (image is shared across pages;
    // title/description/url are filled in per-page by transformPageData below)
    ['meta', { property: 'og:site_name', content: 'a11y-loop' }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    [
      'meta',
      {
        property: 'og:image:alt',
        content: 'a11y-loop — write accessible UI by default, verify it in a real browser'
      }
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: ogImage }]
  ],

  // Per-page og:title / og:description / og:url / canonical, following
  // VitePress's own docs config (docs/.vitepress/config.ts) for the pattern.
  transformPageData(pageData) {
    const url = new URL(
      pageData.relativePath.replace(/(?:(^|\/)index)?\.md$/, '$1'),
      siteUrl
    ).href;
    const title =
      pageData.frontmatter.layout === 'home'
        ? 'a11y-loop — Write accessible UI by default'
        : pageData.title
          ? `${pageData.title} | a11y-loop`
          : 'a11y-loop';
    const description = pageData.description || ogDescription;

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['link', { rel: 'canonical', href: url }]
    );
  },

  themeConfig: {
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'CLI Usage', link: '/guide/cli-usage' },
      { text: 'GitHub', link: 'https://github.com/ChanMeng666/a11y-loop' },
      { text: 'npm', link: 'https://www.npmjs.com/package/a11y-loop' }
    ],

    sidebar: [
      {
        text: 'Guide',
        link: '/guide/getting-started',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'CLI Usage', link: '/guide/cli-usage' },
          { text: 'Using it in CI', link: '/guide/ci-integration' },
          { text: 'Architecture & the Loop', link: '/guide/architecture' },
          { text: 'Honest Coverage', link: '/guide/honest-coverage' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ChanMeng666/a11y-loop' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/a11y-loop' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Chan Meng'
    },

    editLink: {
      pattern: 'https://github.com/ChanMeng666/a11y-loop/edit/main/website/:path',
      text: 'Edit this page on GitHub'
    }
  },

  mermaid: {},
  mermaidPlugin: {
    class: 'mermaid'
  }
});
