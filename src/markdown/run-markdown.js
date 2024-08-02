// @ts-check

import { defaultValueCtx, Editor, rootCtx } from '@milkdown/core';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { trailing } from '@milkdown/plugin-trailing';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';

import { nord } from '@milkdown/theme-nord';
import { updateLocationTo } from '../editor/init-code-mirror';

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
        console.log('Updatin URL...');
        updateLocationTo(markdownText, 'format');
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