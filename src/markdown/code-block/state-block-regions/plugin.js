// @ts-check

import { findCodeBlocks } from './find-code-blocks';
import { pluginDependency } from '../../plugin-dependency';

const { plugin, getValue } = pluginDependency({
  name: 'CODE_BLOCK_REGIONS',
  /** @type {import('../../plugin-dependency').DeriveDependency<import('./find-code-blocks').CodeBlockNodeset[]>} */
  derive: ({ editorState }) => findCodeBlocks(editorState.doc),
  update: 'docChanged'
});

export {
  plugin as codeBlockRegionsPlugin,
  getValue as getCodeBlockRegions
};
