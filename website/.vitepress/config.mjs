import { withMermaid } from 'vitepress-plugin-mermaid';

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
    ]
  ],

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
