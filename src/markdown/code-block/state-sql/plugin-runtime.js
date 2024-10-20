// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { registerJSRuntimePreprocessor } from '../state-javascript/plugin-runtime';

const key = new PluginKey('SQL_RUNTIME');
export const sqlRuntimePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      registerJSRuntimePreprocessor(
        editorState,
        ({ codeBlockRegions, editorState }) => {
          return codeBlockRegions.map((block, iBlock) => {
            const fileName = sqlBlockFilename(iBlock, block.language, block.langSpecified);
            if (fileName) return {
              fileName,
              text:
                'import alasql from "alasql"; ' +
                'alasql(' +
                JSON.stringify(block.code) + ', ' +
                '[' + [...Array(iBlock)].map((_, i) => '$' + i).join(', ') + ']' +
                ');'
            };
          })
        });
    },
    apply: (tr, pluginState, oldState, newState) => pluginState
  },
});

/**
 * @param {number} iBlock
 * @param {string | null | undefined} language
 * @param {string | null | undefined} langSpecified
 */
function sqlBlockFilename(iBlock, language, langSpecified) {
  if (language === 'SQL') return 'sql-' + iBlock + '.sql.js';
}
