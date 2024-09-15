// @ts-check

import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';


export function createResultEditingTransactionResult() {
  const pluginKey = new PluginKey('FILTER_RESULT_EDITING');
  const pluginFilterEditing = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta('setLargeResultAreaText')) return true;

      let codeBlockResults = [];
      state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
        if (node.type.name === 'code_block_result') {
          codeBlockResults.push({ pos, nodeSize: node.nodeSize });
        }
      });

      for (const step of tr.steps) {
        const replaceStep = /** @type {import('prosemirror-transform').ReplaceStep} */ (step);
        if (replaceStep.from >= 0 && replaceStep.to >= 0) {
          for (const resultSpan of codeBlockResults) {
            const resultSpanAffected = replaceStep.from < resultSpan.pos + resultSpan.nodeSize &&
              replaceStep.to > resultSpan.pos;
            if (resultSpanAffected) {
              return false;
            }
          }
        }
      }

      console.log('passed transaction ', tr, codeBlockResults);

      return true;
    },
  });
  return pluginFilterEditing;
}
