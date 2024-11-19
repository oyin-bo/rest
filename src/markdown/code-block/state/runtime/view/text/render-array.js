// @ts-check

import { renderComposite } from './render-composite';
import { collectColumns } from '../table/collect-columns';
import { createTableViewAndToggle } from '../table/create-table-view-and-toggle';

import './render-array.css';

/**
 * @param {import('.').ValueRenderParams<any[]>} params
 */
export function renderArray(params) {
  const columns = params.value.length > 2 ? collectColumns(params.value) : undefined;
  if (columns) {
    let viewState = params.state[params.path + '.tableViewAndToggle_state'] ||
      (params.state[params.path + '.tableViewAndToggle_state'] = { tableViewSelected: true });

    /** @type {ReturnType<typeof createTableViewAndToggle>} */
    let tableView = params.state[params.path + '.tableViewAndToggle'];
    if (tableView) {
      if (viewState.tableViewSelected) {
        tableView.rebind({
          scriptState: { result: params.value },
          viewState,
          columns
        });
      }
    } else {
      const viewState = {};
      tableView = createTableViewAndToggle({
        scriptState: { result: params.value },
        viewState,
        columns,
        invalidate: params.invalidate
      });
      params.state[params.path + '.tableViewAndToggle'] = tableView;
    }

    /** @type {import('..').RenderedContent[]} */
    let output = [{ widget: () => tableView.panel }];
    if (viewState.tableViewSelected) {
      params.wrap.availableHeight = 1;
    } else {
      output = output.concat(renderComposite(params));
    }

    return output;
  }

  return renderComposite(params);
}
