// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { addCompletionProviderToEditorState } from '../state/plugin-completion-service';
import { codeBlockVirtualFileName, getTypescriptLanguageServiceFromEditorState, resolveDocumentPositionToTypescriptCodeBlock } from './plugin-lang';
import { knownFromAttributes } from './plugin-runtime';

const key = new PluginKey('TYPESCRIPT_COMPLETIONS');
export const typescriptCompletionsPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      addCompletionProviderToEditorState(
        editorState,
        ({ editorState, codeBlockIndex, codeBlockRegion, documentPos, codeOffset }) => {
          const tsBlock = resolveDocumentPositionToTypescriptCodeBlock(editorState, documentPos);
          if (!tsBlock?.lang || !tsBlock?.fileName) return;

          let completions = tsBlock.lang.languageService.getCompletionsAtPosition(
            tsBlock.fileName,
            codeOffset,
            {
              useLabelDetailsInCompletionEntries: true,
              includeCompletionsWithInsertText: true,
              includeCompletionsWithSnippetText: true,
              includeCompletionsForImportStatements: true,
              includeCompletionsForModuleExports: true,
              includePackageJsonAutoImports: 'on',
              interactiveInlayHints: true,
              displayPartsForJSDoc: true
            }, // TODO: tune completion options
            undefined); // TODO: infer and tune formatting options

          const importFromCompletions = getImportFromCompletions(tsBlock, codeOffset);
          let entries = importFromCompletions || completions?.entries;

          if (!entries?.length) return;

          const optionalReplacementSpan = importFromCompletions?.optionalReplacementSpan || completions?.optionalReplacementSpan;

          const targetStart = optionalReplacementSpan ?
            optionalReplacementSpan.start :
            codeOffset;
          const targetEnd = optionalReplacementSpan ?
            optionalReplacementSpan.start + optionalReplacementSpan.length :
            codeOffset;

          const entryElements = [];
          const withOverlaps = [];
          for (const entry of entries) {
            const overlapText = codeBlockRegion.code.slice(
              entry.replacementSpan ? entry.replacementSpan.start : targetStart,
              entry.replacementSpan ? entry.replacementSpan.start + Math.max(entry.replacementSpan.length, 1) : targetEnd).trim().replace(/^['"]/, '').replace(/['"]$/, '');

            const matchText = entry.name;
            if (!matchText) continue;

            const overlapLowerCase = overlapText.toLowerCase();
            const matchingOverlap =
              !overlapText ? true :
              overlapText === overlapLowerCase ? matchText.toLowerCase().startsWith(overlapText) :
              matchText.startsWith(overlapText);
            if (!matchingOverlap) continue;

            const entryElem = document.createElement('div');
            entryElem.className = 'completion-entry completion-entry-' + entry.kind;

            const coreNameSpan = document.createElement('span');
            coreNameSpan.className = 'completion-entry-core-name';
            entryElem.appendChild(coreNameSpan);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'completion-entry-name';
            if (overlapText.length) {
              const matchingSpan = document.createElement('span');
              matchingSpan.className = 'completion-entry-name-matching';
              matchingSpan.textContent = entry.name.slice(0, overlapText.length);
              nameSpan.appendChild(matchingSpan);
              const restSpan = document.createTextNode(entry.name.slice(overlapText.length));
              nameSpan.appendChild(restSpan);
            } else {
              nameSpan.textContent = entry.name;
            }
            coreNameSpan.appendChild(nameSpan);

            if (entry.labelDetails?.detail) {
              const detailSpan = document.createElement('span');
              detailSpan.className = 'completion-entry-detail';
              detailSpan.textContent = entry.labelDetails.detail;
              entryElem.appendChild(detailSpan);
            }

            if (entry.labelDetails?.description) {
              const detailSpan = document.createElement('span');
              detailSpan.className = 'completion-entry-description';
              detailSpan.textContent = entry.labelDetails.description;
              entryElem.appendChild(detailSpan);
            }

            let moreDetails;
            try {
              moreDetails = !importFromCompletions && tsBlock.lang.languageService.getCompletionEntryDetails(
                tsBlock.fileName,
                codeOffset,
                entry.name,
                {},
                entry.source,
                {
                  displayPartsForJSDoc: true
                },
                entry.data
              );
            } catch (moreError) {
              console.warn('Failed to get completion details for', entry, moreError);
            }

            if (moreDetails) {

              if (moreDetails.displayParts?.length) {
                const sideDescriptionEl = document.createElement('span');
                sideDescriptionEl.className = 'completion-entry-side-description';
                entryElem.appendChild(sideDescriptionEl);

                for (const part of moreDetails.displayParts) {
                  const partEl = document.createElement('span');
                  partEl.className = 'hi-' + part.kind;
                  partEl.textContent = part.text;
                  sideDescriptionEl.appendChild(partEl);
                }
              }
            }

            const co = {
              element: entryElem,
              apply: entry.insertText || entry.name,
              recommended: entry.isRecommended
            };
            entryElements.push(co);
            if (overlapText.length >= 2) withOverlaps.push(co);

            if (entryElements.length > 30) break;
          }

          if (!entryElements.length) return;

          if (!entryElements.some(e => e.recommended)) {
            if (withOverlaps.length) withOverlaps[0].recommended = true;
          }

          return {
            targetStart: completions?.optionalReplacementSpan ?
              completions.optionalReplacementSpan.start :
              codeOffset,
            targetEnd: completions?.optionalReplacementSpan ?
              completions.optionalReplacementSpan.start + completions.optionalReplacementSpan.length :
              codeOffset,
            completions: entryElements
          };
        })
    },
    apply: () => { }
  }
});

