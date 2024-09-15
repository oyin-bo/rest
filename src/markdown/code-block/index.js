// @ts-check

import { codeBlockConfig, codeBlockView } from './code-block-view';
import { codeBlockResultSchema, codeBlockSchema } from './schema';

export const codeBlockPlugins = [
  // TODO: check with Milkdown why this is needed
  /** @type {import('@milkdown/ctx').MilkdownPlugin} */(/** @type {{}} */(codeBlockSchema)),
  /** @type {import('@milkdown/ctx').MilkdownPlugin} */(/** @type {{}} */(codeBlockResultSchema)),
  codeBlockView,
  codeBlockConfig
];

