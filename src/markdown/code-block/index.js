// @ts-check

import { prosePluginsCtx } from '@milkdown/core';
import { InputRule, textblockTypeInputRule, wrappingInputRule } from '@milkdown/prose/inputrules';
import { TextSelection } from '@milkdown/prose/state';
import { $command, $ctx, $inputRule, $nodeAttr, $nodeSchema, $useKeymap, $view } from '@milkdown/utils';

import { backtickAutoconvertInputRule } from './backtick-autoconvert-input-rule';
import { codeBlockBackTickLanguage, codeBlockExecutionState, codeBlockScript, customCodeBlockSchema } from './schema';

import './code-block.css';
import { createCodeBlockStatePlugin } from './state';

export const codeBlockPlugins = [
  // TODO: check with Milkdown why this is needed
  milkdownPluginFromSchema(customCodeBlockSchema),
  milkdownPluginFromSchema(codeBlockBackTickLanguage),
  milkdownPluginFromSchema(codeBlockScript),
  milkdownPluginFromSchema(codeBlockExecutionState),
  backtickAutoconvertInputRule,
  /**
 * @param {import("@milkdown/ctx").Ctx} ctx
   */
  (ctx) => {
    ctx.update(prosePluginsCtx, (prev) => [
      ...prev,
      ...proseMirrorPlugins(ctx)
    ]);

    return () => {
    };
  }
];

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
export const proseMirrorPlugins = ctx => [
  createCodeBlockStatePlugin(ctx)
];

/**
 * 
 * @param {import('@milkdown/utils').$NodeSchema<string>} schema 
 */
function milkdownPluginFromSchema(schema) {
  return /** @type {import('@milkdown/ctx').MilkdownPlugin} */(/** @type {{}} */(schema));
}
