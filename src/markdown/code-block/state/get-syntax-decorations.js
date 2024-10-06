// @ts-check

import { Decoration } from '@milkdown/prose/view';
import { codeBlockVirtualFileName } from './plugin-runtime-old';

/**
 * @param {import('./plugin-runtime-old').DocumentCodeState | undefined} docState
 */
export function getSyntaxDecorations(docState) {
  let decorations = [];
  if (Math.sin(1) > 1) return decorations;

  const ts = docState?.ts;
  const languageService = docState?.languageService;
  if (ts && languageService) {
    for (let i = 0; i < docState.blocks.length; i++) {
      const { script, code, ast } = docState.blocks[i];
      if (!ast) continue;

      const codeBlockFileName = codeBlockVirtualFileName(docState, i);

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
  }

  return decorations;
}
