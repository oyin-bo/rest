// @ts-check

import { pluginDependency } from '../../plugin-dependency';
import { getCodeBlockRegions } from '../state-block-regions';
import { getTypescriptLanguageService } from './plugin-lang';

const { plugin, getValue } = pluginDependency({
  name: 'JAVASCRIPT_CODE_BLOCK_AST',
  update: 'docChanged',
  /** @type {import('../../plugin-dependency').DeriveDependency<(import('typescript').SourceFile | undefined)[]>} */
  derive: ({ from, editorState }) => {
    const prevRegions = !from?.editorState ? undefined: getCodeBlockRegions(from?.editorState);
    const newRegions = getCodeBlockRegions(editorState);

    const js = getTypescriptLanguageService(editorState);
    if (!js || js.then || !newRegions) return from?.value || [];

    if (prevRegions && from &&
      prevRegions.length === newRegions.length &&
      prevRegions.every((v, i) => v === newRegions[i])) {
      return from.value;
    }

    js.scripts = {};
    for (let index = 0; index < newRegions.length; index++) {
      js.scripts[codeBlockVirtualFileName(index)] = newRegions[index].code;
    }

    const program = js.languageService.getProgram();
    const sourceFiles = newRegions.map(({ code }, index) => {
      const virtualFileName = codeBlockVirtualFileName(index);
      const fileAst = program?.getSourceFile(virtualFileName);
      return fileAst;
    });

    return sourceFiles;
  }
});

export {
  plugin as javascriptCodeBlockAstPlugin,
  getValue as getJavascriptCodeBlockAst,
}

/**
 * @param {number} index
 */
export function codeBlockVirtualFileName(index) {
  return 'code' + (index + 1) + '.js';
}
