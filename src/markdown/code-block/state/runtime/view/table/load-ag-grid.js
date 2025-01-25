// @ts-check
/// <reference path="./load-ag-grid-var.d.ts" />

import { aggr } from 'alasql';
import { devDependencies } from '../../../../../../../package.json';

import './ag-grid-styles.css';

var agGridScriptIncluded;

export function loadAgGrid() {
  if (typeof agGrid !== 'undefined') return /** @type {typeof agGrid & { then?: never }} */(agGrid);
  else return new Promise(resolve => {
    if (!agGridScriptIncluded) {
      agGridScriptIncluded = document.createElement('script');
      agGridScriptIncluded.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community@' + devDependencies['ag-grid-community'] + '/dist/ag-grid-community.min.js';
      agGridScriptIncluded.crossOrigin = 'anonymous';
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