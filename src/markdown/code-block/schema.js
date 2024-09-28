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
    toDOM: (node) => ['pre', { 'class': 'code_block_result' }, 0],
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

export const codeBlockBackTickLanguage = $nodeSchema('code_block_backtick_language', (ctx) => {
  return {
    content: 'text*',
    group: 'block',
    marks: '',
    defining: true,
    isolating: true,
    toDOM: () => [
      'div',
      { class: 'code_block_backtick_language' },
      ['span', { class: 'backtick' }, 0]
    ],
    parseDOM: [
      { tag: 'div' }
    ],
    parseMarkdown: {
      match: () => false,
      runner: () => {
      }
    },
    toMarkdown: {
      match: () => false,
      runner: () => {
      }
    }
  };
});

export const codeBlockScript = $nodeSchema('code_block_script', (ctx) => {
  return {
    content: 'text*',
    group: 'block',
    marks: '',
    defining: true,
    isolating: true,
    toDOM: () => [
      'pre',
      { class: 'code_block_script' },
      0
    ],
    parseDOM: [
      {
        tag: 'pre',
        preserveWhitespace: 'full'
      }
    ],
    parseMarkdown: {
      match: () => false,
      runner: () => {
      }
    },
    toMarkdown: {
      match: () => false,
      runner: () => {
      }
    }
  };
});

export const codeBlockExecutionState = $nodeSchema('code_block_execution_state', (ctx) => {
  return {
    content: 'text?',
    group: 'block',
    marks: '',
    defining: true,
    isolating: true,
    toDOM: () => [
      'div',
      { class: 'code_block_execution_state' },
      0
    ],
    parseDOM: [
      { tag: 'div' }
    ],
    parseMarkdown: {
      match: () => false,
      runner: () => {
      }
    },
    toMarkdown: {
      match: () => false,
      runner: () => {
      }
    }
  };
});

export const codeBlockSchema = $nodeSchema('code_block', (ctx) => {
  return {
    content: 'code_block_backtick_language code_block_script code_block_execution_state',
    group: 'block',
    marks: '',
    defining: true,
    code: true,
    toDOM: mdNode => ['div', { class: 'code_block' }, 0],
    parseDOM: [
      { tag: 'pre', preserveWhitespace: 'full' }
    ],
    parseMarkdown: {
      match: mdNode => mdNode.type === 'code',
      runner: (parserState, mdNode, proseMirrorNodeType) => {
        parserState.openNode(proseMirrorNodeType);

        parserState.openNode(codeBlockBackTickLanguage.type(ctx))
        if (typeof mdNode.lang === 'string' && mdNode.lang)
          parserState.addText(mdNode.lang);
        parserState.closeNode();

        parserState.openNode(codeBlockScript.type(ctx))
        if (typeof mdNode.value === 'string' && mdNode.value)
          parserState.addText(mdNode.value);
        parserState.closeNode();

        parserState.openNode(codeBlockExecutionState.type(ctx))
        parserState.closeNode();
        parserState.closeNode();
      }
    },
    toMarkdown: {
      match: mdNode => mdNode.type.name === 'code_block',
      runner: (state, proseMirrorNode) => {
        const backTickNode = proseMirrorNode.child(0);
        const scriptNode = proseMirrorNode.child(1);
        state.addNode(
          'code',
          undefined,
          scriptNode.textContent,
          { lang: backTickNode.textContent });
      }
    }
  };
});
