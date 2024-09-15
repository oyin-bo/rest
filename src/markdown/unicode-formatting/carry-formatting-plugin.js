// @ts-check

import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { adjustTypingTransaction } from './adjust-typing-transaction';


/**
 * @param {() => void} triggerUpdateButtons
 */
export function createCarryFormattingPlugin(triggerUpdateButtons) {
  const pluginKey = new PluginKey('UNICODE_CONVERSIONS');
  const pluginCarryUnicodeConversions = new Plugin({
    key: pluginKey,
    appendTransaction: (transactions, oldState, newState) => {
      triggerUpdateButtons();
      return adjustTypingTransaction(transactions, oldState, newState);
    },
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
    state: {
      init: (editorStateConfig, editorInstance) => {
        console.log('UNICODE_CONVERSIONS init', { editorStateConfig, editorInstance });
      },
      apply: (tr, value, oldState, newState) => {
      },
    }
  });
  return pluginCarryUnicodeConversions;
}
