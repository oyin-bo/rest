// @ts-check

import { defaultValueCtx, editorStateCtx, editorView, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';

import { codeBlockExecutionState } from '../../schema';
import { findCodeBlocks, findOverlappingCodeBlocks, getTransactionCodeBlocks } from '../../state-block-regions/find-code-blocks';
import { modifiesExecutionStateBlocks } from '../modifies-execution-state-blocks';
import { execIsolation } from '../exec-isolation';
import { setResultStateContent } from './set-result-state-content';

/**
 * @typedef {import('../../state-block-regions/find-code-blocks').CodeBlockNodeset & {
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
 * }} DocumentCodeState
 */

const setLargeResultAreaText = 'setLargeResultAreaText';

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
export function createOldCodeBlockRuntimePlugin(ctx) {
  const pluginKey = new PluginKey('CODE_BLOCK_RUNTIME');
  const codeBlockStatePlugin = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta(setLargeResultAreaText)) return true;

      return !modifiesExecutionStateBlocks(tr);
    },
    state: {
      init: () => /** @type {{ docState: DocumentCodeState } | null} */(null),
      apply: (tr, prev) => {
        if (!prev) {
          const docState = { current: 0, blocks: findCodeBlocks(tr.doc) };
          processDocState(ctx, tr.doc, docState);
          return { docState };
        }

        if (!tr.docChanged) return prev;

        const docState = prev.docState;
        updateDocState(ctx, tr.doc, docState, findCodeBlocks(tr.doc));
        return { docState };
      }
    },
    view: editorView => {
      return {};
    }
  });

  return codeBlockStatePlugin;

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   * @param {import("prosemirror-model").Node} doc
   * @param {DocumentCodeState} docState
   * @param {import("../../state-block-regions/find-code-blocks").CodeBlockNodeset[]} newCodeBlockNodes
   */
  function updateDocState(ctx, doc, docState, newCodeBlockNodes) {
    if (docState.blocks.length === newCodeBlockNodes.length) {
      let changed = false;
      for (let i = 0; i < docState.blocks.length; i++) {
        if (docState.blocks[i].code !== newCodeBlockNodes[i].code) {
          changed = true;
          break;
        }
      }

      if (!changed) {
        for (let i = 0; i < docState.blocks.length; i++) {
          const existingNode = docState.blocks[i];
          const newNodeset = newCodeBlockNodes[i];
          existingNode.block = newNodeset.block;
          existingNode.backtick = newNodeset.backtick;
          existingNode.script = newNodeset.script;
          existingNode.executionState = newNodeset.executionState;
        }

        if (docState.blocks.length && !docState.blocks[0].executionStarted)
          return processDocState(ctx, doc, docState);

        return;
      }
    }

    docState.current++;
    const prevBlocks = docState.blocks;
    docState.blocks = newCodeBlockNodes;

    return processDocState(ctx, doc, docState);
  }

  /** @type {ReturnType<typeof createLiveExecutionState> | undefined} */
  var liveExecutionState;

  /**
* @param {import("@milkdown/ctx").Ctx} ctx
* @param {import("prosemirror-model").Node} doc
* @param {DocumentCodeState} docState
*/
  function processDocState(ctx, doc, docState) {
    if (!liveExecutionState) liveExecutionState = createLiveExecutionState(ctx);
    const current = docState.current;
    const editorView = ctx.get(editorViewCtx);
    liveExecutionState.executeCodeBlocks(docState, editorView).then(() => {
      const editorView = ctx.get(editorViewCtx);
      if (codeBlockStatePlugin.getState(editorView.state)?.docState.current !== current) return;
      const tr = editorView.state.tr;
      editorView.dispatch(tr);
    });
  }

}

/**
 * @param {DocumentCodeState} docState
 * @param {number} index
 */
export function codeBlockVirtualFileName(docState, index) {
  return 'code' + (index + 1) + '.js';
}

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
function createLiveExecutionState(ctx) {

  return {
    executeCodeBlocks
  };

  /** @type {ReturnType<import('../exec-isolation').execIsolation> | undefined} */
  var isolation;

  var debounceExecTimeout;

  /**
   * @param {DocumentCodeState} docState
   * @param {import("@milkdown/prose/view").EditorView} editorView
   */
  async function executeCodeBlocks(docState, editorView) {
    clearTimeout(debounceExecTimeout);
    debounceExecTimeout = setTimeout(() => {
      executeCodeBlocksWorker(docState, editorView);
    }, 300);
  }

  /**
 * @param {DocumentCodeState} docState
 * @param {import("@milkdown/prose/view").EditorView} editorView
 */
  async function executeCodeBlocksWorker(docState, editorView) {
    const current = docState.current;

    await new Promise(resolve => setTimeout(resolve, 10));
    if (docState.current !== current) return;

    for (let iBlock = 0; iBlock < docState.blocks.length; iBlock++) {
      if (docState.current !== current) return;

      const block = docState.blocks[iBlock];
      if (block.language !== 'JavaScript') continue;

      try {
        block.executionStarted = Date.now();
        if (!isolation) isolation = execIsolation();
        block.result = await isolation.execScriptIsolated(block.code);
        if (docState.current !== current) return;

        block.executionEnded = Date.now();
        block.succeeded = true;
        // console.log('result', block);

        let resultText =
          typeof block.result === 'undefined' ? 'OK' : // '\u1d3c\u1d37' :
            typeof block.result === 'function' ? block.result.toString() :
              !block.result ? typeof block.result + (String(block.result) === typeof block.result ? '' : ' ' + String(block.result)) :
                JSON.stringify(block.result, null, 2);
        
        setResultStateContent(editorView, block, resultText, setLargeResultAreaText);

      } catch (error) {
        if (docState.current !== current) return;

        block.error = error;
        block.succeeded = false;
        // console.log('result', block);

        const errorText = error?.stack ? error.stack : String(error);

        setResultStateContent(editorView, block, errorText, setLargeResultAreaText);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

}

