// @ts-check

import { Decoration } from '@milkdown/prose/view';
import { codeBlockVirtualFileName } from './code-block-state-plugin';

/**
 * @param {import('./code-block-state-plugin').DocumentCodeState | undefined} docState
 */
export function getSyntaxDecorations(docState) {
  let decorations = [];

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

      const syntaxErrors = languageService.getSyntacticDiagnostics(
        codeBlockFileName
      );

      for (const err of syntaxErrors) {
        let className = 'ts-err ts-err-' + ts.DiagnosticCategory[err.category];

        const deco = Decoration.inline(
          script.pos + err.start + 1,
          script.pos + err.start + err.length + 1,
          { class: className }
        );
        decorations.push(deco);
      }

      return decorations;

      /** @param {import('typescript').Node} tsNode */
      const visit = tsNode => {
        if (tsNode.getChildCount()) {
          const token = tsNode.getFirstToken(ast);
          ts.forEachChild(tsNode, visit);
          return;
        }

        if (tsNode.pos === tsNode.end) return;
        const classNames = [];
        for (const syntaxKindName in ts.SyntaxKind) {
          const syntaxKind = ts.SyntaxKind[syntaxKindName];
          if (typeof syntaxKind === 'number' && (syntaxKind & tsNode.kind) === syntaxKind) {
            classNames.push('ts-' + syntaxKindName);
          }
        }

        const lead = tsNode.getLeadingTriviaWidth();

        const deco = Decoration.inline(
          script.pos + tsNode.pos + 1 + lead,
          script.pos + tsNode.end + 1,
          { class: classNames.join(' ') }
        );
        decorations.push(deco);
      };

      ts.forEachChild(ast, visit);
    }
  }

  return decorations;
}
