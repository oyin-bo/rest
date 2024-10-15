// @ts-check

import { collectColumns } from './table/collect-columns';
import { createTableViewAndToggle } from './table/create-table-view-and-toggle';

/**
 * @param {import('.').RenderParams<import('..').ScriptRuntimeStateSucceeded>} renderParams
 * @returns {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]}
 */
export function renderSucceeded(renderParams) {
  const { scriptState, viewState } = renderParams;
  const output = [];

  if (typeof scriptState.result?.length === 'number' && scriptState.result?.length > 2) {
    const columns = collectColumns(scriptState.result);
    if (columns) {
      /** @type {ReturnType<typeof createTableViewAndToggle> | undefined} */
      let tableView = viewState.tableView;
      if (tableView) {
        tableView.rebind({ ...renderParams, columns });
      } else {
        tableView = viewState.tableView = createTableViewAndToggle({ ...renderParams, columns });
      }
      output.push({ widget: () => tableView.panel });
    }
  }

  output.push({ class: 'success success-time execution-time', textContent: (scriptState.completed - scriptState.started) / 1000 + ' ms' });
  const result = scriptState.result;
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
