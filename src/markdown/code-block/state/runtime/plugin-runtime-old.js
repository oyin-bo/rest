// @ts-check

import { defaultValueCtx, editorStateCtx, editorView, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';

import { codeBlockExecutionState } from '../../schema';
import { findCodeBlocks, findOverlappingCodeBlocks, getTransactionCodeBlocks } from '../../state-block-regions/find-code-blocks';
import { modifiesExecutionStateBlocks } from '../modifies-execution-state-blocks';
import { execIsolation } from '../exec-isolation';
import { setResultStateContent } from './set-result-state-content';
import { createRemoteExecutionRuntime } from './remote-execution-runtime';

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

export const setLargeResultAreaTextMeta = 'setLargeResultAreaText';

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
export function createOldCodeBlockRuntimePlugin(ctx) {
  const pluginKey = new PluginKey('CODE_BLOCK_RUNTIME');
  const codeBlockStatePlugin = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta(setLargeResultAreaTextMeta)) return true;

      return !modifiesExecutionStateBlocks(tr);
    },
    state: {
      init: () => /** @type {{ docState: DocumentCodeState } | null} */(null),
      apply: (tr, prev) => {
        if (tr.getMeta(setLargeResultAreaTextMeta)) return prev;

        if (!prev) {
          const docState = { current: 0, blocks: findCodeBlocks(tr.doc) };
          runCodeBlocks(ctx, tr.doc, docState);
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
          return runCodeBlocks(ctx, doc, docState);

        return;
      }
    }

    docState.current++;
    const prevBlocks = docState.blocks;
    docState.blocks = newCodeBlockNodes;

    return runCodeBlocks(ctx, doc, docState);
  }

  /** @type {ReturnType<typeof createRemoteExecutionRuntime> | undefined} */
  var liveExecutionState;

  /**
* @param {import("@milkdown/ctx").Ctx} ctx
* @param {import("prosemirror-model").Node} doc
* @param {DocumentCodeState} docState
*/
  function runCodeBlocks(ctx, doc, docState) {
    if (!liveExecutionState) liveExecutionState = createRemoteExecutionRuntime();
    const current = docState.current;
    const editorView = ctx.get(editorViewCtx);
    liveExecutionState.executeCodeBlocks(editorView).then(() => {
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
