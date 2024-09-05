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

import { EditorState as CodeMirrorEditorState, StateEffect as CodeMirrorStateEffect } from '@codemirror/state';
import { EditorView as CodeMirrorEditorView, showPanel as codeMirrorShowPanel } from '@codemirror/view';

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

const focusEffect = CodeMirrorStateEffect.define(undefined);

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
        extensions: [
          CodeMirrorEditorView.focusChangeEffect.of((state, focusing) => {
            console.log('focus change effect ', state, focusing);
            return focusEffect.of(null);
          }),
          codeMirrorShowPanel.of(
            /** @param {CodeMirrorEditorView} view */
            (view) => {
              let dom = document.createElement('div');
              dom.className = 'run-script-bar';
              const runButton = document.createElement('button');
              runButton.textContent = 'run ⏵';
              runButton.className = 'run-script-button';
              runButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const scriptText = view.state.doc.toString();
                execScript(scriptText);
              });
              dom.appendChild(runButton);

              const smallStatusLabel = document.createElement('span');
              smallStatusLabel.className = 'run-script-status';
              dom.appendChild(smallStatusLabel);

              const largeResultArea = document.createElement('div');
              largeResultArea.className = 'run-script-result';
              dom.appendChild(largeResultArea);

              var scriptExecution;

              return {
                dom,
                update(update) {
                  if (update.docChanged) {
                    resetScriptResult();
                  }
                }
              };

              /**
               * @param {string} scriptText
               */
              async function execScript(scriptText) {
                if (!scriptText) return;

                scriptExecution = {};
                runButton.disabled = true;
                runButton.textContent = 'running ...';
                smallStatusLabel.textContent = '';
                largeResultArea.textContent = '';
                const startRun = Date.now();

                try {
                  const result = await execScriptIsolated(scriptText);

                  try {
                    if (result === null)
                      largeResultArea.textContent = 'null';
                    else if (result === undefined)
                      largeResultArea.textContent = 'void';
                    else if (typeof result === 'object' || typeof result === 'string')
                      largeResultArea.textContent = JSON.stringify(result, null, 2);
                    else
                      largeResultArea.textContent = typeof result + ': ' + String(result);
                  } catch (jsonError) {
                    try {

                    } catch (error) {
                      largeResultArea.textContent = 'Result could not be displayed: ' + (error?.stack || error);
                    }
                  }

                  largeResultArea.className = 'run-script-result run-script-result-success';
                  runButton.disabled = false;
                  runButton.textContent = 'run ⏵';
                  smallStatusLabel.textContent = `completed in ${Date.now() - startRun} ms`;
                } catch (err) {
                  largeResultArea.textContent = err?.stack || err;

                  largeResultArea.className = 'run-script-result run-script-result-error';
                  runButton.disabled = false;
                  runButton.textContent = 'run ⏵';
                  smallStatusLabel.textContent = `failed in ${Date.now() - startRun} ms`;
                }

              }

              function resetScriptResult() {
              }
            })
        ]
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

  /** @param {string} scriptText */
  async function execScriptIsolated(scriptText) {
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

    return await ifr.runThis(scriptText)
  }

}

