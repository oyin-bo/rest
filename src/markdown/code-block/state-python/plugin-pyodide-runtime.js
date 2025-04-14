// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { registerJSRuntimePreprocessor } from '../state-javascript/plugin-runtime';

const key = new PluginKey('PYTHON_RUNTIME');
export const pythonRuntimePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      registerJSRuntimePreprocessor(
        editorState,
        ({ codeBlockRegions, editorState }) => {
          return codeBlockRegions.map((block, iBlock) => {
            const fileName = pythonBlockFilename(iBlock, block.language, block.langSpecified);
            if (fileName) return {
              fileName,
              text:
                '(window.__pyodide || (window.__pyodide=' +
                  'await import("https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js").then( () => loadPyodide() )' + 
                ')).runPython(' +
                '(' + (function() {
                  let vars = [];
                  let dollarNumberVars = [];
                  const pythonVarRegex = /^[_a-zA-Z][a-zA-Z0-9_]*$/i;
                  const dollarNumberVarRegex = /^\$[0-9]+$/;
                  for (const k in this) {
                    if (this.hasOwnProperty(k) && pythonVarRegex.test(k)) {
                      vars.push(k);
                    } else if (this.hasOwnProperty(k) && dollarNumberVarRegex.test(k)) {
                      dollarNumberVars.push(k);
                    }
                  }
                  return (
                    'import js;\n' +
                    [
                      ...vars,
                      ...dollarNumberVars.map(dn => dn.replace('$', '_'))
                    ].join(',') +
                    ' = ' +
                    [
                      ...vars.map(v => 'js.' + v),
                      ...dollarNumberVars.map(dn => 'getattr(js, ' + JSON.stringify(dn) + ')')
                    ].join(',') +
                    ';\n'
                  );
                }) + ')() + ' +
                JSON.stringify(block.code) +
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
function pythonBlockFilename(iBlock, language, langSpecified) {
  if (language === 'Python') return 'python-' + iBlock + '.py.js';
}
