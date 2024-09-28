// @ts-check

import { prosePluginsCtx } from '@milkdown/core';
import { InputRule, textblockTypeInputRule, wrappingInputRule } from '@milkdown/prose/inputrules';
import { EditorState, Plugin, TextSelection } from '@milkdown/prose/state';
import { $command, $ctx, $inputRule, $nodeAttr, $nodeSchema, $useKeymap, $view } from '@milkdown/utils';

import { backtickAutoconvertInputRule } from './backtick-autoconvert-input-rule';
import { ProseMirrorCodeBlockView } from './prose-mirror-code-block-view';
import { createCodeBlockStatePlugin } from './code-block-state-plugin';
import { codeBlockBackTickLanguage, codeBlockExecutionState, codeBlockScript, customCodeBlockSchema } from './schema';

/**
 * @type {Plugin[]}
 */
export const proseMirrorPlugins = [
  createCodeBlockStatePlugin()
];

const codeBlockView_unused = $view(
  customCodeBlockSchema.node,
  (ctx) => {
    return (node, view, getPos) => new ProseMirrorCodeBlockView(
      ctx,
      node,
      view,
      getPos,
    );
  });
