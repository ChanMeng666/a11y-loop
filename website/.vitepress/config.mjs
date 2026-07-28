import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid({
  title: 'a11y-loop',
  description: 'Write accessible UI by default. Verify it in a real browser.',
  base: '/a11y-loop/',
  cleanUrls: true,
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'CLI Usage', link: '/guide/cli-usage' },
      { text: 'GitHub', link: 'https://github.com/ChanMeng666/a11y-loop' },
      { text: 'npm', link: 'https://www.npmjs.com/package/a11y-loop' }
    ],

    sidebar: [
      {
        text: 'Guide',
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
