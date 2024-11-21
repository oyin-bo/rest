// @ts-check

import { renderComposite } from './render-composite';
import { collectColumns } from '../table/collect-columns';
import { createTableView } from '../table/create-table-view-and-toggle';

import './render-array.css';
import { indent } from '@milkdown/kit/plugin/indent';

/**
 * @param {import('.').ValueRenderParams<any[]>} params
 */
export function renderArray(params) {
  const columns = params.value.length > 2 ? collectColumns(params.value) : undefined;
  if (columns) {
    /** @type {'json' | 'table'} */
    let arrayViewType = params.state[params.path + '.arrayViewType'] ?? 'table';

    const toggleWidget = {
      widget: () => {
        const togglePanel = document.createElement('span');
        togglePanel.className = 'inline-view-toggle-panel';
        const tableButton = document.createElement('button');
        tableButton.textContent = 'T';
        tableButton.className =
          'inline-view-toggle-button inline-view-toggle-button-table' +
        (arrayViewType !== 'table' ? '' :
            ' inline-view-toggle-button-selected inline-view-toggle-button-table-selected');
        togglePanel.appendChild(tableButton);
        tableButton.onclick = () => {
          params.state[params.path + '.arrayViewType'] = 'table';
          params.invalidate();
        };

        const jsonButton = document.createElement('button');
        jsonButton.textContent = '{' + params.value.length + '}';
        jsonButton.className =
          'inline-view-toggle-button inline-view-toggle-button-json' +
        (arrayViewType !== 'json' ? '' :
            ' inline-view-toggle-button-selected inline-view-toggle-button-json-selected');
        togglePanel.appendChild(jsonButton);
        jsonButton.onclick = () => {
          params.state[params.path + '.arrayViewType'] = 'json';
          params.invalidate();
        };

        return togglePanel;
      }
    };

    /** @type {ReturnType<typeof createTableView>} */
    let tableView = params.state[params.path + '.tableView'];
    if (tableView) {
      if (arrayViewType) {
        tableView.rebind({
          value: params.value,
          indent: params.indent,
          columns
        });
      }
    } else {
      tableView = createTableView({
        value: params.value,
        indent: params.indent,
        columns,
        invalidate: params.invalidate
      });
      params.state[params.path + '.tableViewAndToggle'] = tableView;
    }

    /** @type {import('..').RenderedContent[]} */
    let output = [toggleWidget];
    if (arrayViewType === 'table') output.push({ widget: () => tableView.panel });

    if (arrayViewType === 'table') {
      params.wrap.availableHeight = 4;
    } else {
      output = output.concat(renderComposite(params));
    }

    return output;
  }

  return renderComposite(params);
}
