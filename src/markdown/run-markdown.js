// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
// import { Crepe } from '@milkdown/crepe';
import { commandsCtx, Editor } from '@milkdown/kit/core';
import { commonmark, toggleEmphasisCommand, toggleStrongCommand } from '@milkdown/kit/preset/commonmark';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { math } from '@milkdown/plugin-math';
import { trailing } from '@milkdown/plugin-trailing';
// import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';

import { keymap as proseMirrorKeymap } from 'prosemirror-keymap';

import { EditorState as CodeMirrorEditorState, StateEffect as CodeMirrorStateEffect } from '@codemirror/state';
import { EditorView as CodeMirrorEditorView, showPanel as codeMirrorShowPanel } from '@codemirror/view';

// import { nord } from '@milkdown/theme-nord';

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

import { updateLocationTo } from '..';
import { updateFontSizeToContent } from '../font-size';
import { queryDOMForUnicodeModifierButtons } from '../format-actions/query-dom-for-unicode-modifier-buttons';
import { adjustTypingTransaction } from './adjust-typing-transaction';
import { applyUnicodeModifiers } from './apply-unicode-modifiers';
import { codeBlockConfig, codeBlockView } from './code-block';
import { updateUnicodeButtons } from './update-unicode-buttons';
import { restoreSelectionFromWindowName, storeSelectionToWindowName } from './window-name-selection';

