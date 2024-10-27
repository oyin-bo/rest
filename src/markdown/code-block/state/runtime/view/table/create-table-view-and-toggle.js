// @ts-check

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
  //togglePanel.textContent = 'Toggle view';

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
      const columnDefs = createAgGridColumns(columns);
      const needsResize = agGridInstance.getGridOption('columnDefs')?.length !== columnDefs.length;
      agGridInstance.updateGridOptions({
        columnDefs,
        rowData: scriptState.result
      });
      if (needsResize) resizeGridColumns();
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
      table = createHtmlTable(columns, result);
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

/**
 * @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns
 */
function createAgGridColumns(columns) {
  console.log('applying columns', columns);
  return columns.map(colSpec => ({
    headerName: colSpec.key,
    field: colSpec.key,
    children: createChildColumns(colSpec)
  }));

  /**
   * @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>[0]} colSpec
   */
  function createChildColumns(colSpec) {
    if (!colSpec.subColumns) return;
    return colSpec.subColumns && colSpec.subColumns.map(subColSpec => ({
      headerName: subColSpec.key.split('.').pop(),
      field: subColSpec.key,
      children: createChildColumns(subColSpec)
    }));
  }
}

/**
 * @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns
 * @param {any} result
 * @param {typeof import('ag-grid-community')} agGrid
 */
function createAgGridTable(columns, result, agGrid) {
  const gridParent = document.createElement('div');
  gridParent.className = 'ag-theme-balham';
  gridParent.style.cssText = 'position: relative; width: 100%; height: 30em; overflow: auto;';

  const agGridInstance = agGrid.createGrid(
    gridParent,
    {
      columnDefs: createAgGridColumns(columns),
      rowData: result,
      defaultColDef: {
        flex: 1,
        minWidth: 100,
        resizable: true,
        sortable: true,
        filter: true,
      },
      // domLayout: 'autoHeight',
      autoSizePadding: 10,
      animateRows: true,
    });
  
  return { containerElement: gridParent, agGrid: agGridInstance };
}

/**
 * @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns
 * @param {any} result
 */
function createHtmlTable(columns, result) {
  const tableContainer = document.createElement('div');
  tableContainer.style.cssText = 'height: 30em; overflow: auto; width: 100%;';

  const table = document.createElement('table');
  tableContainer.appendChild(table);
  const headRow = document.createElement('tr');
  table.appendChild(headRow);

  const thIndex = document.createElement('th');
  headRow.appendChild(thIndex);

  for (const colDesc of columns) {
    const th = document.createElement('th');
    th.textContent = colDesc.key;
    headRow.appendChild(th);
  }

  let index = 0;
  for (const entry of result) {
    index++;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

    const tr = document.createElement('tr');
    table.appendChild(tr);

    const tdIndex = document.createElement('td');
    tdIndex.style.textAlign = 'right';
    tdIndex.textContent = index.toLocaleString();
    tr.appendChild(tdIndex);

    for (const colDesc of columns) {
      const td = document.createElement('td');
      td.textContent = entry[colDesc.key];
      if (colDesc.bestType === 'number')
        td.style.textAlign = 'right';
      tr.appendChild(td);
    }
  }

  return tableContainer;
}
