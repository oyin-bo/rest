// @ts-check
/// <reference path="./load-echarts-var.d.ts" />

import { devDependencies } from '../../../../../../../package.json';

import './echarts-styles.css';

var echartsScriptIncluded;

export function loadEcharts() {
  if (typeof echarts !== 'undefined') return /** @type {typeof echarts & { then?: never }} */(echarts);
  else return new Promise(resolve => {
    if (!echartsScriptIncluded) {
      echartsScriptIncluded = document.createElement('script');
      echartsScriptIncluded.src = 'https://unpkg.com/echarts@' + devDependencies.echarts + '/dist/echarts.js';
      echartsScriptIncluded.crossOrigin = 'anonymous';
      document.body.appendChild(echartsScriptIncluded);
    }

    const interval = setInterval(() => {
      if (typeof echarts !== 'undefined') {
        clearInterval(interval);
        resolve(echarts);
      }
    }, 100);
  });
}