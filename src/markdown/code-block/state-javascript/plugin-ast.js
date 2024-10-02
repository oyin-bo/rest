// @ts-check

import { pluginDependency } from '../../plugin-dependency';
import { getCodeBlockRegions } from '../state-block-regions';
import { getTypescriptLanguageService } from './plugin-lang';

const { plugin, getValue } = pluginDependency({
  name: 'JAVASCRIPT_CODE_BLOCK_AST',
  update: 'docChanged',
  like: () => ({
    /** @type {(import('typescript').Program | undefined)} */
    program: undefined,
    /** @type {(import('typescript').SourceFile | undefined)[]} */
    sourceFiles: []
  }),
  derive: ({ from, editorState }) => {
    const prevRegions = !from?.editorState ? undefined: getCodeBlockRegions(from?.editorState);
    const newRegions = getCodeBlockRegions(editorState);

    const js = getTypescriptLanguageService(editorState);
    if (!js || js.then || !newRegions) return from?.value || { program: undefined, sourceFiles: [] };

    if (prevRegions && from &&
      prevRegions.length === newRegions.length &&
      prevRegions.every((v, i) => v.code === newRegions[i].code && v.language === newRegions[i].language)) {
      return from.value;
    }

    // TODO: optimize to not regenerate text snapshots for existing files
    js.scripts = {};
    for (let index = 0; index < newRegions.length; index++) {
      const { language, code } = newRegions[index];
      if (language) {
        js.scripts[codeBlockVirtualFileName(index, language)] = code;
      }
    }

    const program = js.languageService.getProgram();
    const sourceFiles = newRegions.map(({ code }, index) => {
      const { language } = newRegions[index];
      if (language) {
        const virtualFileName = codeBlockVirtualFileName(index, language);
        const fileAst = program?.getSourceFile(virtualFileName);
        return fileAst;
      }
    });

    return { program, sourceFiles };
  }
});

export {
  plugin as javascriptCodeBlockAstPlugin,
  getValue as getJavascriptCodeBlockAst,
}

/**
 * @param {number} index
 * @param {'JavaScript' | 'TypeScript' | 'JSON'} lang
 */
export function codeBlockVirtualFileName(index, lang) {
  return 'code' + (index + 1) + (
    lang === 'TypeScript' ? '.ts' :
      lang === 'JSON' ? '.json' :
        '.js'
  );
}
