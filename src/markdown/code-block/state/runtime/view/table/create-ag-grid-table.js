// @ts-check

import { createHtmlTable } from './create-html-table';
import { dateCellRenderer } from './date-column';
import { numberCellRenderer } from './number-column';

/**
 * @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns
 * @param {any} result
 * @param {typeof import('ag-grid-community')} agGrid
 */
export function createAgGridTable(columns, result, agGrid) {
  const gridParent = document.createElement('div');
  gridParent.className = 'ag-theme-balham';
  gridParent.style.cssText = 'position: relative; width: 100%; overflow: auto;';
  gridParent.style.height = gridHeightForRowsAndColumns(result.length, columns);

  /** @type {import('ag-grid-community').CellPosition | undefined | null} */
  let rangeSelectionHead;

  const agGridInstance = agGrid.createGrid(
    gridParent,
    {
      columnDefs: createAgGridColumns(
        columns,
        (colSpec, params) => {
          const selectionRange = getSelectionRange();
          if (selectionRange &&
            params.rowIndex >= selectionRange.from.row && params.rowIndex <= selectionRange.to.row &&
            selectionRange.columns.indexOf(params.column) >= 0)
            return true;
        }
      ),
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
      onCellFocused: handleCellFocused,
    });
  
  gridParent.onkeydown = handleKeyDown;
  gridParent.onkeyup = handleKeyUp;
  gridParent.onmousedown = handleMouseDown;
  gridParent.onmouseup = handleMouseUp;

  return { containerElement: gridParent, agGrid: agGridInstance };

  function getSelectionRange() {
    if (selectAll) {
      const columns = agGridInstance.getColumns();
      if (!columns) return;

      const rowCount = agGridInstance.getDisplayedRowCount();
      return {
        from: { row: 0, column: 0 },
        to: { row: rowCount - 1, column: columns.length - 1 },
        columns
      };
    }

    if (!rangeSelectionHead) return;

    const fCell = agGridInstance.getFocusedCell();
    if (!fCell) return;

    const columns = agGridInstance.getColumns();
    if (!columns) return;

    const focusedColumnIndex = columns.indexOf(fCell.column);
    if (focusedColumnIndex < 0) return;

    const continuousSelection = 
      shiftDown || modDown || mouseDown;

    if (!continuousSelection) {
      rangeSelectionHead = undefined;
      return {
        from: { row: fCell.rowIndex, column: focusedColumnIndex },
        to: { row: fCell.rowIndex, column: focusedColumnIndex },
        columns: [columns[focusedColumnIndex]]
      };
    }

    const r1 = Math.min(rangeSelectionHead.rowIndex, fCell.rowIndex);
    const r2 = Math.max(rangeSelectionHead.rowIndex, fCell.rowIndex);
    const headColumnIndex = columns.indexOf(rangeSelectionHead.column);

    if (headColumnIndex < 0 || focusedColumnIndex < 0) return;

    const c1 = Math.min(headColumnIndex, focusedColumnIndex);
    const c2 = Math.max(headColumnIndex, focusedColumnIndex);
    const selectColumns = columns.slice(c1, c2 + 1);

    return { from: { row: r1, column: c1 }, to: { row: r2, column: c2 }, columns: selectColumns };
  }

  /** @param {import('ag-grid-community').CellFocusedEvent} event */
  function handleCellFocused(event) {
    if (!rangeSelectionHead) rangeSelectionHead = agGridInstance.getFocusedCell();
    selectAll = false;
    redrawSelection();
  }

  var shiftDown;
  var modDown;
  var mouseDown;
  var selectAll;

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      selectAll = true;
      redrawSelection();
      return;
    }

    if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      /** @type {*} */(event).stopPropagation?.();

      const selectionRange = getSelectionRange();
      performCopyFromAgGrid({ agGridInstance, gridParent, selectionRange, columns });
    }

    shiftDown = event.shiftKey ? true : undefined;
    modDown = event.metaKey ? true : undefined;
  }

  /** @param {KeyboardEvent} event */
  function handleKeyUp(event) {
    shiftDown = event.shiftKey ? true : undefined;
    modDown = event.metaKey ? true : undefined;
  }

  /** @param {MouseEvent} event */
  function handleMouseDown(event) {
    const continuousSelection =
      shiftDown || modDown || mouseDown;
    if (!continuousSelection) rangeSelectionHead = agGridInstance.getFocusedCell();

    if (event.button === 0) mouseDown = true;
    resetRangeIfUnselected();
  }

  /** @param {MouseEvent} event */
  function handleMouseUp(event) {
    if (event.button === 0) mouseDown = false;
    resetRangeIfUnselected();
  }

  function resetRangeIfUnselected() {
    const continuousSelection =
      shiftDown || modDown || mouseDown;
    
    if (!continuousSelection) rangeSelectionHead = agGridInstance.getFocusedCell();
  }

  var redrawQueued;
  function redrawSelection() {
    const selectionRange = getSelectionRange();
    if (!selectionRange) return;

    const rowNodes = [];
    agGridInstance.forEachNodeAfterFilterAndSort(rowNode => {
      if (typeof rowNode.rowIndex !== 'number') return;
      if (rowNode.rowIndex >= selectionRange.from.row && rowNode.rowIndex <= selectionRange.to.row) {
        rowNodes.push(rowNode);
      }
    });

    clearTimeout(redrawQueued);
    redrawQueued = setTimeout(() => {
      agGridInstance.refreshCells();  //{ rowNodes, columns: selectionRange.columns });
    }, 10);
  }
}

