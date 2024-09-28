// @ts-check

import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { ReplaceStep, ReplaceAroundStep } from '@milkdown/prose/transform';
import { findCodeBlocks, findOverlappingCodeBlocks, getTransactionCodeBlocks } from './find-code-blocks';
import { withPromiseOrSync } from '../../with-promise-or-sync';
import { makeLanguageService } from './lang-service';

/**
 * @typedef {import('./find-code-blocks').CodeBlockNodeset & {
 *  ast?: import('typescript').SourceFile,
 *  transformedCode?: string,
 *  executionStarted?: number,
 *  executionEnded?: number,
 *  succeeded?: boolean,
 *  error?: any,
 *  result?: any
 * }} CodeBlockState
 */

/**
 * @typedef {{
 *  current: number,
 *  blocks: CodeBlockState[],
 *  program?: import('typescript').Program
 * }} DocumentCodeState
 */


export function createCodeBlockStatePlugin() {
  const pluginKey = new PluginKey('FILTER_RESULT_EDITING');
  const pluginFilterEditing = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta('setLargeResultAreaText')) return true;

      const codeBlockNodes = getTransactionCodeBlocks(tr);

      for (const step of tr.steps) {
        if (!(step instanceof ReplaceStep) && !(step instanceof ReplaceAroundStep)) {
          continue;
        }

        const overlapping = findOverlappingCodeBlocks(step, codeBlockNodes);
        console.log('overlapping', overlapping, tr);

        if (!overlapping) {
          continue;
        }

        if (overlapping.only) {
          // TODO: if result.isSignificant, then expand the step to the whole of result
          // otherwise, exclude the result ONLY from the step

          // temporary implementation, fault whole transaction if results affected
          if (overlapping.only.executionState?.overlap && overlapping.only.executionState.overlap) {
            return false;
          }
        } else {
          // TODO: for the [leading AND trailing], if result.isSignificant, then expand the step to the whole of result
          // otherwise -
          //  * for [leading] exclude both the code and the result from the step
          //  * for [trailing] exclude the result ONLY from the step

          // TODO: for the overlapping.whollyContained, leave them alone

          // temporary implementation, fault whole transaction if results affected
          if (overlapping.leading?.executionState?.overlap ||
            overlapping.trailing?.result?.overlap ||
            overlapping.whollyContained?.length
          ) {
            return false;
          }
        }
      }

      return true;
    },
    state: {
      init: () => /** @type {{ docState: DocumentCodeState } | null} */(null),
      apply: (tr, prev) => {
        const newCodeBlockNodes = getTransactionCodeBlocks(tr);

        if (!prev) {
          const docState = { current: 0, blocks: newCodeBlockNodes };
          processDocState(tr.doc, docState);
          return { docState };
        }

        if (!tr.docChanged) return prev;

        const docState = prev.docState;
        updateDocState(tr.doc, docState, newCodeBlockNodes);
        return { docState };
      }
    }
  });

  return pluginFilterEditing;
}

/**
 * @param {import("prosemirror-model").Node} doc
 * @param {DocumentCodeState} docState
 */
function processDocState(doc, docState) {
  const current = docState.current += 1;

  return withPromiseOrSync(makeLanguageService(), processWithTS);

  /**
   * @param {Awaited<ReturnType<typeof makeLanguageService>>} ls
   */
  async function processWithTS(ls) {
    if (docState.current !== current) return;

    ls.scripts = {};

    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      ls.scripts['code' + (i + 1) + '.ts'] = node.code;
    }

    docState.program = ls.languageService.getProgram();
    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      node.ast = docState.program?.getSourceFile('code' + (i + 1) + '.ts');
    }

    console.log('initiated docState', docState);
  }
}

/**
 * @param {import("prosemirror-model").Node} doc
 * @param {DocumentCodeState} docState
 * @param {import("./find-code-blocks").CodeBlockNodeset[]} newCodeBlockNodes
 */
function updateDocState(doc, docState, newCodeBlockNodes) {
  const current = docState.current += 1;

  const prevBlocks = docState.blocks;
  docState.blocks = newCodeBlockNodes;
  docState.program = undefined;

  return withPromiseOrSync(makeLanguageService(), processWithTS);

  /**
   * @param {Awaited<ReturnType<typeof makeLanguageService>>} ls
   */
  async function processWithTS(ls) {
    if (docState.current !== current) return;

    ls.scripts = {};

    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      ls.scripts['code' + (i + 1) + '.ts'] = node.code;
    }

    docState.program = ls.languageService.getProgram();
    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      node.ast = docState.program?.getSourceFile('code' + (i + 1) + '.ts');
    }

    console.log('updated docState', docState);
  }
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
