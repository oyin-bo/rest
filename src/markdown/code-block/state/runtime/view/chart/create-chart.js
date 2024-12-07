
// @ts-check

import { MAX_ANALYZE_ROWS } from '../table/collect-columns';
import { parseDate } from '../table/parse-date';
import { loadEcharts } from './load-echarts';

import './create-chart.css';

const MAX_CATEGORY_COUNT = 24;
const OTHER_CATEGORY = 'Other';

const LAYOUT_DEFAULTS = {
  width: 400,
  height: 180,
  yAxis: { type: 'value' },
  // dataZoom: {
  //   id: 'dataZoomX',
  //   type: 'slider',
  //   xAxisIndex: [0],
  //   filterMode: 'filter'
  // },
  grid: {
    left: 50,
    top: 10,
    right: 5,
    bottom: 0
  },
  legend: { orient: 'horizontal' }
}

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
  const chartPanelOuterWrapper = document.createElement('div');
  chartPanelOuterWrapper.className = 'chart-view-panel-outer-wrapper';
  chartPanel.appendChild(chartPanelOuterWrapper);
  const chartPanelInnerWrapper = document.createElement('div');
  chartPanelInnerWrapper.className = 'chart-view-panel-inner-wrapper';
  chartPanelOuterWrapper.appendChild(chartPanelInnerWrapper);

  let echartsInstance;

  var rebindDebounced = setTimeout(rebindChart, 10);
  var rebindWithEcharts;
  var series;
  var xAxis;

  return {
    panel: chartPanel,
    rebind
  };

  function rebindChart() {
    const echarts = loadEcharts();
    if (typeof echarts.then === 'function') {
      echarts.then(() => {
        clearTimeout(rebindDebounced);
        rebindWithEcharts = true;
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

    series = [];
    xAxis = !bestDateColumn ? { name: 'Row', data: [] } :
      {
        name: bestDateColumn.key,
        type: 'time',
        /** @type {string[]} */
        data: []
      };

    let categoryKeys = [''];
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

    let dateOrder;
    if (bestDateColumn) {
      dateOrder = {
        /** @type {Set<number>} */
        dateSet: new Set(),
        /** @type {number[]} */
        ordered: [],
        /** @type {Map<any, number>} */
        rowDateLookup: new Map(),
        /** @type {Map<number, number>} */
        dateIndexLookup: new Map()
      };

      for (const row of value) {
        const date = parseDate(bestDateColumn.topLevelGetter(row));
        if (!date) continue;
        const time = date.getTime();
        dateOrder.rowDateLookup.set(row, time);

        if (dateOrder.dateSet.has(time)) continue;
        dateOrder.dateSet.add(time);
        dateOrder.ordered.push(time);
      }

      dateOrder.ordered.sort((a, b) => a - b);

      for (let i = 0; i < dateOrder.ordered.length; i++) {
        dateOrder.dateIndexLookup.set(dateOrder.ordered[i], i);
      }

      if (xAxis) {
        xAxis.data = [];
        for (const dt of dateOrder.ordered) {
          xAxis.data.push(new Date(dt).toISOString());
        }
      }
    } else {
      if (xAxis) {
        xAxis.data = [];
        for (const slice of categorySlices.values()) {
          while (xAxis.data.length < slice.length) xAxis.data.push(/** @type {*} */(xAxis.data.length + 1));
        }
      }
    }

    for (const baseCategory of categoryKeys) {
      const slice = categorySlices.get(baseCategory);
      if (!slice) continue;
      if (bestDateColumn && dateOrder)
        slice.sort((row1, row2) => {
          const dt1 = dateOrder.rowDateLookup.get(row1);
          const dt2 = dateOrder.rowDateLookup.get(row2);
          return (dt1 || 0) - (dt2 || 0);
        });

      for (const numCol of numericColumns) {
        const seriesEntry = {
          name: baseCategory ? baseCategory + ' ' + numCol.key : numCol.key,
          /** @type {number[]} */
          data: [],
          /** @type {'line'} */
          type: 'line'
        };

        for (let i = 0; i < slice.length; i++) {
          const row = slice[i];
          const dt = dateOrder?.rowDateLookup.get(row);
          const index = !dateOrder || !dt ? i : dateOrder.dateIndexLookup.get(dt) ?? i;
          seriesEntry.data[index] = numCol.topLevelGetter(row);
        }

        series.push(seriesEntry);
      }
    }

    if (!series.length) {
      chartPanel.textContent = 'NO DATA';
      console.log('CHART EMPTY: NO DATA');
      return;
    }

    const startChart = Date.now();
    console.log('chart init/setOption start', {
      ...LAYOUT_DEFAULTS,
      xAxis,
      series,
      width: window.innerWidth * 0.9
    });

    try {
      if (!echartsInstance)
        echartsInstance = echarts.init(chartPanelInnerWrapper, null, {
          width: window.innerWidth * 0.9,
          // height: chartPanelOuter.getBoundingClientRect().height,
          renderer: 'svg'
        });
      else
        echartsInstance.resize({
          width: window.innerWidth * 0.9,
          // height: chartPanelOuter.getBoundingClientRect().height
        });

      echartsInstance.setOption({
        ...LAYOUT_DEFAULTS,
        xAxis,
        series,
        width: window.innerWidth * 0.9,
        // height: chartPanelOuter.getBoundingClientRect().height
      });
    } catch (chartError) {
      chartPanel.textContent = 'Error: ' + chartError;
      console.error(chartError);
    }
    console.log(
      'chart init/setOption in ' + ((Date.now() - startChart) / 1000) + 's',
      series
    );
  }

  /** @param {Omit<Parameters<typeof createChart>[0], 'invalidate'>} args */
  function rebind(args) {
    let rebindWithoutChanges = args.value === value && columns.length === args.columns.length && !rebindWithEcharts;

    // TODO: properly detect changes, and then enable rebindWithoutChanges where relevant
    rebindWithoutChanges = false;

    value = args.value;
    columns = args.columns;
    rebindWithEcharts = false;

    if (rebindWithoutChanges) {
      const startChart = Date.now();
      try {
        echartsInstance.resize({
          height: LAYOUT_DEFAULTS.height,
          width: window.innerWidth * 0.9
        });
      } catch (chartError) {
        chartPanel.textContent = 'Error: ' + chartError;
        console.error(chartError);
      }
      console.log(
        'chart resize in ' + ((Date.now() - startChart) / 1000) + 's',
        series
      );
    } else {
      rebindChart();
    }
  }
}
