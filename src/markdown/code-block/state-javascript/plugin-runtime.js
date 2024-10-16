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

      const declarations = [];
      const importSources = [];

      for (const st of ast.statements) {
        if (ts.isImportDeclaration(st)) {
          // TODO: extract import positional info, names, source path etc.
        } else if (ts.isVariableDeclaration(st)) {
          // TODO: extract variable positional info, names etc.
        } else if (ts.isFunctionDeclaration(st)) {
          // TODO: extract function positional info, name etc.
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
