// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
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

import { updateLocationTo } from '..';
import { queryDOMForUnicodeModifierButtons } from '../format-actions/query-dom-for-unicode-modifier-buttons';
import { adjustTypingTransaction } from './adjust-typing-transaction';
import { applyUnicodeModifiers } from './apply-unicode-modifiers';
import { updateUnicodeButtons } from './update-unicode-buttons';
import { restoreSelectionFromWindowName, storeSelectionToWindowName } from './window-name-selection';
import { updateFontSizeToContent } from '../font-size';

import './katex-part.css';
import './milkdown-neat.css';

const defaultText = '🆃𝘆𝗽𝗲  ৳໐  🆈𝒐𝓾𝓻𝓼𝒆𝓵𝓯';

/**
 * @param {HTMLElement} host
 * @param {string} [markdownText]
 */
export async function runMarkdown(host, markdownText) {

  let carryMarkdownText = typeof markdownText === 'string' ? markdownText : defaultText;

  const crepe = new Crepe({
    root: host,
    defaultValue: carryMarkdownText,
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
      ctx.set(defaultValueCtx, carryMarkdownText);
      ctx.get(listenerCtx).markdownUpdated((ctx, markdownText, prevMarkdown) => {
        carryMarkdownText = markdownText;
        updateLocationTo(markdownText, 'text');

        const editorView = ctx.get(editorViewCtx);
        storeSelectionToWindowName(editorView, markdownText);

        updateFontSizeToContent(host, host.innerText);
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

        setTimeout(() => {
          const editorView = ctx.get(editorViewCtx);

          wireRunCodeblock(editorView);
        }, 200);

        return [...plugins, pluginCarryUnicodeConversions];
      });

      setTimeout(() => {
        const editorView = ctx.get(editorViewCtx);
        restoreSelectionFromWindowName(editorView, carryMarkdownText);
        editorView.focus();
        updateUnicodeButtons(ctx);

        updateFontSizeToContent(host, host.innerText);
      }, 1);
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

      const editorView = ctx.get(editorViewCtx);
      storeSelectionToWindowName(editorView, carryMarkdownText);
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

  /** @type {HTMLIFrameElement & { runThis(code: string); }} */
  var ifr;

  /**
   * @param {import("prosemirror-view").EditorView} editorView
   */
  function wireRunCodeblock(editorView) {
    console.log('wire run code-block ', editorView, editorView.dom);
    editorView.dom.addEventListener('mousedown', async (e) => {

      const tools = /** @type {HTMLElement} */(e.target);
      if (tools?.className !== 'tools') {
        return;
      }

      const toolsBorders = tools.getBoundingClientRect();
      if (e.x < toolsBorders.right - toolsBorders.height * 2.3) return;

      const milkdownCodeBlock = /** @type {HTMLElement} */(tools.closest('milkdown-code-block'));
      if (!milkdownCodeBlock) return;

      const text = milkdownCodeBlock.pmViewDesc?.node?.textContent;
      if (!text) return;

      console.log('mouse down on tools ', tools, '\n\n', text);

      e.preventDefault();
      e.stopPropagation();

      if (!ifr) {
        ifr = /** @type {typeof ifr} */(document.createElement('iframe'));
        ifr.style.cssText =
          'position: absolute; left: -200px; top: -200px; width: 20px; height: 20px; pointer-events: none; opacity: 0.01;'
        
        ifr.src = 'about:blank';

        document.body.appendChild(ifr);

        await new Promise(resolve => setTimeout(resolve, 10));

        ifr.contentDocument?.write(
          '<script>window.runThis = function(code) { return eval(code) }</script>'
        );

        ifr.runThis = /** @type {*} */(ifr.contentWindow).runThis;
        delete /** @type {*} */(ifr.contentWindow).runThis;
      }

      try {
        const result = await ifr.runThis(text);
        alert(result);

      } catch (err) {
        alert('ERROR ' + err);
      }
    });
  }
}
