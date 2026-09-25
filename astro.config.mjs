// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { visit } from 'unist-util-visit';

/**
 * ```mermaid 코드 펜스를 <pre class="mermaid">로 변환한다.
 * 실제 렌더링은 글 레이아웃에서 mermaid를 CDN으로 불러와 클라이언트에서 처리한다.
 */
function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang === 'mermaid') {
        node.type = 'html';
        node.value = `<pre class="mermaid">${node.value}</pre>`;
      }
    });
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://sujinkim1127.github.io',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkMermaid],
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
