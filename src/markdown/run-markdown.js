// @ts-check

import { defaultValueCtx, Editor, rootCtx } from '@milkdown/core';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { trailing } from '@milkdown/plugin-trailing';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';

import { nord } from '@milkdown/theme-nord';

/**
 * @param {HTMLElement} host
 * @param {string} [markdownText]
 */
export async function runMarkdown(host, markdownText) {

  console.log('creating editor...');
  const editor = await Editor
    .make()
    .config(ctx => {
      ctx.set(rootCtx, host)
      ctx.set(defaultValueCtx, markdownText || '# DEFAULT \n\n MARKDOWN\n\n ```\nok?\n```\n\n yes')
    })
    .config(nord)
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(indent)
    .use(trailing)
    .create();
    console.log('editor ', editor);
}