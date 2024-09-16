// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { $ctx, $view } from '@milkdown/utils';
// import { codeBlockSchema } from '@milkdown/preset-commonmark';

import { ProseMirrorCodeBlock } from './prose-mirror-code-block';
import { codeBlockSchema } from './schema';

import './code-block.css';
import { createResultEditingTransactionResult } from './result-editing-transaction-filter';

export const codeBlockView = $view(
  codeBlockSchema.node,
  (ctx) => {
    ctx.update(prosePluginsCtx, (prev) => [
      ...prev,
      // codeBlockPlugins
      createResultEditingTransactionResult()
    ]);

    return (node, view, getPos) => new ProseMirrorCodeBlock(
      ctx,
      node,
      view,
      getPos,
    );
  });

