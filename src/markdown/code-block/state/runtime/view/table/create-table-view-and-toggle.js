// @ts-check

import { createAgGridColumns, createAgGridTable, gridHeightForRowsAndColumns } from './create-ag-grid-table';
import { createHtmlTable } from './create-html-table';
import { getAgGrid } from './global-ag-grid';

/**
 * @param {{
 *  value: any[],
 *  state: Record<string, any>,
 *  columns: NonNullable<ReturnType<import('./collect-columns').collectColumns>>,
 *  invalidate: () => void
 * }} _
 */
export function createTableViewAndToggle({ value, state, columns, invalidate }) {
  const togglePanel = document.createElement('div');
  togglePanel.className = 'success success-toggle-view-panel';
  //togglePanel.textContent = 'Toggle view';c

  const tableButton = document.createElement('button');
  tableButton.className = 'success success-table-button';
  tableButton.textContent = 'Table';
  togglePanel.appendChild(tableButton);

  const jsonButton = document.createElement('button');
  jsonButton.className = 'success success-json-button';
  jsonButton.textContent = 'JSON';
  togglePanel.appendChild(jsonButton);

  const totalsLabel = document.createElement('span');
  totalsLabel.className = 'success success-totals-label';
  totalsLabel.textContent = value.length.toLocaleString() + ' rows';
  togglePanel.appendChild(totalsLabel);

  /** @type {import('ag-grid-community').GridApi} */
  let agGridInstance;
  let table;

  if (typeof state.tableViewSelected === 'undefined')
    state.tableViewSelected = true;

  rebindGrids();

  reflectTableViewSelectionToggle();

  tableButton.onclick = () => {
    state.tableViewSelected = true;
    reflectTableViewSelectionToggle();
    invalidate();
  };
  jsonButton.onclick = () => {
    state.tableViewSelected = false;
    reflectTableViewSelectionToggle();
    invalidate();
  };

  return {
    panel: togglePanel,
    rebind
  };

  function rebindGrids() {
    totalsLabel.textContent = value.length.toLocaleString() + ' rows';

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
        if (!togglePanel.parentElement) return;

        rebindGrids();
        invalidate();
      });

      table?.remove();
      let limitColumns = columns;
      if (limitColumns.length > 20) limitColumns.length = 20;

      let limitRows = value;
      if (limitRows.length > 80) limitRows = limitRows.slice(0, 80);

      table = createHtmlTable(limitColumns, limitRows);
      togglePanel.appendChild(table);
    } else {
      table?.remove();
      const createdGrid = createAgGridTable(columns, value, agGrid);
      table = createdGrid.containerElement;
      agGridInstance = createdGrid.agGrid;
      togglePanel.appendChild(table);
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

  /** @param {Omit<Parameters<typeof createTableViewAndToggle>[0], 'invalidate'>} args */
  function rebind(args) {
    value = args.value;
    state = args.state;
    columns = args.columns;

    rebindGrids();
  }

  function reflectTableViewSelectionToggle() {
    if (state.tableViewSelected) {
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
