// @ts-check

import { commandsCtx } from '@milkdown/core';
import { expectDomTypeError } from '@milkdown/exception';
import { setBlockType } from '@milkdown/prose/commands';
import { textblockTypeInputRule } from '@milkdown/prose/inputrules';
import { $command, $inputRule, $nodeAttr, $nodeSchema, $useKeymap } from '@milkdown/utils';
import { codeBlockAttr, paragraphSchema } from '@milkdown/preset-commonmark';

export const codeBlockResultSchema = $nodeSchema('code_block_result', (ctx) => {
  return {
    content: 'text*',
    group: 'block',
    marks: '',
    defining: true,
    code: true,
    attrs: {
    },
    parseMarkdown: {
      match: ({ type }) => false,
      runner: (state, node, type) => {
        // do nothing
      },
    },
    toMarkdown: {
      match: node => node.type.name === 'code_block_result',
      runner: (state, node) => {
        // do nothing: results are not preserved in markdown
      },
    }
  };
});

export const codeBlockSchema = $nodeSchema('code_block', (ctx) => {
  return {
    content: 'block*',
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
    toDOM: (node) => {
      const attr = ctx.get(codeBlockAttr.key)(node)
      return [
        'pre',
        {
          ...attr.pre,
          'data-language': node.attrs.language,
        },
        ['code', attr.code, 0],
      ]
    },
    parseMarkdown: {
      match: ({ type }) => type === 'code',
      runner: (state, node, type) => {
        const language = /** @type {string} */(node.lang);
        const value = /** @type {string} */(node.value);
        state.openNode(type, { language })
        if (value) {
          const innerCodeTextType = paragraphSchema.type(ctx);
          state.openNode(innerCodeTextType);
          state.addText(value);
          state.closeNode();
        }

        state.closeNode()
      },
    },
    toMarkdown: {
      match: node => node.type.name === 'code_block',
      runner: (state, node) => {
        state.addNode('code', undefined, node.content.firstChild?.content?.firstChild?.text || '', {
          lang: node.attrs.language,
        })
      },
    },
  }
})


// /// A command for creating code block.
// /// You can pass the language of the code block as the parameter.
// export const createCodeBlockCommand = $command('CreateCodeBlock', ctx => (language = '') => setBlockType(codeBlockSchema.type(ctx), { language }))

// /// A command for updating the code block language of the target position.
// export const updateCodeBlockLanguageCommand = $command('UpdateCodeBlockLanguage', () => ({ pos, language }: { pos: number, language: string } = { pos: -1, language: '' }) => (state, dispatch) => {
//   if (pos >= 0) {
//     dispatch?.(state.tr.setNodeAttribute(pos, 'language', language))
//     return true
//   }

//   return false
// })

// /// Keymap for code block.
// /// - `Mod-Alt-c`: Create a code block.
// export const codeBlockKeymap = $useKeymap('codeBlockKeymap', {
//   CreateCodeBlock: {
//     shortcuts: 'Mod-Alt-c',
//     command: (ctx) => {
//       const commands = ctx.get(commandsCtx)
//       return () => commands.call(createCodeBlockCommand.key)
//     },
//   },
// })
