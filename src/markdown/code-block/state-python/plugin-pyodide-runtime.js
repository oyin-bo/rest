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
`
                (window.__pyodide || (window.__pyodide=
                  await import("https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.mjs")
                    .then( ({loadPyodide}) => loadPyodide() )
                    .then(async __pyodide => {
                      // load required pyodide packages
                      console.log('INIT PYODIDE');
                      await __pyodide.loadPackage(['micropip']);
                      const __getImports = await __pyodide.runPythonAsync(
                        ${'`'}
import pyodide

async def get_imports(code_to_run):
    import ast
    import sys
    builtin_modules = set(sys.builtin_module_names)
    builtin_modules.add("js")
    builtin_modules.add("pyodide")
    builtin_modules.add("micropip")
    builtin_modules.add("re")
    packages_to_install = set()
    tree = ast.parse(code_to_run)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                package_name = alias.name.split('.')[0]
                if package_name not in builtin_modules:
                    packages_to_install.add(package_name)
    return list(packages_to_install)

get_imports
                        ${'`'}
                      );
                      console.log('__getImports ', __getImports);
                      const __autoInstallAndRun = async code => {
                        const pkgs = await __getImports(code);
                        for (const p of pkgs) {
                          try {
                            console.log('PYODIDE AUTO ', p, await __pyodide.runPythonAsync(
                              'import micropip;${'\\'}n' +
                              'await micropip.install(' + JSON.stringify(p) + ')${'\\'}n' +
                              'import ' + p + '${'\\'}n'
                            ));
                          } catch (autoInstallError) {
                            console.error('PYODIDE AUTO ', p, autoInstallError);
                          }
                        }

                        return __pyodide.runPythonAsync(code);
                      };
                      __pyodide.__autoInstallAndRun = __autoInstallAndRun;
                      return __pyodide;
                    })
                )).__autoInstallAndRun(
                  (function() {
                    // exposing JS global variables to Pyodide Python
                    let vars = [];
                    let dollarNumberVars = [];
                    const pythonVarRegex = /^[_a-zA-Z][a-zA-Z0-9_]*$/i;
                    const dollarNumberVarRegex = /^\$[0-9]+$/;
                    for (const k in this) {
                      if (k.startsWith("__") || this.__knownGlobals?.indexOf(k) >= 0) continue;
                      if (this.hasOwnProperty(k) && pythonVarRegex.test(k)) {
                        vars.push(k);
                      } else if (this.hasOwnProperty(k) && dollarNumberVarRegex.test(k)) {
                        dollarNumberVars.push(k);
                      }
                    }
                    return (
                      'import js;${'\\'}n' +
                      [
                        ...vars,
                        ...dollarNumberVars.map(dn => dn.replace('$', '_'))
                      ].join(',') +
                      ' = ' +
                      [
                        ...vars.map(v => 'js.' + v),
                        ...dollarNumberVars.map(dn => 'getattr(js, ' + JSON.stringify(dn) + ')')
                      ].join(',') +
                      ';${'\\'}n'
                    );
                  })() +

                  ${JSON.stringify(block.code)}
              );`
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
