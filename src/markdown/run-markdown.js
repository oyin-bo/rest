// @ts-check

import { defaultValueCtx, Editor, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { nord } from '@milkdown/theme-nord';

import '@milkdown/theme-nord/style.css';

export function runMarkdown(host, markdownText) {

  console.log('creating editor...');
  const editor = Editor
    .make()
    .config(ctx => {
      ctx.set(rootCtx, host)
      ctx.set(defaultValueCtx, markdownText)
    })
    .config(nord)
    .use(commonmark)
    .create();
    console.log('editor ', editor);
}