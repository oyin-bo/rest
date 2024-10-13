// @ts-check

import { setLargeResultAreaTextMeta } from './plugin-runtime-service';
import { setResultStateContent, setResultStateContentToTransaction } from './set-result-state-content';

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
    /** @type {(string | { class: string, textContent: string })[]} */
    const output = [];

    switch (this.scriptState.phase) {
      case 'unknown':
        output.push({ class: 'low', textContent: 'unknown'});
        break;

      case 'parsed':
        output.push({ class: 'low', textContent: '..' });
        break;

      case 'executing':
        output.push({ class: 'low low-executing', textContent: '...' });
        break;

      case 'succeeded':
        {
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
        }
        break;

      case 'failed':
        {
          const error = this.scriptState.error;
          if (!error || !(error instanceof Error)) {
            output.push({ class: 'fail fail-exotic', textContent: typeof error + ' ' + JSON.stringify(error) });
          } else {
            let stack = error.stack;
            let wholeText = String(error);
            const message = error.message;

            let title = '';
            let subtitle = message;
            let details = '';

            if (!stack || wholeText.indexOf(stack) < 0) {
              title = message.split('\n')[0];
              details = message.slice(title.length);
            } else {
              title = wholeText.slice(0, wholeText.indexOf(stack));
              details = wholeText.slice(title.length);
              if (title.indexOf(message) >= 0) {
                subtitle = message;
                title = title.slice(0, title.indexOf(message));
              }
            }

            if (title)
              output.push({ class: 'fail fail-error fail-error-title', textContent: title });
            if (subtitle)
              output.push({ class: 'fail fail-error fail-error-subtitle', textContent: subtitle });
            if (details)
              output.push({ class: 'fail fail-error fail-error-details', textContent: details });
          }
        }
        break;
    }

    // TODO: make highlights here!
    let combinedText = output.map(x => typeof x === 'string' ? x : x.textContent).join('');

    setResultStateContentToTransaction(
      this.editorView.state,
      tr,
      this.codeBlockRegion,
      combinedText,
      setLargeResultAreaTextMeta);
  }
}