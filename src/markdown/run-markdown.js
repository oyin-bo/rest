// @ts-check

import { defaultValueCtx, Editor, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { trailing } from '@milkdown/plugin-trailing';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Plugin, PluginKey, Transaction } from '@milkdown/prose/state';
import { nord } from '@milkdown/theme-nord';

import { updateLocationTo } from '..';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { applyModifier } from '../unicode-styles/apply-modifier';

/**
 * @param {HTMLElement} host
 * @param {string} [markdownText]
 */
export async function runMarkdown(host, markdownText) {

  var updateDebounceTimeout;
  const editor = await Editor
    .make()
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
              console.log(
                'typing inside formatted area, should auto-format  ',
                newParsed.text,
                ' to ',
                applyModifier(newParsed.text, oldFullModifiers),
                [single.newStart, single.newEnd]
              );

              const applyNextTransaction = newState.tr.replaceRangeWith(
                single.newStart,
                single.newEnd,
                newState.schema.text(applyModifier(newParsed.text, oldFullModifiers)));
              
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
    })
    .config(nord)
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(indent)
    .use(trailing)
    .use(listener)
    .create();
  console.log('editor ', editor);
  editor.onStatusChange((change) => {
    clearTimeout(updateDebounceTimeout);
    updateDebounceTimeout = setTimeout(() => {
      console.log({ change });
    }, 200);
  });
}