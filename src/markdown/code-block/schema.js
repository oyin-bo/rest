// @ts-check

import { expectDomTypeError } from '@milkdown/exception';
import { $nodeSchema } from '@milkdown/utils';

export const codeBlockResultSchema = $nodeSchema('code_block_result', (ctx) => {
  return {
    content: 'text*',
    group: 'block',
    marks: '',
    defining: true,
    code: true,
    isolating: true,
    editable: false,
    attrs: {
    },
    parseDOM: [
      {
        tag: 'pre',
        preserveWhitespace: 'full'
      } 
    ],
    toDOM: (node) => ['pre', { 'class': 'code-block-result' }, 0],
    parseMarkdown: {
      match: ({ type }) => false,
      runner: (state, node, type) => {
        // no op: code block result is not supported in markdown
      },
    },
    toMarkdown: {
      match: node => node.type.name === 'code_block_result',
      runner: (state, node) => {
        // no op: code block result is not supported in markdown
      },
    },
  };
});

export const codeBlockSchema = $nodeSchema('code_block', (ctx) => {
  return {
    content: 'text*',
    group: 'block',
    marks: '',
    defining: true,
    code: true,
    attrs: {
      language: {
        default: '',
      },
    },
    parseDOM: [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement))
            throw expectDomTypeError(dom)

          return { language: dom.dataset.language }
        },
      },
    ],
    toDOM: (node) => ['pre', { 'data-language': node.attrs.language }, 0],
    parseMarkdown: {
      match: ({ type }) => type === 'code',
      runner: (parserState, mdNode, type) => {
        parserState.openNode(type, { language: mdNode.lang })
        if (typeof mdNode.value === 'string' && mdNode.value) {
          parserState.addText(mdNode.value);
        }
        parserState.closeNode();
      },
    },
    toMarkdown: {
      match: node => node.type.name === 'code_block',
      runner: (serializerState, proseNode) => {
        const lang =
          proseNode.attrs.language ||
          proseNode.attrs.lang ||
          /** @type {{ lang?: string}} */(proseNode).lang;

        serializerState.addNode(
          'code',
          undefined,
          proseNode.content.firstChild?.text || '',
          { lang });
      },
    },
  }
})
