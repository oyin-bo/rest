// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import * as myst from 'myst-parser';

import { addCodeHighlightProvider } from '../state/plugin-highlight-service';

const key = new PluginKey('MARKDOWN_HIGHLIGHT');
export const markdownHighlightPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      addCodeHighlightProvider(
        editorState,
        {
          codeHighlights: ({ codeBlockRegions, editorState, invalidate }) => {
            return getMarkdownHighlightsForCodeBlocks(codeBlockRegions);
          }
        });
    },
    apply: (tr, pluginState, oldState, newState) => undefined
  },
});

/**
 * @param {import('../state-block-regions/find-code-blocks').CodeBlockNodeset[]} codeBlockRegions
 */
function getMarkdownHighlightsForCodeBlocks(codeBlockRegions) {
  /**
   * @type {(import('../state/plugin-highlight-service').CodeBlockHighlightSpan[] | undefined)[]}
   */
  const highlightsOfBlocks = [];

  for (let iBlock = 0; iBlock < codeBlockRegions.length; iBlock++) {
    const block = codeBlockRegions[iBlock];
    if (block.language !== 'Markdown') continue;

    const parsed = parseMarkdownText(block.code);
    if (parsed) {
      /** @type {typeof highlightsOfBlocks[0]} */
      const highlights = [];

      const nestType = [];

      /** @param {typeof parsed.children[0]} node */
      const visitNode = (node) => {
        let pushed = false;
        if (node.type !== 'root' && node.type !== 'text') {
          nestType.push(node.type);
          pushed = true;
        }

        if (node.children) {
          for (const child of node.children) {
            visitNode(child);
          }
        }

        if (node.type && node.position?.start && node.position.end) {
          const from = block.lineMap[node.position.start.line - 1] + node.position.start.column;
          const to = block.lineMap[node.position.end.line - 1] + node.position.end.column;

          if (to > from) {
            highlights.push({
              from,
              to,
              class: 'hi-' + nestType.join('-')
            });
          }
        }

        if (pushed) {
          nestType.pop();
        }
      };
      visitNode(parsed);

      if (highlights.length) highlightsOfBlocks[iBlock] = highlights;
    }
  }

  return highlightsOfBlocks;
}

var parser;

/**
 * @param {string} httpText
 */
export function parseMarkdownText(httpText) {
  const parsed = myst.mystParse(
    httpText,
    {
    });
  return parsed;
}
