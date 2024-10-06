// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';
import { codeBlockVirtualFileName, getTypescriptLanguageServiceFromEditorState } from './plugin-lang';

const key = new PluginKey('TYPESCRIPT_DECORATIONS');
export const typescriptDecorationsPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => deriveDecorationsFromEditorState(editorState),
    apply: (tr, pluginState, oldState, newState) =>
      !tr.docChanged && pluginState ? pluginState : deriveDecorationsFromEditorState(newState)
  },
  props: {
    decorations: (editorState) => key.getState(editorState)
  }
});

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 */
function deriveDecorationsFromEditorState(editorState) {
  const codeBlockRegions = getCodeBlockRegionsOfEditorState(editorState);
  if (!codeBlockRegions) return;
  const lang = getTypescriptLanguageServiceFromEditorState(editorState);
  if (!lang) return;

  const decorationsArray = getDecorationsForCodeBlocks(lang, codeBlockRegions.codeBlocks);
  const decorationSet = DecorationSet.create(editorState.doc, decorationsArray);
  return decorationSet;
}

/**
 * @param {import("../../../typescript-services/lang-service-with-ts").LanguageServiceAccess} lang
 * @param {import("../state-block-regions/find-code-blocks").CodeBlockNodeset[]} codeBlocks
 */
function getDecorationsForCodeBlocks(lang, codeBlocks) {
  const { languageService, ts } = lang;

  const decorations = [];

  for (let iBlock = 0; iBlock < codeBlocks.length; iBlock++) {
    const { script, code, language } = codeBlocks[iBlock];

    const codeBlockFileName = codeBlockVirtualFileName(iBlock, language);
    if (!codeBlockFileName) continue;

    const syntaxHighlights = languageService.getSyntacticClassifications(
      codeBlockFileName,
      ts.createTextSpan(0, code.length));

    for (const hi of syntaxHighlights) {
      const className = hi.classificationType.split(' ').map(s => 'ts-' + s).join(' ');
      const deco = Decoration.inline(
        script.pos + hi.textSpan.start + 1,
        script.pos + hi.textSpan.start + hi.textSpan.length + 1,
        { class: className }
      );
      decorations.push(deco);
    }

    const syntaxErrors = languageService.getSyntacticDiagnostics(codeBlockFileName);

    for (const err of syntaxErrors) {
      let className = 'ts-err ts-err-' + ts.DiagnosticCategory[err.category];

      const deco = Decoration.inline(
        script.pos + err.start + 1,
        script.pos + err.start + err.length + 1,
        { class: className }
      );
      decorations.push(deco);
    }

    const semanticErrors = languageService.getSemanticDiagnostics(codeBlockFileName);
    for (const err of semanticErrors) {

      if (typeof err.start !== 'number' || typeof err.length !== 'number') continue;

      let className =
        'ts-err ts-err-semantic ts-err-semantic-' + ts.DiagnosticCategory[err.category];

      const deco = Decoration.inline(
        script.pos + err.start + 1,
        script.pos + err.start + err.length + 1,
        { class: className }
      );
      decorations.push(deco);
    }

  }

  return decorations;
}
