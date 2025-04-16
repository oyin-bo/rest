// @ts-check

// import { calcTotals } from './calc-totals';
import { createAgGridTable, gridHeightForRowsAndColumns } from './create-ag-grid-table';
import { createHtmlTable } from './create-html-table';
import { loadAgGrid } from './load-ag-grid';

/**
 * @param {{
 *  value: any[],
 *  columns: NonNullable<ReturnType<import('./collect-columns').collectColumns>>,
 *  indent: string,
 *  tableCaption?: HTMLElement
 * }} _
 */
export function createTableView({ value, columns, indent, tableCaption }) {
  const tablePanel = document.createElement('div');
  tablePanel.className = 'table-view-panel';
  tablePanel.style.paddingLeft = (indent.length * 0.4).toFixed(2) + 'em';

  /** @type {ReturnType<typeof createAgGridTable>} */
  let createdGrid;
  let rebindAgGrid;
  let resizeAgGridColumns;
  let table;

  rebindGrids();

  return {
    panel: tablePanel,
    rebind
  };

  /** @param {any[]} visibleRowSet */
  function handleVisibleRowSetUpdated(visibleRowSet) {
    if (!tableCaption) return;
    const tableCaptionText = value.length === visibleRowSet.length ?
      value.length.toLocaleString() + ' rows' :
      visibleRowSet.length.toLocaleString() + ' of ' + value.length.toLocaleString() + ' rows';
    tableCaption.textContent = ' ' + tableCaptionText;
  }

  function rebindGrids() {
    if (createdGrid) {
      createdGrid.rebindGrid(columns, value);
      createdGrid.onVisibleRowSetUpdated = handleVisibleRowSetUpdated;
      table.style.height = gridHeightForRowsAndColumns(value.length, columns);
      return;
    }

    const agGridOrPromise = loadAgGrid();
    if (typeof agGridOrPromise.then === 'function') {
      agGridOrPromise.then(agGrid => {
        if (createdGrid?.agGridInstance) return;
        table.remove();
        if (!tablePanel.parentElement) return;

        createdGrid = createAgGridTable(columns, value, agGrid);
        createdGrid.onVisibleRowSetUpdated = handleVisibleRowSetUpdated;
        table = createdGrid.containerElement;
        rebindAgGrid = createdGrid.rebindGrid;
        resizeAgGridColumns = createdGrid.resizeAgGridColumns;
        tablePanel.appendChild(table);
        resizeAgGridColumns?.();
     });

      table?.remove();
      let limitColumns = columns;
      if (limitColumns.length > 20) limitColumns.length = 20;

      let limitRows = value;
      if (limitRows.length > 80) limitRows = limitRows.slice(0, 80);

      table = createHtmlTable(limitColumns, limitRows);
      tablePanel.appendChild(table);
    } else {
      table?.remove();
      createdGrid = createAgGridTable(columns, value, agGrid);
      createdGrid.onVisibleRowSetUpdated = handleVisibleRowSetUpdated;
      table = createdGrid.containerElement;
      tablePanel.appendChild(table);
      resizeAgGridColumns?.();
    }
  }

  /** @param {Omit<Parameters<typeof createTableView>[0], 'invalidate'>} args */
  function rebind(args) {
    // no need to rebind aggressively on same value
    if (args.value === value && columns.length === args.columns.length) return;
    value = args.value;
    columns = args.columns;
    tableCaption = args.tableCaption;

    rebindGrids();
  }
}
