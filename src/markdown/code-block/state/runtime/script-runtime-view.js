// @ts-check

import { setLargeResultAreaTextMeta } from './plugin-runtime-service';

import './script-runtime-view.css';

/**
 * @typedef {{
 *  class: string,
 *  textContent: string
 * }} RenderedSpan
 */

export class ScriptRuntimeView {
  /**
   * @param {{
   *  editorView: import('@milkdown/prose/view').EditorView,
   *  scriptState: import('.').ScriptRuntimeState,
   *  runtime: import('.').ExecutionRuntime | undefined,
   *  codeBlockRegion: import('../../state-block-regions/find-code-blocks').CodeBlockNodeset,
   *  immediateTransaction: import('@milkdown/prose/state').Transaction
   * }} _
   */
  constructor({ editorView, scriptState, runtime, codeBlockRegion, immediateTransaction }) {
    this.editorView = editorView;
    this.scriptState = scriptState;
    this.runtime = runtime;
    this.codeBlockRegion = codeBlockRegion;
    /** @type {(RenderedSpan | string)[]} */
    this.renderedSpans = [];
    this.reflectState(immediateTransaction);
  }

  /**
   * @param {{
   *  scriptState: import('.').ScriptRuntimeState,
   *  runtime: import('.').ExecutionRuntime | undefined,
   *  codeBlockRegion: import('../../state-block-regions/find-code-blocks').CodeBlockNodeset,
   *  immediateTransaction: import('@milkdown/prose/state').Transaction
   * }} _
   */
  updateScriptState({ scriptState, runtime, codeBlockRegion, immediateTransaction }) {
    this.scriptState = scriptState;
    this.codeBlockRegion = codeBlockRegion;
    this.runtime = runtime;

    this.reflectState(immediateTransaction);
  }

  destroy() {
    // TODO: shutdown any live updates
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   */
  reflectState(tr) {
    this.renderedSpans = this.renderExecutionState();

    // TODO: make highlights here!
    let combinedText = this.renderedSpans.map(x => typeof x === 'string' ? x : x.textContent).join('');

    setResultStateContentToTransaction(
      this.editorView.state,
      tr,
      this.codeBlockRegion,
      combinedText);
  }

  renderExecutionState() {
    /** @type {typeof this.renderedSpans} */
    const output = [];

    switch (this.scriptState.phase) {
      case 'unknown': return this.renderUnknown();

      case 'parsed': return this.renderParsed();

      case 'executing': return this.renderExecuting();

      case 'succeeded':
        return /** @type {ScriptRuntimeView & {scriptState: import('.').ScriptRuntimeStateSucceeded }} */(this).renderSucceeded();

      case 'failed':
        return /** @type {ScriptRuntimeView & {scriptState: import('.').ScriptRuntimeStateFailed }} */(this).renderFailed();
    }

    return output;
  }

  renderUnknown() {
    return [{ class: 'low', textContent: 'unknown' }];
  }

  renderParsed() {
    return [{ class: 'low', textContent: '..' }];
  }

  renderExecuting() {
    return [{ class: 'low low-executing', textContent: '...' }];
  }

  /** @this {ScriptRuntimeView & {scriptState: import('.').ScriptRuntimeStateSucceeded }} */
  renderSucceeded() {
    const output = [];
    const result = this.scriptState.result;
    if (typeof result === 'undefined') {
      output.push({ class: 'success success-quiet', textContent: 'OK' });
    } else if (typeof result === 'function') {
      const functionStr = String(result).trim();
      const firstLineEnd = functionStr.indexOf('\n');
      if (firstLineEnd < 0) {
        output.push({ class: 'success success-function', textContent: functionStr });
      } else {
        output.push({ class: 'success success-function', textContent: functionStr.slice(0, firstLineEnd) });
        output.push({ class: 'success success-function success-function-more', textContent: functionStr.slice(firstLineEnd) });
      }
    } else if (!result) {
      if (typeof result === 'string') {
        output.push({ class: 'success success-string', textContent: '""' });
      } else {
        output.push({ class: 'success success-value', textContent: String(result) });
      }
    } else {
      try {
        output.push({ class: 'success success-json', textContent: JSON.stringify(result, null, 2) });
      } catch {
        try {
          output.push({ class: 'success success-tostring', textContent: String(result) });
        } catch (toStringError) {
          output.push({ class: 'success success-tostring-error', textContent: toStringError.message.split('\n')[0] });
        }
      }
    }
    output.push(' ');
    output.push({ class: 'success success-time execution-time', textContent: `(${(this.scriptState.completed - this.scriptState.started) / 1000}ms)` });
    return output;
  }

  /** @this {ScriptRuntimeView & {scriptState: import('.').ScriptRuntimeStateFailed }} */
  renderFailed() {
    const output = [];
    const error = this.scriptState.error;
    if (!error || !(error instanceof Error)) {
      output.push({ class: 'fail fail-exotic', textContent: typeof error + ' ' + JSON.stringify(error) });
    } else {
      let wholeText = String(error).length > (error.stack || '').length ? String(error) : (error.stack || '');

      let title = wholeText.split('\n')[0];
      let subtitle = '';
      let details = wholeText.slice(title.length);

      if (title.indexOf(error.message) >= 0) {
        title = title.slice(0, title.indexOf(error.message));
        subtitle = error.message;
      }

      if (title)
        output.push({ class: 'fail fail-error fail-error-title', textContent: title });
      if (subtitle)
        output.push({ class: 'fail fail-error fail-error-subtitle', textContent: subtitle });
      if (details)
        output.push({ class: 'fail fail-error fail-error-details', textContent: details });
    }

    return output;
  }
}

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {import('@milkdown/prose/state').Transaction} tr
 * @param {import('../../state-block-regions/find-code-blocks').CodeBlockNodeset} block
 * @param {string} text
 */
function setResultStateContentToTransaction(editorState, tr, block, text) {
  if (block.executionState) {
    const startPos = tr.mapping.map(block.executionState.pos + 1);
    const endPos = tr.mapping.map(block.executionState.pos + block.executionState.node.nodeSize - 1);

    tr = text ?
      tr.replaceRangeWith(
        startPos,
        endPos,
        editorState.schema.text(text)) :
      tr.deleteRange(
        startPos,
        endPos);
    tr.setMeta('set result state text', { text, block });
    tr.setMeta(setLargeResultAreaTextMeta, true);
    tr.setMeta('addToHistory', false);

    return tr;
    // console.log('replaced execution_state with result ', tr);
  } else {
    const nodeType = editorState.schema.nodes['code_block_execution_state'];
    const newExecutionStateNode = nodeType.create(
      {},
      !text ? undefined : editorState.schema.text(text));

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
