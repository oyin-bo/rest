// @ts-check

import { findCodeBlocks } from './find-code-blocks';
import { pluginDependency } from '../../plugin-dependency';

const { plugin, getValue } = pluginDependency({
  name: 'CODE_BLOCK_REGIONS',
  update: 'docChanged',
  /** @returns {import('./find-code-blocks').CodeBlockNodeset[]} */
  like: () => [],
  derive: ({ editorState }) => findCodeBlocks(editorState.doc),
});

export {
  plugin as codeBlockRegionsPlugin,
  getValue as getCodeBlockRegions
};
