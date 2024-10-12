// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';
import { codeBlockVirtualFileName, getTypeScriptCodeBlocks, getTypescriptLanguageServiceFromEditorState } from './plugin-lang';

/**
 * @typedef {ReturnType<typeof getTypeScriptCodeBlocks> & {
 *  decorationSpansForCodeBlocks: { from: number, to: number, class: string }[][],
 *  decorationSet: DecorationSet | undefined,
 * }} PluginState
 */

/** @type {PluginState} */
const emptyPluginState = {
  lang: undefined,
  decorationSpansForCodeBlocks: [],
  decorationSet: undefined,
  codeOnlyIteration: 0,
  codeOrPositionsIteration: 0,
  tsBlocks: []
};

const key = new PluginKey('TYPESCRIPT_DECORATIONS');
export const typescriptDecorationsPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => deriveDecorationsFromEditorState(editorState),
    apply: (tr, pluginState, oldState, newState) =>
      deriveDecorationsFromEditorState(newState, pluginState, tr.docChanged)
  },
  props: {
    decorations: (editorState) => key.getState(editorState).decorationSet
  }
});

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {PluginState} [pluginState]
 * @param {boolean} [docChanged]
 * @returns {PluginState}
 */
function deriveDecorationsFromEditorState(editorState, pluginState, docChanged) {
  const { tsBlocks, codeOnlyIteration, codeOrPositionsIteration, lang } = getTypeScriptCodeBlocks(editorState);
  if (!docChanged && pluginState?.codeOrPositionsIteration === codeOrPositionsIteration)
    return pluginState;

  if (!lang) return pluginState || emptyPluginState;

  const result = {
    ...(pluginState || emptyPluginState),
    tsBlocks,
    codeOnlyIteration,
    codeOrPositionsIteration
  };

  if (pluginState?.codeOnlyIteration !== codeOnlyIteration && lang)
    result.decorationSpansForCodeBlocks = getDecorationSpansForCodeBlocks(lang, tsBlocks);

  const decorations = deriveDecorationsForSpans(result.decorationSpansForCodeBlocks, tsBlocks);
  result.decorationSet = decorations && DecorationSet.create(editorState.doc, decorations);
  return result;
}

/**
 * @param {PluginState['decorationSpansForCodeBlocks']} decorationsOfBlocks
 * @param {ReturnType<typeof getTypeScriptCodeBlocks>['tsBlocks']} tsBlocks
 */
function deriveDecorationsForSpans(decorationsOfBlocks, tsBlocks) {
  const decorationsArray = [];
  for (let iBlock = 0; iBlock < tsBlocks.length; iBlock++) {
    const blockDecorations = decorationsOfBlocks[iBlock];
    if (!blockDecorations?.length) continue;
    const tsBlock = tsBlocks[iBlock];
    for (const deco of blockDecorations) {
      decorationsArray.push(Decoration.inline(
        tsBlock.documentFrom + deco.from,
        tsBlock.documentFrom + deco.to,
        { class: deco.class }
      ));
    }
  }
  if (decorationsArray.length) return decorationsArray;
}

/**
 * @param {import("../../../typescript-services/lang-service-with-ts").LanguageServiceAccess} lang
 * @param {ReturnType<getTypeScriptCodeBlocks>['tsBlocks']} tsBlocks
 */
function getDecorationSpansForCodeBlocks(lang, tsBlocks) {
  const { languageService, ts } = lang;

  const decorationsOfBlocks = [];
  let program;

  for (let iBlock = 0; iBlock < tsBlocks.length; iBlock++) {
    const tsBlock = tsBlocks[iBlock];
    if (!tsBlock.fileName) continue;

    const blockDecorations = [];
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
            blockDecorations.push({
              from: hi.textSpan.start,
              to: hi.textSpan.start + 1,
              class: 'ts-string-property-quote'
            });
            blockDecorations.push({
              from: hi.textSpan.start + 1,
              to: hi.textSpan.start + 1 + hi.textSpan.length - 2,
              class: 'ts-string ts-property'
            });
            blockDecorations.push({
              from: hi.textSpan.start + hi.textSpan.length - 1,
              to: hi.textSpan.start + hi.textSpan.length,
              class: 'ts-string-property-quote'
            });
          } else {
            blockDecorations.push(createDecorationSpanForClassification(
              hi.textSpan,
              hi.classificationType + ' property'
            ));
          }
          continue;
        }
      }

      blockDecorations.push(createDecorationSpanForClassification(hi.textSpan, hi.classificationType));
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

      const deco = {
        from: err.start,
        to: err.length,
        class: className
      };
      blockDecorations.push(deco);
    }

    const semanticErrors = languageService.getSemanticDiagnostics(tsBlock.fileName);
    for (const err of semanticErrors) {

      if (typeof err.start !== 'number' || typeof err.length !== 'number') continue;

      let className =
        'ts-err ts-err-semantic ts-err-semantic-' + ts.DiagnosticCategory[err.category];

      const deco = {
        from: err.start,
        to: err.start + err.length + 1,
        class: className
      };
      blockDecorations.push(deco);
    }

    if (blockDecorations.length) decorationsOfBlocks[iBlock] = blockDecorations;

  }

  return decorationsOfBlocks;
}

/**
 * @param {import('typescript').TextSpan} textSpan
 * @param {string} classificationType
 */
function createDecorationSpanForClassification(textSpan, classificationType) {
  const className = getSyntaxClassName(classificationType);
  const deco = {
    from: textSpan.start,
    to: textSpan.start + textSpan.length,
    class: className
  };
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
