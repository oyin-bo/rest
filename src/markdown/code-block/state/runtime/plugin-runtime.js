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
import { ExecutiveManager } from './executive-manager';

/**
 * @typedef {{
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
 *  executionStates: CodeBlockState[], 
 * }} DocumentCodeState
 */

export const setLargeResultAreaTextMeta = 'setLargeResultAreaText';

const pluginKey = new PluginKey('CODEBLOCK_RUNTIME');

export const codeBlockRuntimePlugin = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta(setLargeResultAreaTextMeta)) return true;

      return !modifiesExecutionStateBlocks(tr);
    },
    state: {
      init: (config, editorState) => new ExecutiveManager(config, editorState),
      apply: (tr, pluginState, oldEditorState, newEditorState) => {
        pluginState.apply(tr, oldEditorState, newEditorState);
        return pluginState;
      }
    },
  view: editorView => {
    const pluginState = codeBlockRuntimePlugin.getState(editorView.state);
    pluginState?.initEditorView(editorView);
      return {};
    }
  });
