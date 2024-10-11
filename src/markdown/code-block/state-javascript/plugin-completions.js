// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { addCompletionProviderToEditorState } from '../state/plugin-completion-service';
import { codeBlockVirtualFileName, getTypescriptLanguageServiceFromEditorState, resolveDocumentPositionToTypescriptCodeBlock } from './plugin-lang';

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

          const completions = tsBlock.lang.languageService.getCompletionsAtPosition(
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

          if (!completions) return;

          if (!completions.entries.length) return;

          const targetStart = completions.optionalReplacementSpan ?
            completions.optionalReplacementSpan.start :
            codeOffset;
          const targetEnd = completions.optionalReplacementSpan ?
            completions.optionalReplacementSpan.start + completions.optionalReplacementSpan.length :
            codeOffset;

          const entryElements = [];
          for (const entry of completions.entries) {
            const overlapText = codeBlockRegion.code.slice(
              entry.replacementSpan ? entry.replacementSpan.start : targetStart,
              entry.replacementSpan ? entry.replacementSpan.start + Math.max(entry.replacementSpan.length, 1) : Math.max(targetEnd, targetStart + 1));

            const matchText = entry.name;
            if (!matchText) continue;

            const overlapLowerCase = overlapText.toLowerCase();
            const matchingOverlap = overlapText === overlapLowerCase ?
              matchText.toLowerCase().startsWith(overlapText) :
              matchText.startsWith(overlapText);
            if (!matchingOverlap) continue;

            const entryElem = document.createElement('div');
            entryElem.className = 'completion-entry completion-entry-' + entry.kind;

            const coreNameSpan = document.createElement('span');
            coreNameSpan.className = 'completion-entry-core-name';
            entryElem.appendChild(coreNameSpan);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'completion-entry-name';
            nameSpan.textContent = entry.name;
            coreNameSpan.appendChild(nameSpan);

            if (entry.labelDetails?.detail) {
              const detailSpan = document.createElement('span');
              detailSpan.className = 'completion-entry-detail';
              detailSpan.textContent = entry.labelDetails.detail;
              entryElem.appendChild(detailSpan);
            }

            if (entry.labelDetails?.description) {
              const detailSpan = document.createElement('span');
              detailSpan.className = 'completion-entry-detail';
              detailSpan.textContent = entry.labelDetails.description;
              entryElem.appendChild(detailSpan);
            }

            const moreDetails = tsBlock.lang.languageService.getCompletionEntryDetails(
              tsBlock.fileName,
              codeOffset,
              entry.name,
              undefined,
              entry.source,
              {
                displayPartsForJSDoc: true
              },
              entry.data
            );
            if (moreDetails) {

              if (moreDetails.displayParts?.length) {
                const sideDescriptionEl = document.createElement('span');
                sideDescriptionEl.className = 'completion-entry-side-description';
                entryElem.appendChild(sideDescriptionEl);

                for (const part of moreDetails.displayParts) {
                  const partEl = document.createElement('span');
                  partEl.className = 'ts-' + part.kind;
                  partEl.textContent = part.text;
                  sideDescriptionEl.appendChild(partEl);
                }
              }
            }

            entryElements.push({
              element: entryElem,
              apply: entry.insertText || entry.name,
              recommended: entry.isRecommended
            });

            if (entryElements.length > 80) break;
          }

          if (!entryElements.length) return;

          return {
            targetStart: completions.optionalReplacementSpan ?
              completions.optionalReplacementSpan.start :
              codeOffset,
            targetEnd: completions.optionalReplacementSpan ?
              completions.optionalReplacementSpan.start + completions.optionalReplacementSpan.length :
              codeOffset,
            completions: entryElements
          };
        })
    },
    apply: () => { }
  }
});