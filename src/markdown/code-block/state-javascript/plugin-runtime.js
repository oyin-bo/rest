// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { registerRuntime } from '../state/runtime/plugin-runtime-service';
import { execIsolation } from './exec-isolation';
import { getTypeScriptCodeBlocks } from './plugin-lang';

class JSRuntime {

  constructor() {
    this.onLog = (...args) => { };

    /** @type {ReturnType<typeof execIsolation> | undefined} */
    this.isolation = undefined;
  }

  /**
   * @param {{ code: string, language: string | null | undefined }[]} codeBlockRegions
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  parse(codeBlockRegions, editorState) {
    this.codeBlockRegions = codeBlockRegions;
    this.editorState = editorState;

    const tsData = getTypeScriptCodeBlocks(editorState);
    const { languageService, ts } = tsData.lang || {};

    const prog = languageService?.getProgram();
    this.parsedCodeBlockInfo = prog && tsData.tsBlocks.map(tsBlock => {
      if (!tsBlock || !languageService || !ts) return;

      const ast = prog.getSourceFile(tsBlock.fileName);
      if (!ast) return {};

      // TODO: change to use rewrites
      const rewrites = [];
      const importSources = [];
      const declarations = [];

      for (const st of ast.statements) {
        // pull import source for rewrite (unpkg)
        if (ts.isImportDeclaration(st)) {
          if (ts.isStringLiteralLike(st.moduleSpecifier)) {
            const unpkgSource = 'https://esm.run/' + st.moduleSpecifier.text;

            importSources.push({
              from: st.moduleSpecifier.pos,
              to: st.moduleSpecifier.end,
              source: st.moduleSpecifier.text,
              statementEnd: st.end
            });

            // pull imported names for exports
            if (st.importClause?.name) {
              declarations.push({
                from: st.importClause.name.pos,
                to: st.importClause.name.end,
                name: st.importClause.name.text,
                statementEnd: st.end
              });
            }

            if (st.importClause?.namedBindings) {
              if (ts.isNamedImports(st.importClause.namedBindings)) {
                for (const imp of st.importClause.namedBindings.elements) {
                  declarations.push({
                    from: imp.name.pos,
                    to: imp.name.end,
                    name: imp.name.text,
                    statementEnd: st.end
                  });
                }
              }

              if (ts.isNamespaceImport(st.importClause.namedBindings)) {
                declarations.push({
                  from: st.importClause.namedBindings.name.pos,
                  to: st.importClause.namedBindings.name.end,
                  name: st.importClause.namedBindings.name.text,
                  statementEnd: st.end
                });
              }
            }
          }

        } else if (ts.isVariableStatement(st)) {
          // pull variable names for exports
          for (const decl of st.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              declarations.push({
                from: decl.name.pos,
                to: decl.name.end,
                name: decl.name.text,
                statementEnd: st.end
              });
            }
          }
        } else if (ts.isFunctionDeclaration(st)) {
          // pull function name for exports
          
          if (st.name) {
            declarations.push({
              from: st.name.pos,
              to: st.name.end,
              name: st.name.text,
              statementEnd: st.end
            });
          }
        }
      }
    });

    return codeBlockRegions.map(reg =>
      reg.language === 'JavaScript' ? { variables: undefined } : undefined);
  }

  /**
   * @param {number} iBlock
   * @param {any[]} globals
   */
  runCodeBlock(iBlock, globals) {
    if (!this.isolation)
      this.isolation = execIsolation();

    const block = this.codeBlockRegions?.[iBlock];
    if (block?.language !== 'JavaScript') return;

    const globalsMap = Object.fromEntries(globals.map((val, i) => ['$' + i, val]));

    return this.isolation.execScriptIsolated(block.code, globalsMap);
  }

}

const key = new PluginKey('JAVASCRIPT_RUNTIME');
export const javascriptRuntimePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      registerRuntime(
        editorState,
        new JSRuntime());
    },
    apply: (tr, pluginState, oldState, newState) => undefined
  },
});
