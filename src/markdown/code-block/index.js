// @ts-check

import { prosePluginsCtx } from '@milkdown/core';
import { InputRule, textblockTypeInputRule, wrappingInputRule } from '@milkdown/prose/inputrules';
import { TextSelection } from '@milkdown/prose/state';
import { $command, $ctx, $inputRule, $nodeAttr, $nodeSchema, $useKeymap, $view } from '@milkdown/utils';

import { backtickAutoconvertInputRule } from './backtick-autoconvert-input-rule';
import { codeBlockBackTickLanguage, codeBlockExecutionState, codeBlockScript, customCodeBlockSchema } from './schema';
import { createCodeBlockStatePlugin } from './state';

import './code-block.css';
import './syntax-highlight.css';
import { typescriptLanguagePlugin } from './state-javascript/plugin-lang';
import { codeBlockRegionsPlugin } from './state-block-regions';
import { typescriptDecorationsPlugin } from './state-javascript/plugin-decorations';
import { tooltipServicePlugin } from './state/plugin-tooltip-service';
import { typescriptTooltipsPlugin } from './state-javascript/plugin-tooltips';

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
  createCodeBlockStatePlugin(ctx),
  codeBlockRegionsPlugin,
  typescriptLanguagePlugin,
  typescriptDecorationsPlugin,
  tooltipServicePlugin,
  typescriptTooltipsPlugin
];

/**
 * 
 * @param {import('@milkdown/utils').$NodeSchema<string>} schema 
 */
function milkdownPluginFromSchema(schema) {
  return /** @type {import('@milkdown/ctx').MilkdownPlugin} */(/** @type {{}} */(schema));
}
