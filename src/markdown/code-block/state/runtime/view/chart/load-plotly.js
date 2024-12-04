// @ts-check
/// <reference path="./load-plotly-var.d.ts" />

import './plotly-styles.css';

var plotlyScriptIncluded;

export function loadPlotly() {
  if (typeof Plotly !== 'undefined') return /** @type {typeof Plotly & { then?: never }} */(Plotly);
  else return new Promise(resolve => {
    if (!plotlyScriptIncluded) {
      plotlyScriptIncluded = document.createElement('script');
      plotlyScriptIncluded.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js';
      document.body.appendChild(plotlyScriptIncluded);
    }

    const interval = setInterval(() => {
      if (typeof Plotly !== 'undefined') {
        clearInterval(interval);
        resolve(Plotly);
      }
    }, 100);
  });
}