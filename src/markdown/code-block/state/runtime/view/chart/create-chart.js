// @ts-check

import { MAX_ANALYZE_ROWS } from '../table/collect-columns';
import { parseDate } from '../table/parse-date';
import { loadPlotly } from './load-plotly';

const MAX_CATEGORY_COUNT = 24;
const OTHER_CATEGORY = 'Other';

/**
 * @param {{
  *  value: any[],
 *  columns: NonNullable<ReturnType<import('../table/collect-columns').collectColumns>>,
 *  indent: string,
 *  invalidate: () => void
* }} params
 */
export function createChart({ value, columns, indent, invalidate }) {
  const chartPanel = document.createElement('div');
  chartPanel.className = 'chart-view-panel';
  chartPanel.style.paddingLeft = (indent.length * 0.4).toFixed(2) + 'em';

  rebindChart();
  var rebindDebounced;
  var rebindWithPlotly;
  var data;

  return {
    panel: chartPanel,
    rebind
  };

  function rebindChart() {
    const Plotly = loadPlotly();
    if (typeof Plotly.then === 'function') {
      Plotly.then(() => {
        clearTimeout(rebindDebounced);
        rebindWithPlotly = true;
        rebindDebounced = setTimeout(rebindChart, 10);
      });
      return;
    }

    const bestDateColumn =
      columns.leafColumns
        .filter(col => (col.dateLike || 0) > 0)
        .sort((c1, c2) => (c2.dateLike || 0) - (c1.dateLike || 0))[0];

    const nameColumns =
      columns.leafColumns
        .filter(col => (col.nameLike || 0) > 0);
    let bestCategoryColumn;
    const maxCovered = Math.min(value.length, MAX_ANALYZE_ROWS);
    for (const col of nameColumns) {
      let covered = 0;
      const set = col.types.string?.set;
      if (!set) continue;

      const categories = [...set.entries()].sort((a, b) => b[1] - a[1]);
      for (const [category, count] of categories) {
        if (count <= 4 && count < maxCovered / 100) break;
        covered += count;
      }

      if (covered > maxCovered * 0.4 || covered > 1000) {
        bestCategoryColumn = col;
        break;
      }
    }

    const numericColumns =
      columns.leafColumns
        .filter(col => col.bestType === 'number' && col.types.number?.max !== col.types.number?.min);

    data = [];
    let categoryKeys = [];
    let categorySlices = new Map([['', value]]);
    if (bestCategoryColumn) {

      /** @type {Map<string, any[]>} */
      categorySlices = new Map();
      for (const row of value) {
        const baseCategory = bestCategoryColumn.topLevelGetter(row);

        let slice = categorySlices.get(baseCategory);
        if (!slice) categorySlices.set(baseCategory, slice = []);
        slice.push(row);
      }

      categoryKeys = [...categorySlices.keys()];

      if (categoryKeys.length > MAX_CATEGORY_COUNT) {
        const reducedCategoryKeys = new Set(
          [...categorySlices.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, MAX_CATEGORY_COUNT - 1)
            .map(([key]) => key)
        );
        reducedCategoryKeys.delete(OTHER_CATEGORY);

        let otherSlice = categorySlices[OTHER_CATEGORY];
        if (!otherSlice) categorySlices.set(OTHER_CATEGORY, otherSlice = []);
        for (const key of categorySlices.keys()) {
          if (reducedCategoryKeys.has(key)) continue;
          otherSlice = otherSlice.concat(categorySlices.get(key));
        }
        categoryKeys = [...reducedCategoryKeys, OTHER_CATEGORY];
        categorySlices.set(OTHER_CATEGORY, otherSlice);
      }
    }

    for (const baseCategory of categoryKeys) {
      const slice = categorySlices.get(baseCategory);
      if (!slice) continue;
      if (bestDateColumn)
        slice.sort((row1, row2) => {
          const dt1 = parseDate(bestDateColumn.topLevelGetter(row1));
          const dt2 = parseDate(bestDateColumn.topLevelGetter(row2));
          return (dt1?.getTime() || 0) - (dt2?.getTime() || 0);
        });

      for (const numCol of numericColumns) {
        const trace = {
          name: baseCategory ? baseCategory + ' ' + numCol.key : numCol.key,
          /** @type {(number | Date)[]} */
          x: [],
          /** @type {number[]} */
          y: [],
          /** @type {'scatter'} */
          type: 'scatter'
        };

        for (let i = 0; i < slice.length; i++) {
          const row = slice[i];
          /** @type {*} */
          const x = bestDateColumn ? parseDate(bestDateColumn.topLevelGetter(row)) : i + 1;
          trace.x.push(x);
          trace.y.push(numCol.topLevelGetter(row));
        }

        data.push(trace);
      }

      const startChart = Date.now();
      try {
        Plotly.newPlot(chartPanel, data, { width: window.innerWidth * 0.9 });
      } catch (chartError) {
        chartPanel.textContent = 'Error: ' + chartError;
      }
      console.log('chart rendered in ' + ((Date.now() - startChart) / 1000) + 's');
    }
  }

  /** @param {Omit<Parameters<typeof createChart>[0], 'invalidate'>} args */
  function rebind(args) {
    // no need to rebind aggressively on same value
    if (args.value === value && columns.length === args.columns.length && !rebindWithPlotly) {
      const Plotly = loadPlotly();
      if (typeof Plotly?.then !== 'function') {
        const startChart = Date.now();
        try {
          Plotly.relayout(chartPanel, { width: window.innerWidth * 0.9 });
        } catch (chartError) {
          chartPanel.textContent = 'Error: ' + chartError;
        }
        console.log('chart rendered in ' + ((Date.now() - startChart) / 1000) + 's');
      }
      return;
    }

    value = args.value;
    columns = args.columns;
    rebindWithPlotly = false;

    rebindChart();
  }
}