/**
 * @param {number} rowCount
 *  @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns
 */
export function gridHeightForRowsAndColumns(rowCount, columns) {
  return Math.min(30, Math.floor(rowCount * 2.7)) + Math.floor(columns.maxDepth * 2.8) + 'em';
}

/**
 * @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns
 * @param {(colSpec: import('./collect-columns').ColumnSpec, params: import('ag-grid-community').CellClassParams) => boolean | undefined | null} [isCellSelected]
 */
export function createAgGridColumns(columns, isCellSelected) {
  console.log('applying columns', columns);
  return columns.map(col => createColumn(col));

  /**
   * @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>[0]} colSpec
   * @param {(rowObj: any) => any} [parentGetter]
   */
  function createColumn(colSpec, parentGetter) {

    /** @type {*} */
    const stats = colSpec.bestType && colSpec.types[colSpec.bestType];
    const getter = parentGetter ? (rowObj) => colSpec.getter(parentGetter(rowObj)) : colSpec.getter;
    const children = !colSpec.subColumns?.length ? undefined : colSpec.subColumns.map(col => createColumn(col, getter));

    return /** @type {import('ag-grid-community').ColDef} */({
      headerName: colSpec.key,
      field: colSpec.key,
      valueGetter: (params) => getter(params.data),
      cellRenderer:
        colSpec.bestType === 'number' && Number.isFinite(stats?.max) && Number.isFinite(stats?.min) ?
          numberCellRenderer :
          colSpec.bestType === 'date' ?
            dateCellRenderer :
            undefined,
      cellRendererParams: { col: colSpec },
      children,
      cellClassRules: !children?.length && isCellSelected ?
        {
          'imposed-cell-range-selected': params => isCellSelected(colSpec, params)
        } : undefined,
    });
  }
}

/**
 * @param {{
 *  splashArea: { top: number, left: number, right: number, bottom: number },
 *  headerArea?: { top: number, left: number, right: number, bottom: number }
 * }} _
 */
function animateCopySplash({ splashArea, headerArea }) {
  const splash = document.createElement('div');
  splash.style.cssText =
    'position: absolute; top: 0; left: 0; width: 10em; height: 10em; background: #008452; opacity: 0.7; z-index: 1000; transition: pointer-events: none;';
  splash.style.top = splashArea.top + 'px';
  splash.style.left = splashArea.left + 'px';
  splash.style.width = (splashArea.right - splashArea.left) + 'px';
  splash.style.height = (splashArea.bottom - splashArea.top) + 'px';
  document.body.appendChild(splash);

  let splashHeader
  if (headerArea) {
    splashHeader = document.createElement('div');
    splashHeader.style.cssText =
      'position: absolute; top: 0; left: 0; width: 10em; height: 10em; background: #008452; opacity: 0.7; z-index: 1000; transition: pointer-events: none;';
    splashHeader.style.top = headerArea.top + 'px';
    splashHeader.style.left = headerArea.left + 'px';
    splashHeader.style.width = (headerArea.right - headerArea.left) + 'px';
    splashHeader.style.height = (headerArea.bottom - headerArea.top) + 'px';
    document.body.appendChild(splashHeader);
  }

  setTimeout(() => {
    splash.style.transition = 'all 1s';
    if (splashHeader) splashHeader.style.transition = 'all 1s';
    setTimeout(() => {
      splash.style.opacity = '0';
      splash.style.filter = 'blur(4em)';
      splash.style.transform = 'scale(1.5)';
      if (splashHeader) {
        splashHeader.style.opacity = '0';
        splashHeader.style.filter = 'blur(4em)';
        splashHeader.style.transform = 'scale(1.5)';
      }

      setTimeout(() => {
        splash.remove();
        if (splashHeader) splashHeader.remove();
      }, 1000);
    }, 1);
  }, 1);
}

/**
 * @param {{
 *  agGridInstance: import('ag-grid-community').GridApi,
 *  gridParent: HTMLElement,
 *  selectionRange: { from: { row: number; column: number; }; to: { row: number; column: number; }; columns: import('ag-grid-community').Column[]; } | undefined,
 *  columns: import('./collect-columns').ColumnSpec[] & { maxDepth: number; totalWidth: number; }
 * }} _
 */
