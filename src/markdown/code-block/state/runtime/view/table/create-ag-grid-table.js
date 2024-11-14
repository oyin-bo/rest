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
      onCellKeyDown: handleCellKeyDown
    });

  return { containerElement: gridParent, agGrid: agGridInstance };

  /** @param {import('ag-grid-community').CellKeyDownEvent} event */
  function handleCellKeyDown(event) {
    const keyboardEvent = /** @type {KeyboardEvent} */(event.event);
    if (!keyboardEvent) return;

    if (keyboardEvent.key === 'c' && (keyboardEvent.ctrlKey || keyboardEvent.metaKey)) {
      const agColumns = agGridInstance.getColumns();
      if (!agColumns?.length) return;

      const fCell = agGridInstance.getFocusedCell();

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      /** @type {*} */(event).stopPropagation?.();

      const rows = [];
      agGridInstance.forEachNodeAfterFilterAndSort(rowNode => {
        rows.push(rowNode.data)
      });

      const showColumns = /** @type {typeof columns} */(columns.filter(colSpec => {
        const agCol = agColumns.find(col => !col.getParent() && col.getColId() === colSpec.key);
        return agCol?.isVisible();
      }));
      showColumns.maxDepth = columns.maxDepth;
      showColumns.totalWidth = columns.totalWidth;

      const renderTableHTML = createHtmlTable(showColumns, rows);
      renderTableHTML.style.cssText =
        // 'position: absolute; top: 5em; left: 5em; width: 20em; height: 10em; background: white; font-size: 70%; overflow: auto; border: solid 1px tomato; z-index: 1000;';
      'position: absolute; top: -1000px; left: -1000px; width: 200px; height: 200px; opacity: 0; font-size: 70%; overflow: hidden;';
      document.body.appendChild(renderTableHTML);
      renderTableHTML.contentEditable = 'true';
      const selRange = document.createRange();
      if (renderTableHTML.firstChild) {
        selRange.selectNodeContents(renderTableHTML.firstChild);
        const select = window.getSelection();
        select?.removeAllRanges();
        select?.addRange(selRange);

        window.document.execCommand('Copy', true);
      }

      if (fCell) agGridInstance.setFocusedCell(fCell.rowIndex, fCell.column, fCell.rowPinned);
      else /** @type {HTMLElement} */(gridParent.querySelector('.ag-cell'))?.focus();

      const splashArea = gridParent.getBoundingClientRect();
      const splash = document.createElement('div');
      splash.style.cssText =
        'position: absolute; top: 0; left: 0; width: 10em; height: 10em; background: cornflowerblue; opacity: 0.7; z-index: 1000; transition: pointer-events: none;';
      splash.style.top = splashArea.top + 'px';
      splash.style.left = splashArea.left + 'px';
      splash.style.width = splashArea.width + 'px';
      splash.style.height = splashArea.height + 'px';
      document.body.appendChild(splash);
      setTimeout(() => {
        splash.style.transition = 'all 1s';
        setTimeout(() => {
          splash.style.opacity = '0';
          splash.style.filter = 'blur(4em)';
          splash.style.transform = 'scale(1.5)';

          setTimeout(() => {
            splash.remove();
          }, 1000);
        }, 1);
      }, 1);
    }
  }
}

/**
 * @param {number} rowCount
 *  @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns
 */
export function gridHeightForRowsAndColumns(rowCount, columns) {
  return Math.min(30, Math.floor(rowCount * 2.7)) + Math.floor(columns.maxDepth * 2.8) + 'em';
}

/** @param {NonNullable<ReturnType<import('./collect-columns').collectColumns>>} columns */
export function createAgGridColumns(columns) {
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
      children: !colSpec.subColumns ? undefined : colSpec.subColumns.map(col => createColumn(col, getter)),
    });
  }
}
