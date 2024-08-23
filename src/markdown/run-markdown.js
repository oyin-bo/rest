// @ts-check

import { config, defaultValueCtx, Editor, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { trailing } from '@milkdown/plugin-trailing';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Plugin, PluginKey, Transaction } from '@milkdown/prose/state';
// import { nord } from '@milkdown/theme-nord';

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

import { updateLocationTo } from '..';
import { applyModifier } from '../unicode-styles/apply-modifier';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';

/**
 * @param {HTMLElement} host
 * @param {string} [markdownText]
 */
export async function runMarkdown(host, markdownText) {

  const crepe = new Crepe({
    root: host,
    defaultValue: markdownText || '# DEFAULT \n\n MARKDOWN\n\n ```\nok?\n```\n\n yes',
    features: {
      'code-mirror': true,
      "list-item": false,
      "link-tooltip": true,
      cursor: true,
      "image-block": true,
      // toolbar: true,
      // table: true,
      // "block-edit": true,
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
    ctx.set(defaultValueCtx, markdownText || '# DEFAULT \n\n MARKDOWN\n\n ```\nok?\n```\n\n yes');
    ctx.get(listenerCtx).markdownUpdated((ctx, markdownText, prevMarkdown) => {
      console.log('markdownUpdated: Updatin URL...', { ctx, markdownText, prevMarkdown });
      // TODO: update button states
      updateLocationTo(markdownText, 'text');
    });
    ctx.update(prosePluginsCtx, plugins => {
      const pluginKey = new PluginKey('UNICODE_CONVERSIONS');
      const pluginCarryUnicodeConversions = new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, oldState, newState) => {
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

            return applyNextTransaction;
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
}