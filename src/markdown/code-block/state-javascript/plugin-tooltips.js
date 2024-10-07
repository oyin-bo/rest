// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { addTooltipProviderToEditorState } from '../state/plugin-tooltip-service';
import { codeBlockVirtualFileName, getTypescriptLanguageServiceFromEditorState } from './plugin-lang';

const key = new PluginKey('TYPESCRIPT_TOOLTIPS');
export const typescriptTooltipsPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      addTooltipProviderToEditorState(
        editorState,
        ({ editorState, codeBlockIndex, codeBlockRegion, codeOffset }) => {
          const lang = getTypescriptLanguageServiceFromEditorState(editorState);
          if (!lang) return;

          const codeBlockFileName = codeBlockVirtualFileName(codeBlockIndex, codeBlockRegion.language);
          if (!codeBlockFileName) return;

          let infoElem;
          const quickInfo = lang.languageService.getQuickInfoAtPosition(codeBlockFileName, codeOffset);
          if (quickInfo) infoElem = renderQuickInfo(quickInfo);

          const diag =
            lang.languageService.getSyntacticDiagnostics(codeBlockFileName)?.find(
              synt => synt.start <= codeOffset && synt.start + synt.length >= codeOffset) ||
            lang.languageService.getSemanticDiagnostics(codeBlockFileName)?.find(
              sem => typeof sem.start === 'number' && sem.start <= codeOffset && typeof sem.length === 'number' && sem.start + sem.length >= codeOffset);

          let diagElem;
          if (diag) diagElem = renderDiag(diag);

          if (infoElem || diagElem) {
            const bothElem = document.createElement('div');
            if (diagElem) bothElem.appendChild(diagElem);
            if (infoElem) bothElem.appendChild(infoElem);

            return {
              element: bothElem,
              highlightFrom:
                typeof diag?.start === 'number' ? diag.start :
                  quickInfo ? quickInfo.textSpan.start :
                    0,
              highlightTo:
                typeof diag?.start === 'number' && typeof diag?.length === 'number' ? diag.start + diag.length :
                  quickInfo?.textSpan ? quickInfo.textSpan.start + quickInfo.textSpan.length :
                    0
            };
          }
        })
    },
    apply: () => { }
  }
});

/**
 * @param {import('typescript').Diagnostic} diag
 */
function renderDiag(diag) {
  const diagElem = document.createElement('div');
  diagElem.className = 'code-block-tooltip-diag-' + diag.category;
  diagElem.textContent =
    (diag.code ? 'TS' + diag.code + ': ' : '') +
    diag.messageText;

  return diagElem;
}

/**
 * @param {import('typescript').QuickInfo | undefined} quickInfo
 */
function renderQuickInfo(quickInfo) {
  if (!quickInfo) return;
  const quickInfoElem = document.createElement('div');
  quickInfoElem.className = 'code-block-tooltip-quick-info';

  if (quickInfo.displayParts) {
    const displayPartsElem = document.createElement('div');
    for (const dp of quickInfo.displayParts) {
      const dpElem = document.createElement('span');
      dpElem.className =
        'code-block-tooltip-display-' + dp.kind +
        ' ts-' + dp.kind;
      dpElem.textContent = dp.text;
      displayPartsElem.appendChild(dpElem);
    }
    quickInfoElem.appendChild(displayPartsElem);
  }

  if (quickInfo.documentation) {
    const docsElem = document.createElement('div');
    for (const dp of quickInfo.documentation) {
      const dpElem = document.createElement('div');
      dpElem.className = 'code-block-tooltip-doc-' + dp.kind;
      dpElem.textContent = dp.text;
      docsElem.appendChild(dpElem);
    }
    quickInfoElem.appendChild(docsElem)
  }

  return quickInfoElem;
}

