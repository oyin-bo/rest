// @ts-check

// @ts-check

import { Plugin, PluginKey, Transaction } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';
import { insertedInTransaction } from '../state/plugin-completion-service';
import { codeBlockVirtualFileName, getTypescriptLanguageServiceFromEditorState } from './plugin-lang';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';

const key = new PluginKey('TYPESCRIPT_FORMATTING_SERVICE');
export const typescriptFormattingServicePlugin = new Plugin({
  key,
  appendTransaction: (transactions, oldEditorState, newEditorState) => {
    let inserted;
    let insertedCount = 0;
    for (const tr of transactions) {
      const trInserted = insertedInTransaction(tr);
      if (trInserted) {
        inserted = trInserted;
        insertedCount++;
      }
    }

    if (insertedCount !== 1 || !inserted || inserted.text.length !== 1) return;

    const lang = getTypescriptLanguageServiceFromEditorState(newEditorState);
    if (!lang) return;

    const codeBlockRegions = getCodeBlockRegionsOfEditorState(newEditorState);
    if (!codeBlockRegions?.codeBlocks?.length) return;

    for (let iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
      const block = codeBlockRegions.codeBlocks[iBlock];
      if (inserted.from !== inserted.to ||
        inserted.from < block.script.pos ||
        inserted.to > block.script.pos + block.script.node.nodeSize) continue;

      const codeBlockFileName = codeBlockVirtualFileName(iBlock, block.language);
      if (!codeBlockFileName) return;

      const blockScriptPos = block.script.pos + 1;

      const insertedPosInScript = inserted.from - blockScriptPos + (inserted.text === '\n' ? 0 : 1);

      const formats = lang.languageService.getFormattingEditsAfterKeystroke(
        codeBlockFileName,
        insertedPosInScript,
        inserted.text,
        {
          indentSize: 2,
          tabSize: 2,
          trimTrailingWhitespace: true,
          convertTabsToSpaces: true,
          indentStyle: lang.ts.IndentStyle.Smart,
          insertSpaceAfterCommaDelimiter: true,
          indentMultiLineObjectLiteralBeginningOnBlankLine: true,
          insertSpaceBeforeAndAfterBinaryOperators: true
        });
      console.log(
        'getFormattingEditsAfterKeystroke:\n',
        block.code.slice(0, insertedPosInScript) +
        '|' + JSON.stringify(inserted.text) + '|' +
        block.code.slice(inserted.to - blockScriptPos), formats);

      let tr = newEditorState.tr.setMeta('addToHistory', false);
      let adjust = 0;
      let insertPosAdjusted = insertedPosInScript;
      for (const fmt of formats) {
        if (insertedPosInScript > fmt.span.start)
          insertPosAdjusted += fmt.newText.length - fmt.span.length;

        if (fmt.newText) {
          tr = tr.replaceRangeWith(
            blockScriptPos + adjust + fmt.span.start,
            blockScriptPos + adjust + fmt.span.start + fmt.span.length,
            newEditorState.schema.text(fmt.newText));

          console.log(
            'replaceRangeWith:\n',
            block.code.slice(0, fmt.span.start) +
            '|' + JSON.stringify(fmt.newText) + '|' +
            (!fmt.span.length ? '' : '(' + block.code.slice(fmt.span.start, fmt.span.start + fmt.span.length) + ')') +
            block.code.slice(fmt.span.start + fmt.span.length));
        } else {
          tr = tr.deleteRange(
            blockScriptPos + adjust + fmt.span.start,
            blockScriptPos + adjust + fmt.span.start + fmt.span.length);

          console.log(
            'replaceRangeWith:\n',
            block.code.slice(0, fmt.span.start) +
            (!fmt.span.length ? '' : '(' + block.code.slice(fmt.span.start, fmt.span.start + fmt.span.length) + ')') +
            block.code.slice(fmt.span.start + fmt.span.length));
        }

        adjust += fmt.newText.length - fmt.span.length;
      }

      if (inserted.text === '\n') {
        const indent = lang.languageService.getIndentationAtPosition(
          codeBlockFileName,
          insertedPosInScript,
          {
            tabSize: 2,
            indentStyle: lang.ts.IndentStyle.Smart
          });
        if (indent > 0) {
          tr = tr.replaceRangeWith(
            blockScriptPos + insertPosAdjusted + 1,
            blockScriptPos + insertPosAdjusted + 1,
            newEditorState.schema.text([...Array(indent + 1)].join(' ')));
        }
      }

      return tr;
    }
  },
  view: (editorView) => {
    return {};
  }
});
