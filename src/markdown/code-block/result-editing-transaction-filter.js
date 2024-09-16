// @ts-check

import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';


export function createResultEditingTransactionResult() {
  const pluginKey = new PluginKey('FILTER_RESULT_EDITING');
  const pluginFilterEditing = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta('setLargeResultAreaText')) return true;

      const codeBlockResultNodes = getNodesWithPositions(
        state.doc,
        node => node.type.name === 'code_block_result');

      const codeBlockNodes = getNodesWithPositions(
        state.doc,
        node => node.type.name === 'code_block');

      for (const step of tr.steps) {
        const replaceStep = /** @type {import('prosemirror-transform').ReplaceStep} */ (step);
        if (replaceStep.from >= 0 && replaceStep.to >= 0) {
          for (const { pos, node } of codeBlockResultNodes) {
            if (spanOverlap(replaceStep, pos, node.nodeSize))
              return false;
          }
        }
      }

      console.log('passed transaction ', tr, codeBlockResultNodes);

      return true;
    },
  });

  return pluginFilterEditing;
}

/**
 * @param {import("prosemirror-model").Node} doc
 * @param {(node: import('prosemirror-model').Node, pos: number) => boolean} filter
 */
function getNodesWithPositions(doc, filter) {
  /**
   * @type {{
   *  node: import ("prosemirror-model").Node,
   *  pos: number
   * }[]}
   */
  let resultNodes = [];
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (filter(node, pos)) {
      resultNodes.push({ node, pos });
    }
  });
  return resultNodes;
}

/**
 * @param {import('prosemirror-transform').ReplaceStep} replaceStep
 * @param {number} offset
 * @param {number} length
 */
function spanOverlap(replaceStep, offset, length) {
  const resultSpanAffected = replaceStep.from < offset + length &&
    replaceStep.to > offset;
  if (resultSpanAffected) {
    return true;
  }
}
