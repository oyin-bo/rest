// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { loadTS } from '../../../typescript-services/load-ts';
import { registerRuntime } from '../state/runtime/plugin-runtime-service';
import { execIsolation } from './exec-isolation';
import { getTypeScriptCodeBlocks } from './plugin-lang';

const knownFromAttributes = {
  'unpkg': 'https://unpkg.com/',
  'skypack': 'https://cdn.skypack.dev/',
  'esm.run': 'https://esm.run/',
  'jsdelivr': 'https://cdn.jsdelivr.net/npm/'
};

class JSRuntime {

  /**
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  constructor(editorState) {
    this.editorState = editorState;
    this.onLog = (...args) => { };

    /** @type {ReturnType<typeof execIsolation> | undefined} */
    this.isolation = undefined;

    /** Will be assigned by the execution service */
    this.onInvalidate = () => { };
  }

  /**
   * @param {{ code: string, language: string | null | undefined }[]} codeBlockRegions
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  parse(codeBlockRegions, editorState) {
    this.codeBlockRegions = codeBlockRegions;
    this.editorState = editorState;

    this.parsedCodeBlockInfo = undefined;

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

    this.ensureParsedCodeBlockInfo();

    const block = this.codeBlockRegions?.[iBlock];
    const rewriteBlock = this.parsedCodeBlockInfo?.[iBlock];
    if (block?.language !== 'JavaScript' || !rewriteBlock) return;

    const globalsMap = Object.fromEntries(globals.map((val, i) => ['$' + i, val]));

    const code =
      rewriteBlock.rewritten || block.code;

    return this.isolation.execScriptIsolated(
      code,
      globalsMap);
  }

  ensureParsedCodeBlockInfo() {
    if (this.parsedCodeBlockInfo) return;

    const tsData = getTypeScriptCodeBlocks(this.editorState);
    const { languageService, ts } = tsData.lang || {};
    if (!languageService) {
      const tsTmp = loadTS();
      if (typeof tsTmp.then === 'function') {
        tsTmp.then(ts => {
          this.onInvalidate();
        });
      }
    }

    const prog = languageService?.getProgram();
    this.parsedCodeBlockInfo = prog && tsData.tsBlocks.map(tsBlock => {
      if (!tsBlock || !languageService || !ts) return;

      const ast = prog.getSourceFile(tsBlock.fileName);
      if (!ast) return {};

      // TODO: change to use rewrites
      const rewrites = [];

      for (let iStatement = 0; iStatement < ast.statements.length; iStatement++) {
        const st = ast.statements[iStatement];

        const isLastStatement = iStatement === ast.statements.length - 1;

        // pull import source for rewrite (unpkg)
        if (ts.isImportDeclaration(st)) {
          if (ts.isStringLiteralLike(st.moduleSpecifier)) {
            const unpkgSource =
              st.moduleSpecifier.text.startsWith('http:') || st.moduleSpecifier.text.startsWith('https:') ?
                st.moduleSpecifier.text :
                (st.attributes?.elements.map(withAttr =>
                  withAttr.name.text !== 'from' ? undefined :
                    !ts.isStringLiteralLike(withAttr.value) ? undefined :
                      withAttr.value.text.startsWith('http:') || withAttr.value.text.startsWith('https:') ?
                        withAttr.value.text :
                        knownFromAttributes[withAttr.value.text.toLowerCase()])[0]
                  ||
                  knownFromAttributes['esm.run']
                ) + st.moduleSpecifier.text;

            const isImportWithoutNames = !st.importClause?.namedBindings && !st.importClause?.name;
            if (isImportWithoutNames) {
              rewrites.push({
                from: st.pos,
                to: st.end,
                text:
                  (isLastStatement ? 'return ' : 'await ') +
                  `import(${JSON.stringify(unpkgSource)});`
              });
              continue;
            }

            const hasDefaultImport = !!st.importClause?.name;
            const hasNamedImports = st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings);
            const hasStarImport = st.importClause?.namedBindings && ts.isNamespaceImport(st.importClause.namedBindings);

            rewrites.push({
              from: st.pos,
              to: st.end,
              text:
                (isLastStatement ? 'return ' : '') +
                (
                  !hasDefaultImport && !hasNamedImports ? '' :
                    '[{' +
                    (!hasDefaultImport ? '' : 'default: ' + st.importClause.name.escapedText) +
                    (!hasDefaultImport || !hasNamedImports ? '' : ', ') +
                    (!hasNamedImports ? '' :
                      st.importClause.namedBindings.elements.map(e =>
                        !e.propertyName ? e.name.escapedText :
                          e.propertyName.text + ' as ' + e.name.escapedText).join(', ')
                    ) +
                    '}] = '
                ) +

                (
                  !hasStarImport ? '' :
                    '[' + st.importClause.namedBindings.name.escapedText + '] = '
                ) +

                ` [await import(${JSON.stringify(unpkgSource)})];`
            });
          }
        } else if (ts.isVariableStatement(st)) {
          rewrites.push({
            from: st.pos,
            to: st.declarationList.declarations[0].pos,
            text: (isLastStatement ? 'return ' : '')
          });
        } else if (ts.isFunctionDeclaration(st)) {
          if (st.name) {
            rewrites.push({
              from: st.pos,
              to: st.pos,
              text:
                (isLastStatement ? 'return ' : '') +
                'this.' + st.name.escapedText + ' = '
            });
          }
        } else if (ts.isExpressionStatement(st)) {
          if (isLastStatement)
            rewrites.push({
              from: st.expression.pos,
              to: st.expression.pos,
              text: 'return ('
            });

          rewrites.push({
            from: st.expression.end,
            to: st.expression.end,
            text: ')'
          });
        }
      }

      const code = tsBlock.block.code;
      let rewritten = '';
      let lastEnd = 0;
      for (const change of rewrites) {
        rewritten += code.slice(lastEnd, change.from) + change.text;
        lastEnd = change.to;
      }
      rewritten += code.slice(lastEnd);

      rewritten = '(async () => {' + rewritten + '\n})()';

      return {
        rewritten
      };
    });
  }

}

const key = new PluginKey('JAVASCRIPT_RUNTIME');
export const javascriptRuntimePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      registerRuntime(
        editorState,
        new JSRuntime(editorState));
    },
    apply: (tr, pluginState, oldState, newState) => undefined
  },
});