import { codeBlockResultSchema, codeBlockSchema } from './code-block/schema';
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

  const editor = Editor.make()
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(indent)
    .use(trailing)
    .use(math)
    .use(codeBlockConfig)
    .use(codeBlockView)
    .use(codeBlockSchema)
    .use(codeBlockResultSchema)
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
      wireUpMarkdownButtons(ctx);
      ctx.update(prosePluginsCtx, plugins => {
        updateLocationTo(carryMarkdownText, 'text');

        const pluginKey = new PluginKey('UNICODE_CONVERSIONS');
        const pluginCarryUnicodeConversions = new Plugin({
          key: pluginKey,
          appendTransaction: (transactions, oldState, newState) => {
            updateButtonsDebounced(ctx);
            return adjustTypingTransaction(transactions, oldState, newState);
          },
          filterTransaction: (tr, state) => {
            // let the code result changes flow normally
            if (tr.getMeta('setLargeResultAreaText')) return true;

            let codeBlockResults = [];
            state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
              if (node.type.name === 'code_block_result') {
                codeBlockResults.push({ pos, nodeSize: node.nodeSize });
              }
            });

            for (const step of tr.steps) {
              const replaceStep = /** @type {import('prosemirror-transform').ReplaceStep} */(step);
              if (replaceStep.from >= 0 && replaceStep.to >= 0) {
                for (const resultSpan of codeBlockResults) {
                  const resultSpanAffected =
                    replaceStep.from < resultSpan.pos + resultSpan.nodeSize &&
                    replaceStep.to > resultSpan.pos;
                  if (resultSpanAffected) {
                    return false;
                  }
                }
              }
            }

            console.log('passed transaction ', tr, codeBlockResults);

            return true;
          },
          state: {
            init: (editorStateConfig, editorInstance) => {
              console.log('UNICODE_CONVERSIONS init', { editorStateConfig, editorInstance });
            },
            apply: (tr, value, oldState, newState) => {
            },
          }
        });

        /**
         * @param {string} mod
         */
        const createModHandler = (mod) => {

          return modHandler;

          /**
           * @param {import("prosemirror-state").EditorState} editorState
           * @param {((tr: import("prosemirror-state").Transaction) => void) | undefined} dispatch
           * @param {import("prosemirror-view").EditorView | undefined} view
           */
          function modHandler(editorState, dispatch, view) {
            //const editorState = ctx.get(editorStateCtx);
            const apply = applyUnicodeModifiers(editorState, mod);

            if (apply) {
              dispatch?.(apply);

              updateUnicodeButtons(ctx);
              return true;
            }

            return false;
          }
        };

        const unicodeFormatKeymap = proseMirrorKeymap({
          'Mod-Alt-b': createModHandler('bold'),
          'Mod-Shift-b': createModHandler('bold'),
          'Mod-Alt-Shift-b': createModHandler('bold'),

          'Mod-Alt-i': createModHandler('italic'),
          'Mod-Shift-i': createModHandler('italic'),
          'Mod-Alt-Shift-i': createModHandler('italic'),

          'Mod-Alt-j': createModHandler('joy'),
          'Mod-Shift-j': createModHandler('joy'),
          'Mod-Alt-Shift-j': createModHandler('joy'),

          'Mod-Alt-t': createModHandler('typewriter'),
          'Mod-Shift-t': createModHandler('typewriter'),
          'Mod-Alt-Shift-t': createModHandler('typewriter'),
        });

        const combinedPlugins = [
          ...plugins,
          pluginCarryUnicodeConversions,
          unicodeFormatKeymap
        ];
        console.log({ combinedPlugins });
        return combinedPlugins;
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
  // editor.onStatusChange((change) => {
  //   clearTimeout(updateDebounceTimeout);
  //   updateDebounceTimeout = setTimeout(() => {
  //     console.log({ change });
  //   }, 200);
  // });

  var updateDebounceTimeout = 0;

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   */
  function updateButtonsDebounced(ctx) {
    clearTimeout(updateDebounceTimeout);
    updateDebounceTimeout = /** @type {*} */(setTimeout(() => {
      updateUnicodeButtons(ctx);
      updateMarkdownButtons(ctx);

      const editorView = ctx.get(editorViewCtx);
      storeSelectionToWindowName(editorView, carryMarkdownText);
    }, 200));
  }

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   */
  function updateMarkdownButtons(ctx) {
    const view = ctx.get(editorViewCtx);
    let hasBold = view.state.doc.rangeHasMark(
      view.state.selection.from,
      view.state.selection.to,
      view.state.schema.marks.strong);
    let hasItalic = view.state.doc.rangeHasMark(
      view.state.selection.from,
      view.state.selection.to,
      view.state.schema.marks.emphasis);

    view.state.doc.nodesBetween(
      view.state.selection.from,
      view.state.selection.to,
      (node, pos) => {
        if (node.marks) {
          for (let m of node.marks) {
            if (m.type.name === 'strong') hasBold = true;
            if (m.type.name === 'emphasis') hasItalic = true;
          }
        }
      });

    const buttons = queryDOMForMarkdownButtons();
    for (const btn of buttons) {
      if (btn.id === 'bold') {
        if (hasBold) btn.classList.add('pressed');
        else btn.classList.remove('pressed');
      }
      if (btn.id === 'italic') {
        if (hasItalic) btn.classList.add('pressed');
        else btn.classList.remove('pressed');
      }
    }
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

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   */
  function wireUpMarkdownButtons(ctx) {
    const buttons = queryDOMForMarkdownButtons();
    const styles = {
      italic: toggleEmphasisCommand,
      bold: toggleStrongCommand
    };

    for (const btn of buttons) {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const cmd = styles[btn.id];
        if (!cmd) {
          const editorState = ctx.get(editorStateCtx);
          console.log('editorState ', editorState);
          console.log('doc.content ', editorState.doc.content);
          // alert('Style[' + btn.id + '] not wired in Markdown in this version.');
          return;
        }

        // const editorState = ctx.get(editorStateCtx);
        // const editorView = ctx.get(editorViewCtx);

        editor.action((ctx) => {
          const commandManager = ctx.get(commandsCtx);
          commandManager.call(cmd.key);
        });

      });
    }
  }

}

export function queryDOMForMarkdownButtons() {
  const buttonsArray = /** @type {NodeListOf<HTMLButtonElement>} */(
    document.querySelectorAll('#toolbar #markdown_tools button'));
  return Array.from(buttonsArray);
}
