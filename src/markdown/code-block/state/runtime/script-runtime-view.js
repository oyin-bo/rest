// @ts-check

import { setLargeResultAreaTextMeta } from './plugin-runtime-service';

import './script-runtime-view.css';

/**
 * @typedef {{
 *  class: string,
 *  textContent: string,
 *  widget?: undefined
 * }} RenderedSpan
 */

/**
 * @typedef {{
 *  widget: HTMLElement,
 *  spec?: Parameters<typeof import('@milkdown/prose/view').Decoration.widget>[2],
 *  class?: undefined,
 *  textContent?: undefined
 * }} RenderedWidget
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
    /** @type {(RenderedSpan | RenderedWidget | string)[]} */
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
    let combinedText = this.renderedSpans.map(x => typeof x === 'string' ? x : (x.textContent || '')).join('');

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

    if (typeof this.scriptState.result?.length === 'number' && this.scriptState.result?.length > 2) {
      const columns = collectColumns(this.scriptState.result);
      if (columns) {
        createTableViewAndToggle(this.scriptState.result, columns);
      }

      /**
       * @param {any} result
       * @param {NonNullable<ReturnType<typeof collectColumns>>} columns
       */
      function createTableViewAndToggle(result, columns) {
        const togglePanel = document.createElement('div');
        togglePanel.className = 'success success-toggle-view-panel';
        //togglePanel.textContent = 'Toggle view';

        const tableButton = document.createElement('button');
        tableButton.className = 'success success-table-button';
        tableButton.textContent = 'Table';
        togglePanel.appendChild(tableButton);

        const jsonButton = document.createElement('button');
        jsonButton.className = 'success success-json-button';
        jsonButton.textContent = 'JSON';
        togglePanel.appendChild(jsonButton);

        const table = document.createElement('table');
        const headRow = document.createElement('tr');
        table.appendChild(headRow);

        const thIndex = document.createElement('th');
        headRow.appendChild(thIndex);

        for (const colDesc of columns) {
          const th = document.createElement('th');
          th.textContent = colDesc.key;
          headRow.appendChild(th);
        }

        let index = 0;
        for (const entry of result) {
          index++;
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

          const tr = document.createElement('tr');
          table.appendChild(tr);

          const tdIndex = document.createElement('td');
          tdIndex.style.textAlign = 'right';
          tdIndex.textContent = index.toLocaleString();
          tr.appendChild(tdIndex);

          for (const colDesc of columns) {
            const td = document.createElement('td');
            td.textContent = entry[colDesc.key];
            if (colDesc.bestType === 'number')
              td.style.textAlign = 'right';
            tr.appendChild(td);
          }
        }
        togglePanel.appendChild(table);

        output.push({ widget: togglePanel });

        var tableViewSelected = false;

        reflectTableViewSelectionToggle();

        tableButton.onclick = () => {
          tableViewSelected = true;
          reflectTableViewSelectionToggle();
        };
        jsonButton.onclick = () => {
          tableViewSelected = false;
          reflectTableViewSelectionToggle();
        };

        function reflectTableViewSelectionToggle() {
          if (tableViewSelected) {
            tableButton.classList.add('selected');
            jsonButton.classList.remove('selected');
            table.style.display = 'block';
          } else {
            tableButton.classList.remove('selected');
            jsonButton.classList.add('selected');
            table.style.display = 'none';
          }
        }
      }

      /** @param {any[]} array */
      function collectColumns(array) {
        /** @type {Record<string, { key: string, types: Record<string, number>, bestType?: string }>} */
        const columns = {};
        let nullRows = 0;
        let valueRows = 0;
        let arrayRows = 0;

        for (const entry of array) {
          if (!entry && typeof entry !== 'string') {
            nullRows++;
            continue;
          }
          if (typeof entry !== 'object') {
            valueRows++;
            continue;
          }
          if (Array.isArray(entry)) {
            arrayRows++;
            continue;
          }

          for (const key in entry) {
            const colDesc = columns[key] || (columns[key] = { key, types: {} });
            const value = entry[key];
            const type =
              value == null ? 'null' :
                typeof value !== 'object' ? typeof value :
                  Array.isArray(value) ? 'array' :
                    'object';

            colDesc.types[type] = (colDesc.types[type] || 0) + 1;
          }
        }

        // not a coherent array of objects
        if (nullRows > array.length / 2 || valueRows > array.length / 4 || arrayRows > array.length / 4)
          return undefined;

        for (const colDesc of Object.values(columns)) {
          const types = Object.entries(colDesc.types);
          types.sort(([type1, count1], [type2, count2]) => count2 - count1);

          colDesc.bestType = types[0][0];
        }

        const columnsWithConsistentData = Object.values(columns).filter(
          colDesc =>
            colDesc.types[colDesc.bestType || ''] > array.length / 10
        );

        if (columnsWithConsistentData.length < 2)
          return;

        return columnsWithConsistentData;
      }
    }

    output.push({ class: 'success success-time execution-time', textContent: (this.scriptState.completed - this.scriptState.started) / 1000 + ' ms' });
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
    return output;
  }

  /** @this {ScriptRuntimeView & {scriptState: import('.').ScriptRuntimeStateFailed }} */
  renderFailed() {
    const output = [];
    output.push({ class: 'fail fail-time execution-time', textContent: (this.scriptState.completed - this.scriptState.started) / 1000 + ' ms' });
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