/**
 * @param {NonNullable<ReturnType<typeof resolveDocumentPositionToTypescriptCodeBlock>>} tsBlock
 * @param {number} codeOffset
 * @returns {undefined | import('typescript').CompletionEntry[] & { optionalReplacementSpan?: import('typescript').TextSpan }}
 */
function getImportFromCompletions(tsBlock, codeOffset) {
  const prog = tsBlock.lang?.languageService.getProgram();
  const ts = tsBlock.lang?.ts;
  const script = prog?.getSourceFile(tsBlock.fileName);
  if (!script || !ts) return;

  /** @type {import('typescript').ImportDeclaration | undefined} */
  let importDeclaration;
  /** @type {import('typescript').ImportAttributes | undefined} */
  let importAttributes;
  /** @type {import('typescript').ImportAttribute | undefined} */
  let importAttribute;

  /** @type {import('typescript').Identifier | undefined} */
  let identifier;
  const nestedStack = [];

  /** @param {import('typescript').Node} node */
  const visit = (node) => {
    node.forEachChild(visit);
    if (node.getFullStart() <= codeOffset && node.getFullStart() + node.getFullWidth() >= codeOffset) {
      node['_raw_text'] = node.getText();
      node['_kind_str'] = ts.SyntaxKind[node.kind];
      nestedStack.push(node);

      if (ts.isImportDeclaration(node)) importDeclaration = node;
      if (ts.isImportAttributes(node)) importAttributes = node;
      if (ts.isImportAttribute(node)) importAttribute = node;
      if (ts.isIdentifier(node) && node.getWidth() && !identifier) identifier = node;
    }
  };
  script.forEachChild(visit);

  if (!importDeclaration) return;
  if (!importAttributes) {
    if (codeOffset >= importDeclaration.moduleSpecifier.getEnd()) {
      const trailingText = importDeclaration.getText().slice(importDeclaration.moduleSpecifier.getEnd(), importDeclaration.getEnd() - codeOffset);
      return Object.keys(knownFromAttributes).map(k =>
      ({
        kind: ts.ScriptElementKind.alias,
        name: 'with',
        sortText: '0',
        filterText: k,
        labelDetails: {
          detail: k,
          description: knownFromAttributes[k]
        },
        insertText: ' with { from: \'' + k + '\' }' + trailingText,
        isImportStatementCompletion: true
      }));
    }
    return;
  }

  if (!importAttribute) {
    if (!importAttributes.elements.length) {
      return Object.keys(knownFromAttributes).map(k =>
      ({
        kind: ts.ScriptElementKind.alias,
        name: k,
        sortText: '0',
        filterText: k,
        labelDetails: {
          description: knownFromAttributes[k]
        },
        insertText: ' { from: \'' + k + '\' }',
        isImportStatementCompletion: true
      }));
    }

    const lastImportElement = importAttributes.elements[importAttributes.elements.length - 1];
    if (codeOffset >= lastImportElement.getEnd() && lastImportElement.name.text === 'from' && lastImportElement.value.getText().trim() === '') {
      return Object.keys(knownFromAttributes).map(k =>
      ({
        kind: ts.ScriptElementKind.alias,
        name: k,
        sortText: '0',
        filterText: k,
        labelDetails: {
          description: knownFromAttributes[k]
        },
        insertText: '\'' + k + '\'',
        isImportStatementCompletion: true
      }));
    }

    return;
  }

  // ignore with other than from:
  if (importAttribute.name.text !== 'from') return;
  // ignore completions within the word 'from'
  if (codeOffset < importAttribute.name.getEnd()) return;

  /** @type {NonNullable<ReturnType<typeof getImportFromCompletions>>} */
  const withWholeExpressionSpan = Object.keys(knownFromAttributes).map(k =>
  ({
    kind: ts.ScriptElementKind.alias,
    name: k,
    sortText: '0',
    filterText: k,
    labelDetails: {
      description: knownFromAttributes[k]
    },
    insertText: '\'' + k + '\'',
    isImportStatementCompletion: true
  }));
  withWholeExpressionSpan.optionalReplacementSpan = {
    start: importAttribute.value.getStart(),
    length: importAttribute.value.getWidth()
  };

  return withWholeExpressionSpan;

  console.log('AT CURSOR ', {
    importDeclaration, importAttributes, importAttribute, identifier,
    nestedStack,
    tsBlock, script, codeOffset
  });
}
