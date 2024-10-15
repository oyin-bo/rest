// @ts-check
/// <reference path="./global-ag-grid-var.d.ts" />

var agGridScriptIncluded;

export function getAgGrid() {
  if (typeof agGrid !== 'undefined') return /** @type {typeof agGrid & { then?: never }} */(agGrid);
  else return new Promise(resolve => {
    if (!agGridScriptIncluded) {
      agGridScriptIncluded = document.createElement('script');
      agGridScriptIncluded.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community@32.2.2/dist/ag-grid-community.min.js';
      document.body.appendChild(agGridScriptIncluded);
    }

    const interval = setInterval(() => {
      if (typeof agGrid !== 'undefined') {
        clearInterval(interval);
        resolve(agGrid);
      }
    }, 100);
  });
}