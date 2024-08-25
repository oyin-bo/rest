// @ts-check

import { config, defaultValueCtx, Editor, editorCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { trailing } from '@milkdown/plugin-trailing';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Fragment, Slice } from '@milkdown/prose/model';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';

// import { nord } from '@milkdown/theme-nord';

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

import { updateLocationTo } from '..';
import { queryDOMForUnicodeModifierButtons } from '../format-actions/query-dom-for-unicode-modifier-buttons';
import { applyModifier } from '../unicode-styles/apply-modifier';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { getSelectionModifiersForDocument } from './get-selection-modifiers';

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
            /** @type {undefined | { oldStart: number, oldEnd: number, newStart: number, newEnd: number }} */
            let single;
            let multiple;
            for (const tr of transactions) {
              if (!tr.docChanged) continue;
              if (tr.getMeta('history$')) continue;

              if (tr.steps.length !== 1) continue;
              const step = tr.steps[0];
              const stepMap = step.getMap();

              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                if (multiple) return;
                if (single) {
                  single = undefined;
                  multiple = true;
                } else {
                  single = { oldStart, oldEnd, newStart, newEnd };
                }
              });
              if (multiple) break;

              if (single?.newStart === single?.newEnd) {
                single = undefined;
              }
            }

            if (!single) return null;

            const textOld = oldState.doc.textContent;
            const oldParsed = getModifiersTextSection(
              textOld,
              single.oldStart - 1,
              single.oldEnd - 1);
            const oldFullModifiers = oldParsed?.parsed?.fullModifiers;

            const textNew = newState.doc.textContent;
            const newParsed = getModifiersTextSection(
              textNew,
              single.newStart - 1,
              single.newEnd - 1
            );

            if (newParsed?.text && !newParsed?.parsed?.fullModifiers && oldFullModifiers) {
              const autoFormatText = applyModifier(newParsed.text, oldFullModifiers);
              if (autoFormatText === newParsed.text) return null;

              console.log(
                'typing inside formatted area, should auto-format  ',
                newParsed.text.trim() !== newParsed.text ? newParsed.text : JSON.stringify(newParsed.text),
                ' to ',
                autoFormatText.trim() !== autoFormatText ? autoFormatText : JSON.stringify(autoFormatText),
                [single.newStart, single.newEnd]
              );

              const applyNextTransaction = newState.tr.replaceRangeWith(
                single.newStart,
                single.newEnd,
                newState.schema.text(autoFormatText));

              // return applyNextTransaction;
            }

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
      updateButtons(ctx);
    }, 200));
  }

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   */
  function updateButtons(ctx) {
    const editorState = ctx.get(editorStateCtx);

    const selMods = getSelectionModifiersForDocument(editorState);
    console.log('selection modifiers ', selMods);

    const modifiers = selMods.modifiers;

    const buttons = queryDOMForUnicodeModifierButtons();

    const btnPressedClassNameRegexp = /\s*\bpressed\b\s*/g;

    for (const btn of buttons) {
      if (btn.id) {
        var pressed = modifiers && modifiers.indexOf(btn.id) >= 0;

        if (pressed && !(btnPressedClassNameRegexp.test(btn.className || ''))) btn.className = (btn.className || '').trim() + ' pressed';
        else if (btnPressedClassNameRegexp.test(btn.className || '')) btn.className = btn.className.replace(btnPressedClassNameRegexp, ' ');
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
        const selMods = getSelectionModifiersForDocument(editorState);

        let changeTransaction = editorState.tr;
        let anyChange = false;

        const removeModifier = selMods.modifiers.indexOf(btn.id) >= 0;

        // TODO: expand selection if whole word is modified
        let selectionIncrease = 0;

        for (const span of selMods.spans) {
          if (!span.parsed?.modifiers) continue;

          const textToUpdate =
            (!span.lead || !span.affectLead ? '' : span.lead.slice(-span.affectLead)) +
            span.text +
            (!span.trail || !span.affectTrail ? '' : span.trail.slice(0, span.affectTrail));

          const updatedText = applyModifier(
            textToUpdate,
            btn.id,
          removeModifier);

          if (updatedText === textToUpdate) continue;

          const wholeUpdatedText =
            (!span.lead ? '' : span.lead.slice(0, span.lead.length - (span.affectLead || 0))) +
            updatedText +
            (!span.trail ? '' : span.trail.slice(span.affectTrail || 0));
          selectionIncrease += updatedText.length - textToUpdate.length;

          changeTransaction = changeTransaction.replace(
            span.nodePos,
            span.nodePos + span.node.nodeSize,
            new Slice(
              Fragment.from(editorState.schema.text(wholeUpdatedText)),
              0,
              0));
          anyChange = true;
        }

        if (anyChange) {
          const placeSelectionStart = editorState.selection.from;
          const placeSelectionEnd = editorState.selection.to +
            (editorState.selection.to === editorState.selection.from ? 0 : selectionIncrease);


          const editorView = ctx.get(editorViewCtx);
          editorView.dispatch(changeTransaction);
          editorView.dispatch(editorView.state.tr.setSelection(
            TextSelection.create(editorView.state.doc, placeSelectionStart, placeSelectionEnd)
          ));
        }

      });
    }
  }
}