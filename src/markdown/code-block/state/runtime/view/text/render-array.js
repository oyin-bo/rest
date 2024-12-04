// @ts-check

import { createChart } from '../chart/create-chart';
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
  if (window['render-array-new'] || /render-array-new/i.test(window.name || '')) {
    return renderArrayNew(params);
  }

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

export function renderArrayNew(params) {
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
      formats:
      {
        chart: createChartFormatter,
        table: createTableFormatter
      }
    });

    return toggleWidget(params.value);
  }

  return renderComposite(params);

  function createChartFormatter() {

    const btn = document.createElement('span');
    btn.textContent = '📈';
    const chartPanel = document.createElement('div');
    chartPanel.textContent = 'Chart placeholder';

    /** @type {ReturnType<typeof createTableView>} */
    var chartView;
    return apply;

    function apply(value) {
      const columns = collectColumns(value);
      let chartDetected;
      if (columns) {
        let names = [];
        const dates = [];
        const numbers = [];
        for (const colSpec of columns.leafColumns) {
          if (colSpec.nameLike) names.push(colSpec);
          if (colSpec.dateLike) dates.push(colSpec);
          if (colSpec.bestType === 'number' &&
            colSpec.types.number &&
            colSpec.types.number.min !== colSpec.types.number.max) numbers.push(colSpec);
        }

        if (numbers.length) {
          chartDetected = true;
        }
      }

      if (!columns || !chartDetected) {
        return {
          preference: 0,
          button: btn,
          render: []
        };
      }

      if (!chartView) {
        chartView = createChart({
          value: params.value,
          columns,
          indent: params.indent,
          invalidate: params.invalidate
        });
        if (chartPanel.firstElementChild !== chartView.panel) {
          chartPanel.textContent = '';
          chartPanel.appendChild(chartView.panel);
        }
      } else {
        chartView.rebind({
          value: params.value,
          columns,
          indent: params.indent
        });
      }

      return {
        preference: 0.5,
        button: btn,
        render: { widget: () => chartPanel }
      };
    }
  }

  function createTableFormatter() {

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
