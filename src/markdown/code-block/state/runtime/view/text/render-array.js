// @ts-check

import { collectColumns } from '../table/collect-columns';
import { createTableView } from '../table/create-table-view-and-toggle';
import { formatTagWidget } from './format-tags';
import { renderComposite } from './render-composite';

import './render-array.css';
// @ts-ignore
import tableIconSvg from './table-icon.svg';

/**
 * @param {import('.').ValueRenderParams<any[]>} params
 */
export function renderArray(params) {
  const columns = params.value.length > 2 ? collectColumns(params.value) : undefined;
  if (columns) {
    const toggleWidget = formatTagWidget({
      ...params,
      json: value => {
        return renderComposite({
          ...params,
          value
        });
      },
      formats: {
        table: () => {
          /** @type {ReturnType<typeof createTableView>} */
          let tableView;
          const btn = document.createElement('span');
          btn.innerHTML = tableIconSvg;
          const tableIcon = /** @type {SVGSVGElement} */(btn.querySelector('svg'));
          tableIcon.setAttribute('class', 'svg-icon-tag svg-icon-tag-table');
          tableIcon.style.width = '1.3em';
          tableIcon.style.height = '1.3em';
          const tableCaption = document.createElement('span');
          tableCaption.textContent = ' ' + params.value.length.toLocaleString() + ' rows';
          btn.appendChild(tableCaption);

          return apply;

          function apply(value) {
            const columns = collectColumns(value);
            if (!columns) return {
              preference: 0,
              button: btn,
              render: []
            };

            if (!tableView) {
              tableView = createTableView({
                ...params,
                columns,
                value
              });
            } else {
              tableView.rebind({
                ...params,
                columns,
                value
              });
            }

            return {
              preference: 1,
              button: btn,
              render: { widget: () => tableView.panel }
            };
          }
        }
      }
    });

    return toggleWidget(params.value);
  }

  return renderComposite(params);
}
