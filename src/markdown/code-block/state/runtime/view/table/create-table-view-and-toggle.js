// @ts-check

import { createAgGridColumns, createAgGridTable, gridHeightForRowsAndColumns } from './create-ag-grid-table';
import { createHtmlTable } from './create-html-table';
import { getAgGrid } from './global-ag-grid';

/**
 * @param {import('..').RenderParams<import('../..').ScriptRuntimeStateSucceeded> & {
 *  columns: NonNullable<ReturnType<import('./collect-columns').collectColumns>>
 * }} _
 */
export function createTableViewAndToggle({ scriptState, viewState, columns, invalidate }) {
  const result = scriptState.result;

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
  totalsLabel.textContent = scriptState.result.length.toLocaleString() + ' rows';
  togglePanel.appendChild(totalsLabel);

  /** @type {import('ag-grid-community').GridApi} */
  let agGridInstance;
  let table;

  if (typeof viewState.tableViewSelected === 'undefined')
    viewState.tableViewSelected = true;

  rebindGrids();

  reflectTableViewSelectionToggle();

  tableButton.onclick = () => {
    viewState.tableViewSelected = true;
    reflectTableViewSelectionToggle();
    invalidate();
  };
  jsonButton.onclick = () => {
    viewState.tableViewSelected = false;
    reflectTableViewSelectionToggle();
    invalidate();
  };

  return {
    panel: togglePanel,
    rebind
  };

  function rebindGrids() {
    totalsLabel.textContent = scriptState.result.length.toLocaleString() + ' rows';

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
        rowData: scriptState.result
      });
      if (needsResize) resizeGridColumns();

      table.style.height = gridHeightForRowsAndColumns(scriptState.result.length, columns);
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

      let limitRows = result;
      if (limitRows.length > 80) limitRows = limitRows.slice(0, 80);

      table = createHtmlTable(limitColumns, limitRows);
      togglePanel.appendChild(table);
    } else {
      table?.remove();
      const createdGrid = createAgGridTable(columns, result, agGrid);
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

  /** @param {Parameters<typeof createTableViewAndToggle>[0]} args */
  function rebind(args) {
    scriptState = args.scriptState;
    viewState = args.viewState;
    columns = args.columns;

    rebindGrids();
  }

  function reflectTableViewSelectionToggle() {
    if (viewState.tableViewSelected) {
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
