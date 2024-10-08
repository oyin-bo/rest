// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';
import { codeBlockVirtualFileName, getTypeScriptCodeBlocks, getTypescriptLanguageServiceFromEditorState } from './plugin-lang';
import { ClassificationType, ClassificationTypeNames } from 'typescript';

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
  const tsCodeBlocks = getTypeScriptCodeBlocks(editorState);
  if (!tsCodeBlocks) return;
  const lang = getTypescriptLanguageServiceFromEditorState(editorState);
  if (!lang) return;

  const decorationsArray = getDecorationsForCodeBlocks(lang, tsCodeBlocks);
  const decorationSet = DecorationSet.create(editorState.doc, decorationsArray);
  return decorationSet;
}

/**
 * @param {import("../../../typescript-services/lang-service-with-ts").LanguageServiceAccess} lang
 * @param {NonNullable<ReturnType<getTypeScriptCodeBlocks>>} codeBlocks
 */
function getDecorationsForCodeBlocks(lang, codeBlocks) {
  const { languageService, ts } = lang;

  const decorations = [];
  let program;

  for (const tsBlock of codeBlocks) {
    if (!tsBlock.fileName) continue;

    const syntaxHighlights = languageService.getSyntacticClassifications(
      tsBlock.fileName,
      ts.createTextSpan(0, tsBlock.block.code.length));

    /** @type {import('typescript').Node[] | undefined} */
    let nodes;

    for (const hi of syntaxHighlights) {
      if (hi.classificationType === 'string') {
        // split off quotes, check if used as property
        if (!nodes) {
          nodes = [];

          if (!program) program = lang.languageService.getProgram();
          if (program) {
            const source = program.getSourceFile(tsBlock.fileName);
            if (source) {
              /** @param {import('typescript').Node} node */
              const visitor = (node) => {
                for (let pos = node.pos; pos < node.end; pos++) {
                  /** @type {NonNullable<typeof nodes>}*/(nodes)[pos] = node;
                }
                node.forEachChild(visitor);
              };
              source.forEachChild(visitor);
            }
          }
        }

        const node = nodes[hi.textSpan.start];
        if (node && ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
          const spanText = tsBlock.block.code.slice(hi.textSpan.start, hi.textSpan.start + hi.textSpan.length);
          const openingQuote = spanText.charAt(0);
          const closingQuote = spanText.charAt(spanText.length - 1);
          if (openingQuote === closingQuote && (openingQuote === '"' || openingQuote === "'")) {
            decorations.push(Decoration.inline(
              tsBlock.documentFrom + hi.textSpan.start,
              tsBlock.documentFrom + hi.textSpan.start + 1,
              { class: 'ts-string-property-quote' }
            ));
            decorations.push(Decoration.inline(
              tsBlock.documentFrom + hi.textSpan.start + 1,
              tsBlock.documentFrom + hi.textSpan.start + 1 + hi.textSpan.length - 2,
              { class: 'ts-string ts-property' }
            ));
            decorations.push(Decoration.inline(
              tsBlock.documentFrom + hi.textSpan.start + hi.textSpan.length - 1,
              tsBlock.documentFrom + hi.textSpan.start + hi.textSpan.length,
              { class: 'ts-string-property-quote' }
            ));
          } else {
            decorations.push(createDecorationForClassification(
              tsBlock.documentFrom,
              hi.textSpan,
              hi.classificationType + ' ' +
              'property'
            ));
          }
          continue;
        }
      }

      decorations.push(createDecorationForClassification(tsBlock.documentFrom, hi.textSpan, hi.classificationType));
    }

    // const semanticHighlights = languageService.getSemanticClassifications(
    //   codeBlockFileName,
    //   ts.createTextSpan(0, code.length));

    // for (const hi of semanticHighlights) {
    //   decorations.push(createDecorationForClassification(script.pos, hi));
    // }

    const syntaxErrors = languageService.getSyntacticDiagnostics(tsBlock.fileName);

    for (const err of syntaxErrors) {
      let className = 'ts-err ts-err-' + ts.DiagnosticCategory[err.category];

      const deco = Decoration.inline(
        tsBlock.documentFrom + err.start,
        tsBlock.documentFrom + err.length,
        { class: className }
      );
      decorations.push(deco);
    }

    const semanticErrors = languageService.getSemanticDiagnostics(tsBlock.fileName);
    for (const err of semanticErrors) {

      if (typeof err.start !== 'number' || typeof err.length !== 'number') continue;

      let className =
        'ts-err ts-err-semantic ts-err-semantic-' + ts.DiagnosticCategory[err.category];

      const deco = Decoration.inline(
        tsBlock.documentFrom + err.start,
        tsBlock.documentFrom + err.start + err.length + 1,
        { class: className }
      );
      decorations.push(deco);
    }

  }

  return decorations;
}

/**
 * @param {number} leadOffset
 * @param {import('typescript').TextSpan} textSpan
 * @param {string} classificationType
 */
function createDecorationForClassification(leadOffset, textSpan, classificationType) {
  const className = getSyntaxClassName(classificationType);
  const deco = Decoration.inline(
    leadOffset + textSpan.start,
    leadOffset + textSpan.start + textSpan.length,
    { class: className }
  );
  return deco;
}

/**
 * @type {Record<string,string> | undefined}
 */
var cache;

/**
 * @param {string} classificationType
 */
export function getSyntaxClassName(classificationType) {
  const cachedResult = cache?.[classificationType];

  if (cachedResult) return cachedResult;

  if (!cache) {
    const result = classificationType.split(' ').map(s => 'ts-' + s).join(' ');
    cache = { [classificationType]: result };
    return result;
  } else {
    const result = classificationType.split(' ').map(s => 'ts-' + s).join(' ');
    cache[classificationType] = result;
    return result;
  }
}
