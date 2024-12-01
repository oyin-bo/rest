// @ts-check

import { createAgGridColumns, createAgGridTable, gridHeightForRowsAndColumns } from './create-ag-grid-table';
import { createHtmlTable } from './create-html-table';
import { getAgGrid } from './global-ag-grid';

/**
 * @param {{
 *  value: any[],
 *  columns: NonNullable<ReturnType<import('./collect-columns').collectColumns>>,
 *  indent: string,
 *  invalidate: () => void
 * }} _
 */
export function createTableView({ value, columns, indent, invalidate }) {
  const tablePanel = document.createElement('div');
  tablePanel.className = 'table-view-panel';
  tablePanel.style.paddingLeft = (indent.length * 0.4).toFixed(2) + 'em';

  /** @type {import('ag-grid-community').GridApi} */
  let agGridInstance;
  let table;

  rebindGrids();

  return {
    panel: tablePanel,
    rebind
  };

  function rebindGrids() {
    if (agGridInstance) {
      /** @type {import('ag-grid-community').ColDef[]} */
      const columnDefs = createAgGridColumns(columns);
      const needsResize = agGridInstance.getGridOption('columnDefs')?.length !== columnDefs.length;

      const liveColumns = agGridInstance.getColumns();
      if (!needsResize && liveColumns?.length) {
        const columnDefsByKey = new Map(columnDefs.map(col => [col.field, col]));
        for (const col of liveColumns) {
          const w = col.getActualWidth();
          const colDef = columnDefsByKey.get(col.getColId());
          if (colDef && w) {
            colDef.width = w;
          }
        }
      }

      agGridInstance.updateGridOptions({
        columnDefs,
        rowData: value
      });
      if (needsResize) resizeGridColumns();

      table.style.height = gridHeightForRowsAndColumns(value.length, columns);
      return;
    }

    const agGridOrPromise = getAgGrid();
    if (typeof agGridOrPromise.then === 'function') {
      agGridOrPromise.then(agGrid => {
        if (agGridInstance) return;
        table.remove();
        if (!tablePanel.parentElement) return;

        const createdGrid = createAgGridTable(columns, value, agGrid);
        table = createdGrid.containerElement;
        agGridInstance = createdGrid.agGrid;
        tablePanel.appendChild(table);
        resizeGridColumns();
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
      const createdGrid = createAgGridTable(columns, value, agGrid);
      table = createdGrid.containerElement;
      agGridInstance = createdGrid.agGrid;
      tablePanel.appendChild(table);
      resizeGridColumns();
    }
  }

  var debounceAutosize;
  function resizeGridColumns() {
    clearTimeout(debounceAutosize);
    debounceAutosize = setTimeout(() => {
      agGridInstance.autoSizeAllColumns();
    }, 1);
  }

  /** @param {Omit<Parameters<typeof createTableView>[0], 'invalidate'>} args */
  function rebind(args) {
    // no need to rebind aggressively on same value
    if (args.value === value && columns.length === args.columns.length) return;
    value = args.value;
    columns = args.columns;

    rebindGrids();
  }
}
