// @ts-check

import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { ReplaceStep } from '@milkdown/prose/transform';


export function createResultEditingTransactionResult() {
  const pluginKey = new PluginKey('FILTER_RESULT_EDITING');
  const pluginFilterEditing = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta('setLargeResultAreaText')) return true;

      const codeBlockNodes = findCodeBlocks(state.doc);

      let anyStepsModified = false;
      /** @type {typeof tr.steps} */
      const filteredSteps = [];
      for (const step of tr.steps) {
        let replaceStep = step instanceof ReplaceStep ? step : undefined;
        if (!replaceStep) {
          filteredSteps.push(step);
          continue;
        }

        for (const entry of codeBlockNodes) {
          const codeOverlap = spanOverlap(replaceStep, entry.codePos, entry.code.nodeSize);
          const resultOverlap = entry.result && spanOverlap(
            replaceStep,
            entry.resultPos || 0,
            entry.result.nodeSize);

          if (!codeOverlap && !resultOverlap) {
            filteredSteps.push(step);
            continue;
          }

          if (codeOverlap) {
            anyStepsModified = true;
            replaceStep = replaceStep
              ...replaceStep.from,
              from: Math.min(replaceStep.from, entry.codePos),
              to: Math.max(replaceStep.to, entry.codePos + entry.code.nodeSize),
            };
          }
        }

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
 */
function findCodeBlocks(doc) {
  /**
   * @type {{
   *  code: import ("prosemirror-model").Node,
   *  codePos: number,
   *  result?: import ("prosemirror-model").Node,
   *  resultPos?: number,
   * }[]}
   */
  let codeBlocks = [];
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.type.name === 'code_block') {
      codeBlocks.push({ code: node, codePos: pos });
    } else {
      if (node.isBlock) {
        let lastCodeBlock = codeBlocks[codeBlocks.length - 1];
        if (node.type.name === 'code_block_result' &&
          lastCodeBlock &&
          lastCodeBlock.codePos + lastCodeBlock.code.nodeSize === pos) {
          lastCodeBlock.result = node;
          lastCodeBlock.resultPos = pos;
        }
      }
    }
  });
  return codeBlocks;
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
