// @ts-check

import { prosePluginsCtx } from '@milkdown/core';
import { textblockTypeInputRule, wrappingInputRule, InputRule } from '@milkdown/prose/inputrules';
import { TextSelection } from '@milkdown/prose/state';
import { $command, $ctx, $inputRule, $nodeAttr, $nodeSchema, $useKeymap, $view } from '@milkdown/utils';

import { ProseMirrorCodeBlock } from './prose-mirror-code-block';
import { createResultEditingTransactionResult } from './result-editing-transaction-filter';
import { codeBlockBackTickLanguage, codeBlockExecutionState, codeBlockScript, customCodeBlockSchema } from './schema';

export { customCodeBlockSchema };

  import './code-block.css';

export const codeBlockView = $view(
  customCodeBlockSchema.node,
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

export const customCodeBlockInputRule = $inputRule(ctx => codeblockTypeInputRule(ctx));

export const codeBlockPlugins = [
  // TODO: check with Milkdown why this is needed
  milkdownPluginFromSchema(customCodeBlockSchema),
  milkdownPluginFromSchema(codeBlockBackTickLanguage),
  milkdownPluginFromSchema(codeBlockScript),
  milkdownPluginFromSchema(codeBlockExecutionState),
  // codeBlockView,
  customCodeBlockInputRule,
  (ctx) => {
    ctx.update(prosePluginsCtx, (prev) => [
      ...prev,
      // codeBlockPlugins
      createResultEditingTransactionResult()
    ]);
  }
];

/**
 * Build an input rule that changes the type of a textblock when the
 * matched text is typed into it. You'll usually want to start your
 * regexp with `^` to that it is only matched at the start of a
 * textblock. The optional `getAttrs` parameter can be used to compute
 * the new node's attributes, and works the same as in the
 * `wrappingInputRule` function.
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
function codeblockTypeInputRule(ctx) {
  return new InputRule(
    /^```(?<language>[a-z]*)?[\s\n]$/,
    (state, match, start, end) => {
      let $start = state.doc.resolve(start);
      let attrs = { language: match.groups?.language ?? '' };
      if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), customCodeBlockSchema.type(ctx)))
        return null;

      const codeBlockNode = customCodeBlockSchema.type(ctx).create(
        attrs,
        [
          codeBlockBackTickLanguage.type(ctx).create({}, state.schema.text(attrs.language)),
          codeBlockScript.type(ctx).create(),
          codeBlockExecutionState.type(ctx).create(),
        ]
      );

      const insertTransaction = state.tr
        .replaceRangeWith(start, end, codeBlockNode);
      
      const withSelection = insertTransaction
        .setSelection(TextSelection.create(insertTransaction.doc, end));
      
      return withSelection;
    });
}

/**
 * 
 * @param {import('@milkdown/utils').$NodeSchema<string>} schema 
 */
function milkdownPluginFromSchema(schema) {
  return /** @type {import('@milkdown/ctx').MilkdownPlugin} */(/** @type {{}} */(schema));
}
