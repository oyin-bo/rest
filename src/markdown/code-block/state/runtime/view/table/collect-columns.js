// @ts-check

import { parseDate } from './parse-date';

/**
 * @typedef {{
 *  key: string,
 *  getter: (rowObj: any) => any,
 *  types: Record<string, number | { min: number, max: number, count: number }>
 *  bestType?: string,
 *  subColumns?: ColumnSpec[] & { maxDepth: number, totalWidth: number },
 *  nameLike?: number,
 *  dateLike?: number
 * }} ColumnSpec
 */

const MAX_NESTED_COLUMN = 6;
const MAX_ANALYZE_ROWS = 200;

const WORD_REGEXP = /\p{L}+/gu;

const DATE_WORDS_LOWERCASE = new Map(Object.entries({
  date: 1000,
  day: 700,
  month: 500,
  created: 100,
  creation: 90,
  create: 90,
  updated: 100,
  update: 90,
  modify: 100,
  modified: 100,
  modification: 100
}));

/**
 * @param {any[]} array
 */
export function collectColumns(array) {
  /** @type {ColumnSpec[]} */
  const leafColumns = [];

  const columns = /** @type {NonNullable<ReturnType<typeof collectSubColumns>> & { leafColumns: ColumnSpec[] } | undefined} */(
    collectSubColumns(array, 0, leafColumns));
  if (columns) {
    columns.leafColumns = leafColumns;

    /** @type {number[]} */
    const likelyName = [];
    /** @type {number[]} */
    const likelyDate = [];

    for (const leafCol of leafColumns) {
      const words = [];
      leafCol.key.replace(WORD_REGEXP, (word) => {
        words.push(word);
        return word;
      });


    }
  }

  return columns;
}

/**
 * @param {any[]} array
 * @param {number} depth
 * @param {ColumnSpec[]} leafColumns
 */
function collectSubColumns(array, depth, leafColumns) {
  /** @type {Record<string, ColumnSpec>} */
  const columns = {};
  let nullRows = 0;
  let valueRows = 0;
  let arrayRows = 0;

  let rowsAnalyzed = 0;

  for (let entry of array) {
    if (!entry && typeof entry !== 'string') {
      nullRows++;
      continue;
    }
    if (typeof entry !== 'object') {
      valueRows++;
      continue;
    }
    if (Array.isArray(entry)) {
      arrayRows++;
      continue;
    }

    for (const key in entry) {
      const colSpec = columns[key] || (columns[key] = {
        key,
        getter: rowObj => {
          const val = rowObj?.[key];
          if (colSpec.bestType === '[object]')
            return val?.[0];
          else
            return val;
        },
        types: {}
      });
      let value = entry[key];
      let type =
        value == null ? 'null' :
          typeof value !== 'object' ? typeof value :
            Array.isArray(value) ?
              (value.length === 1 && value[0] && typeof value[0] === 'object' && !Array.isArray(value[0]) ? '[object]' :
                'array'
              ) :
              'object';

      if (type === 'number' || type === 'string' || type === 'object' && value instanceof Date) {
        const dateValue = parseDate(value);
        if (dateValue) {
          value = dateValue;
          type = 'date';
        }
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        /** @type {*} */
        const numSpec = colSpec.types[type];
        colSpec.types[type] = {
          min: !numSpec || value < numSpec.min ? value : numSpec.min,
          max: !numSpec || value > numSpec.max ? value : numSpec.max,
          count: (numSpec ? numSpec.count : 0) + 1
        };
      } else if (type === 'date') {
        /** @type {*} */
        const dateSpec = colSpec.types[type];
        colSpec.types[type] = {
          min: !dateSpec || value < dateSpec.min ? value : dateSpec.min,
          max: !dateSpec || value > dateSpec.max ? value : dateSpec.max,
          count: (dateSpec ? dateSpec.count : 0) + 1
        };
      } else {
        const count = colSpec.types[type];
        colSpec.types[type] = typeof count === 'number' ? count + 1 : 1;
      }
    }

    rowsAnalyzed++;
    if (rowsAnalyzed > MAX_ANALYZE_ROWS)
      break;
  }

  // not a coherent array of objects
  if (nullRows > array.length / 2 || valueRows > array.length / 4 || arrayRows > array.length / 4)
    return undefined;

  for (const colSpec of Object.values(columns)) {
    const types = Object.entries(colSpec.types);
    types.sort(([type1, stats1], [type2, stats2]) => {
      const count1 = typeof stats1 === 'number' ? stats1 : stats1.count;
      const count2 = typeof stats2 === 'number' ? stats2 : stats2.count;
      return count2 - count1;
    });

    colSpec.bestType = types[0][0];
    if (colSpec.bestType === 'null' && types.length > 1)
      colSpec.bestType = types[1][0];
    if (colSpec.bestType === '[object]')
      colSpec.key += '[0]';
  }

  const columnsWithConsistentData = /** @type {ColumnSpec[] & { maxDepth: number, totalWidth: number }} */(
    Object.values(columns).filter(
      colDesc => {
        const stats = colDesc.types[colDesc.bestType || ''];
        const count = typeof stats === 'number' ? stats : stats.count;
        return count > Math.min(4, array.length / 10);
      }
    ));
  columnsWithConsistentData.maxDepth = 1;
  columnsWithConsistentData.totalWidth = columnsWithConsistentData.length;

  if (!columnsWithConsistentData.length) return;

  if (depth <= MAX_NESTED_COLUMN) {
    for (const col of columnsWithConsistentData) {
      if (col.bestType === 'object' || col.bestType === '[object]') {
        const objectRows = array.map(entry => {
          if (!entry || typeof entry !== 'object') return;
          let valueEntry = col.getter(entry);
          if (!valueEntry || typeof valueEntry !== 'object') return;
          if (Array.isArray(valueEntry))
            return valueEntry.length === 1 ? valueEntry[0] : undefined;
          else
            return valueEntry;
        }).filter(Boolean);

        if (objectRows.length < 2) {
          console.log(
            'collect ' + col.key + ' NO subColumns ',
            objectRows,
            col.subColumns,
            ' EXAMPLE ', array[0], col.key, ' --> ', col.getter(array[0]));
          continue;
        }

        col.subColumns = collectSubColumns(
          objectRows,
          depth + 1,
          leafColumns);

        if (!col.subColumns?.length) {
          col.subColumns = undefined;
          leafColumns.push(col);
        } else {
          for (const subCol of col.subColumns) {
            subCol.key = col.key + '.' + subCol.key;
          }

          columnsWithConsistentData.maxDepth = Math.max(columnsWithConsistentData.maxDepth, col.subColumns.maxDepth + 1);
          columnsWithConsistentData.totalWidth += col.subColumns.totalWidth - 1;
        }

        console.log('collect '+ col.key + ' subColumns ', objectRows, col.subColumns);
      }
    }
  } else {
    for (const col of columnsWithConsistentData) {
      leafColumns.push(col);
    }
  }

  return columnsWithConsistentData;
}