function performCopyFromAgGrid({ agGridInstance, gridParent, selectionRange, columns }) {

  const agColumns = agGridInstance.getColumns();
  if (!agColumns?.length) return;

  const fCell = agGridInstance.getFocusedCell();

  const rows = [];
  agGridInstance.forEachNodeAfterFilterAndSort(rowNode => {
    if (!selectionRange || typeof rowNode.rowIndex !== 'number') return;
    if (rowNode.rowIndex >= selectionRange.from.row && rowNode.rowIndex <= selectionRange.to.row)
      rows.push(rowNode.data);
  });

  const showColumns = /** @type {typeof columns} */(columns.filter(colSpec => {
    const agCol = agColumns.find((col, index) =>
      (!selectionRange || selectionRange.columns.indexOf(col) >= 0) &&
      !col.getParent() && col.getColId() === colSpec.key
    );
    return agCol?.isVisible();
  }));
  showColumns.maxDepth = columns.maxDepth;
  showColumns.totalWidth = columns.totalWidth;

  let copyElem;

  /** @type {{ top: number, left: number, right: number, bottom: number }} */
  let splashArea = gridParent.getBoundingClientRect();
  /** @type {typeof splashArea | undefined} */
  let headerArea;

  if (selectionRange &&
    selectionRange?.from.row === selectionRange?.to.row &&
    selectionRange?.from.column === selectionRange?.to.column) {
    let cellValue = undefined;
    agGridInstance.forEachNode(rowNode => {
      if (rowNode.rowIndex === selectionRange.from.row) {
        cellValue = agGridInstance.getCellValue({
          rowNode,
          colKey: selectionRange.columns[0]
        });
      }
    });

    const cellDivWrapper = document.createElement('div');
    const cellDivContent = document.createElement('div');
    cellDivContent.textContent = String(cellValue ?? '');
    cellDivWrapper.appendChild(cellDivContent);
    copyElem = cellDivWrapper;

    const focusedCell = gridParent.querySelector('.ag-cell-focus');
    if (focusedCell) splashArea = focusedCell.getBoundingClientRect();
  } else {
    const renderTableHTML = createHtmlTable(showColumns, rows);
    copyElem = renderTableHTML;

    const headerOuterArea = gridParent.querySelector('.ag-header-container')?.getBoundingClientRect();
    const rangeCells = gridParent.querySelectorAll('.imposed-cell-range-selected');
    let cellFound = false;

    const outerArea = splashArea;
    for (const cell of rangeCells) {
      const cellArea = cell.getBoundingClientRect();
      if (!cellFound) {
        splashArea = { top: cellArea.top, left: cellArea.left, right: cellArea.right, bottom: cellArea.bottom };
        if (headerOuterArea)
          headerArea = { top: headerOuterArea.top, left: splashArea.left, right: splashArea.right, bottom: headerOuterArea.bottom };

        cellFound = true;
      } else {
        splashArea.top = Math.max(Math.min(splashArea.top, cellArea.top), outerArea.top);
        splashArea.left = Math.max(Math.min(splashArea.left, cellArea.left), outerArea.left);
        splashArea.right = Math.min(Math.max(splashArea.right, cellArea.right), outerArea.right);
        splashArea.bottom = Math.min(Math.max(splashArea.bottom, cellArea.bottom), outerArea.bottom);

        if (headerOuterArea && headerArea) {
          headerArea.left = Math.max(Math.min(headerArea.left, cellArea.left), outerArea.left);
          headerArea.right = Math.min(Math.max(headerArea.right, cellArea.right), outerArea.right);
        }
      }
    }
  }

  copyElem.style.cssText =
    // 'position: absolute; top: 5em; left: 5em; width: 20em; height: 10em; background: white; font-size: 70%; overflow: auto; border: solid 1px tomato; z-index: 1000;';
    'position: absolute; top: -1000px; left: -1000px; width: 200px; height: 200px; opacity: 0; font-size: 70%; overflow: hidden;';
  document.body.appendChild(copyElem);
  copyElem.contentEditable = 'true';
  const selRange = document.createRange();
  if (copyElem.firstChild) {
    selRange.selectNodeContents(copyElem.firstChild);
    const select = window.getSelection();
    select?.removeAllRanges();
    select?.addRange(selRange);

    window.document.execCommand('Copy', true);
  }

  setTimeout(() => {
    copyElem.remove();
  }, 10);


  if (fCell) agGridInstance.setFocusedCell(fCell.rowIndex, fCell.column, fCell.rowPinned);
  else /** @type {HTMLElement} */(gridParent.querySelector('.ag-cell'))?.focus();

  animateCopySplash({ splashArea, headerArea });
}
