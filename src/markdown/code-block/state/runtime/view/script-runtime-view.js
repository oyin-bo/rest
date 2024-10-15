// @ts-check

import { Decoration } from '@milkdown/prose/view';
import { setLargeResultAreaTextMeta } from '../plugin-runtime-service';
import { renderExecuting } from './render-executing';
import { renderFailed } from './render-failed';
import { renderParsed } from './render-parsed';
import { renderSucceeded } from './render-succeeded';
import { renderUnknown } from './render-unknown';

import './script-runtime-view.css';

export class ScriptRuntimeView {
  /**
   * @param {{
   *  scriptState: import('..').ScriptRuntimeState,
   *  runtime: import('..').ExecutionRuntime | undefined,
   *  codeBlockRegion: import('../../../state-block-regions/find-code-blocks').CodeBlockNodeset,
   *  immediateTransaction: import('@milkdown/prose/state').Transaction,
   *  schema: import('@milkdown/prose/model').Schema,
   *  invalidate: () => void
   * }} _
   */
  constructor({ scriptState, runtime, codeBlockRegion, immediateTransaction, schema, invalidate }) {
    this.scriptState = scriptState;
    this.runtime = runtime;
    this.codeBlockRegion = codeBlockRegion;
    /** @type {(import('.').RenderedSpan | import('.').RenderedWidget | string)[]} */
    this.renderedSpans = [];

    /** @type {Record<string, any>} */
    this.viewState = {};

    this.reflectState(immediateTransaction, schema, invalidate);
  }

  /**
   * @param {{
   *  scriptState: import('..').ScriptRuntimeState,
   *  runtime: import('..').ExecutionRuntime | undefined,
   *  codeBlockRegion: import('../../../state-block-regions/find-code-blocks').CodeBlockNodeset,
   *  immediateTransaction: import('@milkdown/prose/state').Transaction,
   *  schema: import('@milkdown/prose/model').Schema,
   *  invalidate: () => void
   * }} _
   */
  updateScriptState({ scriptState, runtime, codeBlockRegion, immediateTransaction, schema, invalidate }) {
    this.scriptState = scriptState;
    this.codeBlockRegion = codeBlockRegion;
    this.runtime = runtime;

    this.reflectState(immediateTransaction, schema, invalidate);
  }

  destroy() {
    // TODO: shutdown any live updates
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/model').Schema} schema
   * @param {(callback: (tr: import('@milkdown/prose/state').Transaction, schema: import('@milkdown/prose/model').Schema) => void) => void} invalidate
   */
  reflectState(tr, schema, invalidate) {
    // const renderedSpansIteration =
    //   this.renderedSpansIteration =
    //   (this.renderedSpansIteration || 0) + 1;

    const reflectAndInvalidate = () => {
      // if (this.renderedSpansIteration !== renderedSpansIteration) return;
      invalidate((tr, schema) => {
        this.reflectState(tr, schema, reflectAndInvalidate);
      });
    };
    this.renderedSpans = this.renderExecutionState(reflectAndInvalidate);

    let combinedText = this.renderedSpans.map(x => typeof x === 'string' ? x : (x.textContent || '')).join('');

    setResultStateContentToTransaction(
      schema,
      tr,
      this.codeBlockRegion,
      combinedText);
  }

  getDecorations() {
    if (!this.codeBlockRegion.executionState) return;

    /** @type {Decoration[] | undefined} */
    let decorations;

    let pos = this.codeBlockRegion.executionState.pos + 1;
    for (const span of this.renderedSpans) {
      if (typeof span === 'string') {
        pos += span.length;
        continue;
      }

      if (span.widget) {
        const deco = Decoration.widget(
          pos,
          span.widget,
          span.spec);
        if (!decorations) decorations = [];
        decorations.push(deco);
      } else {
        const deco = Decoration.inline(
          pos,
          pos + span.textContent.length,
          {
            class: span.class
          });
        pos += span.textContent.length;
        if (!decorations) decorations = [];
        decorations.push(deco);
      }
    }

    return decorations;
  }

  /** @param {() => void} invalidate */
  renderExecutionState(invalidate) {
    switch (this.scriptState.phase) {
      case 'unknown': return renderUnknown({ scriptState: this.scriptState, viewState: this.viewState, invalidate });
      case 'parsed': return renderParsed({ scriptState: this.scriptState, viewState: this.viewState, invalidate });
      case 'executing': return renderExecuting({ scriptState: this.scriptState, viewState: this.viewState, invalidate });
      case 'succeeded': return renderSucceeded({ scriptState: this.scriptState, viewState: this.viewState, invalidate });
      case 'failed': return renderFailed({ scriptState: this.scriptState, viewState: this.viewState, invalidate });
    }
  }
}

/**
 * @param {import('@milkdown/prose/model').Schema} schema
 * @param {import('@milkdown/prose/state').Transaction} tr
 * @param {import('../../../state-block-regions/find-code-blocks').CodeBlockNodeset} block
 * @param {string} text
 */
function setResultStateContentToTransaction(schema, tr, block, text) {
  if (block.executionState) {
    if (block.executionState.node.textContent === text) return;
    const startPos = tr.mapping.map(block.executionState.pos + 1);
    const endPos = tr.mapping.map(block.executionState.pos + block.executionState.node.nodeSize - 1);

    tr = text ?
      tr.replaceRangeWith(
        startPos,
        endPos,
        schema.text(text)) :
      tr.deleteRange(
        startPos,
        endPos);
    tr.setMeta('set result state text', { text, block });
    tr.setMeta(setLargeResultAreaTextMeta, true);
    tr.setMeta('addToHistory', false);

    return tr;
    // console.log('replaced execution_state with result ', tr);
  } else {
    const nodeType = schema.nodes['code_block_execution_state'];
    const newExecutionStateNode = nodeType.create(
      {},
      !text ? undefined : schema.text(text));

    const insertPos = tr.mapping.map(block.script.pos + block.script.node.nodeSize);

    tr = tr
      .insert(
        insertPos,
        newExecutionStateNode);
    tr.setMeta('create result state block and set its value', { text, block });
    tr.setMeta(setLargeResultAreaTextMeta, true);
    tr.setMeta('addToHistory', false);
    return tr;
  }
}
