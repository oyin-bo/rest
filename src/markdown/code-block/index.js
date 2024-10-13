// @ts-check

import { prosePluginsCtx } from '@milkdown/core';
import { InputRule, textblockTypeInputRule, wrappingInputRule } from '@milkdown/prose/inputrules';
import { TextSelection } from '@milkdown/prose/state';
import { $command, $ctx, $inputRule, $nodeAttr, $nodeSchema, $useKeymap, $view } from '@milkdown/utils';

import { backtickAutoconvertInputRule } from './backtick-autoconvert-input-rule';
import { codeBlockBackTickLanguage, codeBlockExecutionState, codeBlockScript, customCodeBlockSchema } from './schema';
import { codeBlockRuntimePlugin } from './state';

import './code-block.css';
import './syntax-highlight.css';
import { typescriptLanguagePlugin } from './state-javascript/plugin-lang';
import { codeBlockRegionsPlugin } from './state-block-regions';
import { typescriptHighlightPlugin } from './state-javascript/plugin-highlights';
import { tooltipServicePlugin } from './state/plugin-tooltip-service';
import { typescriptTooltipsPlugin } from './state-javascript/plugin-tooltips';
import { completionServicePlugin } from './state/plugin-completion-service';
import { typescriptCompletionsPlugin } from './state-javascript/plugin-completions';
import { typescriptFormattingServicePlugin } from './state-javascript/plugin-auto-formatting';
import { codeHighlightPlugin } from './state/plugin-highlight-service';
import { httpHighlightPlugin } from './state-http/plugin-highlights';
import { javascriptRuntimePlugin } from './state-javascript/plugin-runtime';

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
      ...proseMirrorPlugins
    ]);

    return () => {
    };
  }
];

export const proseMirrorPlugins = [
  codeBlockRegionsPlugin,
  typescriptLanguagePlugin,

  codeHighlightPlugin,
  tooltipServicePlugin,
  typescriptTooltipsPlugin,
  completionServicePlugin,

  typescriptHighlightPlugin,
  typescriptCompletionsPlugin,
  typescriptFormattingServicePlugin,

  httpHighlightPlugin,

  codeBlockRuntimePlugin,
  javascriptRuntimePlugin
];

/**
 * 
 * @param {import('@milkdown/utils').$NodeSchema<string>} schema 
 */
function milkdownPluginFromSchema(schema) {
  return /** @type {import('@milkdown/ctx').MilkdownPlugin} */(/** @type {{}} */(schema));
}
