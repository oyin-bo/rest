// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
// import { Crepe } from '@milkdown/crepe';
import { commandsCtx, Editor, editorCtx } from '@milkdown/kit/core';
import { commonmark, toggleEmphasisCommand, toggleStrongCommand, codeBlockAttr, codeBlockSchema, createCodeBlockInputRule } from '@milkdown/kit/preset/commonmark';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { math } from '@milkdown/plugin-math';
import { trailing } from '@milkdown/plugin-trailing';
// import { commonmark } from '@milkdown/preset-commonmark';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { gfm } from '@milkdown/preset-gfm';

// import { nord } from '@milkdown/theme-nord';

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

import { updateLocationTo } from '..';
import { updateFontSizeToContent } from '../font-size';
import { codeBlockPlugins } from './code-block';
import { createCarryFormattingPlugin as createCarryUnicodeFormatProsemirrorPlugin } from './unicode-formatting/carry-formatting-plugin';
import { createKeymapPlugin as createUnicodeFormatterKeymapProsemirrorPlugin } from './unicode-formatting/keymap-plugin';
import { updateMarkdownButtons, wireUpMarkdownButtons } from './update-markdown-buttons';
import { updateUnicodeButtons, wireUpButtons } from './update-unicode-buttons';
import { restoreSelectionFromWindowName, storeSelectionToWindowName } from './window-name-selection';

import { createResultEditingTransactionResult } from './code-block/result-editing-transaction-filter';
import './katex-part.css';
import './milkdown-neat.css';

const defaultText = '🆃𝘆𝗽𝗲  ৳໐  🆈𝒐𝓾𝓻𝓼𝒆𝓵𝓯';

/**
 * @param {HTMLElement} host
 * @param {string} [markdownText]
 */
export async function runMarkdown(host, markdownText) {

  const excludeCodeBlockPlugins = [
    codeBlockAttr,
    codeBlockSchema,
    createCodeBlockInputRule,
    createResultEditingTransactionResult,
  ]

  const commonmarkSansCodeBlock = commonmark.filter(plugin => {
    return !excludeCodeBlockPlugins.includes(plugin);
  });

  let carryMarkdownText = typeof markdownText === 'string' ? markdownText : defaultText;

  let updateButtons = () => { };

  const editor = Editor.make()
    .use(commonmarkSansCodeBlock)
    .use(gfm)
    .use(history)
    .use(indent)
    .use(trailing)
    .use(math)
    .use(clipboard)
    .use(codeBlockPlugins)
    .use(listener)
    .config(ctx => {
      ctx.set(rootCtx, host);
      ctx.set(defaultValueCtx, carryMarkdownText);
      ctx.get(listenerCtx).markdownUpdated(handleMarkdownUpdate);
      wireUpButtons(ctx);
      wireUpMarkdownButtons(ctx);
      ctx.update(prosePluginsCtx, plugins => {
        updateLocationTo(carryMarkdownText, 'text');

        updateButtons = createButtonUpdaterDebounced(ctx, () => carryMarkdownText);

        return [
          ...plugins,
          createCarryUnicodeFormatProsemirrorPlugin(updateButtons),
          createUnicodeFormatterKeymapProsemirrorPlugin(updateButtons),
        ];
      });

      setTimeout(() => {
        const editorView = ctx.get(editorViewCtx);
        restoreSelectionFromWindowName(editorView, carryMarkdownText);
        editorView.focus();
        updateUnicodeButtons(ctx);

        updateFontSizeToContent(host, host.innerText);
      }, 1);
    });

  const editorCreated = await editor.create();

  console.log('editor ', editor, ' created ', editorCreated);

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   * @param {string} markdownText
   * @param {string} prevMarkdown
   */
  function handleMarkdownUpdate(ctx, markdownText, prevMarkdown) {
    carryMarkdownText = markdownText;
    updateLocationTo(markdownText, 'text');

    const editorView = ctx.get(editorViewCtx);
    storeSelectionToWindowName(editorView, markdownText);

    updateFontSizeToContent(host, host.innerText);
  }

}

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 * @param {() => string} getCurrentMarkdownText
 */
function createButtonUpdaterDebounced(ctx, getCurrentMarkdownText) {

  var updateDebounceTimeout = 0;

  return updateButtonsDebounced;

  function updateButtonsDebounced() {
    clearTimeout(updateDebounceTimeout);
    updateDebounceTimeout = /** @type {*} */(setTimeout(() => {
      updateUnicodeButtons(ctx);
      updateMarkdownButtons(ctx);

      const editorView = ctx.get(editorViewCtx);
      storeSelectionToWindowName(editorView, getCurrentMarkdownText());
    }, 200));
  }
}
