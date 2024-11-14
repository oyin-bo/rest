// @ts-check

import { collectColumns } from './table/collect-columns';
import { createTableViewAndToggle } from './table/create-table-view-and-toggle';
import { renderObject } from './text/render-object';

/**
 * @param {import('.').RenderParams<import('..').ScriptRuntimeStateSucceeded>} renderParams
 * @returns {(import('.').RenderedContent)[]}
 */
export function renderSucceeded(renderParams) {
  const { scriptState, viewState, invalidate } = renderParams;

  /**
   * @type {(import('.').RenderedContent)[]}
   */
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

  output.push({ class: 'success success-time execution-time', textContent: (scriptState.completed - scriptState.started) / 1000 + 's ' });
  if (!viewState.tableViewSelected)
    renderObject(scriptState.result, output, invalidate, viewState);

  return output;
}
