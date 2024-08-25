// @ts-check

import { config, defaultValueCtx, Editor, editorCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { math } from '@milkdown/plugin-math';
import { trailing } from '@milkdown/plugin-trailing';
import { commonmark } from '@milkdown/preset-commonmark';

import { gfm } from '@milkdown/preset-gfm';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';

// import { nord } from '@milkdown/theme-nord';

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import './katex-part.css';

import { updateLocationTo } from '..';
import { queryDOMForUnicodeModifierButtons } from '../format-actions/query-dom-for-unicode-modifier-buttons';
import { adjustTypingTransaction } from './adjust-typing-transaction';
import { applyUnicodeModifiers } from './apply-unicode-modifiers';
import { updateUnicodeButtons } from './update-unicode-buttons';

const defaultText = '🆃𝘆𝗽𝗲  ৳໐  🆈𝒐𝓾𝓻𝓼𝒆𝓵𝓯';

/**
 * @param {HTMLElement} host
 * @param {string} [markdownText]
 */
export async function runMarkdown(host, markdownText) {

  const crepe = new Crepe({
    root: host,
    defaultValue: markdownText || defaultText,
    features: {
      'code-mirror': true,
      "list-item": true,
      "link-tooltip": false,
      cursor: true,
      "image-block": true,
      toolbar: false,
      // table: true,
      "block-edit": false,
      placeholder: false,
    },
    featureConfigs: {
      "code-mirror": {
      },
      toolbar: {
      }
    }
  });

  const editor = crepe.editor
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(indent)
    .use(trailing)
    .use(math)
    .use(listener)
    .config(ctx => {
      ctx.set(rootCtx, host);
      ctx.set(defaultValueCtx, markdownText || defaultText);
      ctx.get(listenerCtx).markdownUpdated((ctx, markdownText, prevMarkdown) => {
        updateLocationTo(markdownText, 'text');
      });
      wireUpButtons(ctx);
      ctx.update(prosePluginsCtx, plugins => {
        const pluginKey = new PluginKey('UNICODE_CONVERSIONS');
        const pluginCarryUnicodeConversions = new Plugin({
          key: pluginKey,
          appendTransaction: (transactions, oldState, newState) => {
            updateButtonsDebounced(ctx);
            return adjustTypingTransaction(transactions, oldState, newState);
          },
          state: {
            init: (editorStateConfig, editorInstance) => {
              console.log('UNICODE_CONVERSIONS init', { editorStateConfig, editorInstance });
            },
            apply: (tr, value, oldState, newState) => {
            },
          }
        });

        return [...plugins, pluginCarryUnicodeConversions];
      });
    });

  const crepeEditor = await crepe.create();

  console.log('editor ', editor);
  // editor.onStatusChange((change) => {
  //   clearTimeout(updateDebounceTimeout);
  //   updateDebounceTimeout = setTimeout(() => {
  //     console.log({ change });
  //   }, 200);
  // });

  var updateDebounceTimeout = 0;
  function updateButtonsDebounced(ctx) {
    clearTimeout(updateDebounceTimeout);
    updateDebounceTimeout = /** @type {*} */(setTimeout(() => {
      updateUnicodeButtons(ctx);
    }, 200));
  }

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   */
  function wireUpButtons(ctx) {
    const buttons = queryDOMForUnicodeModifierButtons();
    for (const btn of buttons) {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();

        const editorState = ctx.get(editorStateCtx);

        const apply = applyUnicodeModifiers(editorState, btn.id);

        if (apply) {
          const editorView = ctx.get(editorViewCtx);
          editorView.dispatch(apply);

          updateUnicodeButtons(ctx);
        }

      });
    }
  }
}