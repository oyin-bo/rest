// @ts-check
import { $ctx, $view } from '@milkdown/utils';
// import { codeBlockSchema } from '@milkdown/preset-commonmark';
export { codeBlockSchema } from './schema';

export { codeBlockView } from './code-block-view';

export const defaultConfig = {};

export const codeBlockConfig = $ctx(defaultConfig, 'codeBlockConfigCtx');


