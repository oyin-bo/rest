// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';

import { codeBlockExecutionState } from '../schema';
import { findCodeBlocks, findOverlappingCodeBlocks, getTransactionCodeBlocks } from '../state-block-regions/find-code-blocks';
import { modifiesExecutionStateBlocks } from './modifies-execution-state-blocks';
import { execIsolation } from './exec-isolation';

/**
 * @typedef {import('../state-block-regions/find-code-blocks').CodeBlockNodeset & {
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
   * @param {import("../state-block-regions/find-code-blocks").CodeBlockNodeset[]} newCodeBlockNodes
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
    liveExecutionState.executeCodeBlocks(docState).then(() => {
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

  /** @type {ReturnType<import('./exec-isolation').execIsolation> | undefined} */
  var isolation;

  var debounceExecTimeout;

  /**
   * @param {DocumentCodeState} docState
   */
  async function executeCodeBlocks(docState) {
    clearTimeout(debounceExecTimeout);
    debounceExecTimeout = setTimeout(() => {
      executeCodeBlocksWorker(docState);
    }, 300);
  }

  /**
 * @param {DocumentCodeState} docState
 */
  async function executeCodeBlocksWorker(docState) {
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
        
        setResultStateText(docState, block, resultText);

      } catch (error) {
        if (docState.current !== current) return;

        block.error = error;
        block.succeeded = false;
        // console.log('result', block);

        const errorText = error?.stack ? error.stack : String(error);

        setResultStateText(docState, block, errorText);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * @param {DocumentCodeState} docState
  * @param {CodeBlockState} block
  * @param {string} text
  */
  function setResultStateText(docState, block, text) {
    const editorView = ctx.get(editorViewCtx);
    if (block.executionState) {
      const tr = text ?
        editorView.state.tr
          .replaceRangeWith(
            block.executionState.pos + 1,
            block.executionState.pos + block.executionState.node.nodeSize - 1,
            editorView.state.schema.text(text)) :
        editorView.state.tr
          .deleteRange(block.executionState.pos + 1,
            block.executionState.pos + block.executionState.node.nodeSize - 1);
      tr.setMeta(setLargeResultAreaText, true);
      tr.setMeta('addToHistory', false);

      editorView.dispatch(tr);
      // console.log('replaced execution_state with result ', tr);
    } else {
      const newExecutionStateNode = codeBlockExecutionState.type(ctx).create(
        {},
        !text ? undefined : editorView.state.schema.text(text));

      const tr = editorView.state.tr
        .insert(
          block.script.pos + block.script.node.nodeSize,
          newExecutionStateNode);
      tr.setMeta(setLargeResultAreaText, true);
      tr.setMeta('addToHistory', false);
      editorView.dispatch(tr);
    }

    const updatedCodeBlockLocations = findCodeBlocks(editorView.state.doc);
    for (let i = 0; i < docState.blocks.length; i++) {
      docState.blocks[i].block = updatedCodeBlockLocations[i].block;
      docState.blocks[i].backtick = updatedCodeBlockLocations[i].backtick;
      docState.blocks[i].script = updatedCodeBlockLocations[i].script;
      docState.blocks[i].executionState = updatedCodeBlockLocations[i].executionState;
    }
  }
}

