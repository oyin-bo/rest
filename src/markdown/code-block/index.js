// @ts-check

import { prosePluginsCtx } from '@milkdown/core';
import { $ctx, $view } from '@milkdown/utils';

import { ProseMirrorCodeBlock } from './prose-mirror-code-block';
import { createResultEditingTransactionResult } from './result-editing-transaction-filter';
import { codeBlockBackTickLanguage, codeBlockExecutionState, codeBlockResultSchema, codeBlockSchema, codeBlockScript } from './schema';

import './code-block.css';

export const codeBlockView = $view(
  codeBlockSchema.node,
  (ctx) => {
    ctx.update(prosePluginsCtx, (prev) => [
      ...prev,
      // codeBlockPlugins
      createResultEditingTransactionResult()
    ]);

    return (node, view, getPos) => new ProseMirrorCodeBlock(
      ctx,
      node,
      view,
      getPos,
    );
  });

export const codeBlockPlugins = [
  // TODO: check with Milkdown why this is needed
  milkdownPluginFromSchema(codeBlockSchema),
  milkdownPluginFromSchema(codeBlockBackTickLanguage),
  milkdownPluginFromSchema(codeBlockScript),
  milkdownPluginFromSchema(codeBlockExecutionState),
  milkdownPluginFromSchema(codeBlockResultSchema),
  //codeBlockView
];

/**
 * 
 * @param {import('@milkdown/utils').$NodeSchema<string>} schema 
 */
function milkdownPluginFromSchema(schema) {
  return /** @type {import('@milkdown/ctx').MilkdownPlugin} */(/** @type {{}} */(schema));
}
