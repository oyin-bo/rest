// @ts-check

import { parseDate } from './parse-date';

/**
 * @typedef {{
 *  key: string,
 *  types: Record<string, number | { min: number, max: number, count: number }>
 *  bestType?: string,
 *  subColumns?: ColumnSpec[]
 * }} ColumnSpec
 */

/**
 * @param {any[]} array
 * @param {string} [prefix]
 * @param {number} [depth]
 */
export function collectColumns(array, prefix, depth) {
  /** @type {Record<string, ColumnSpec>} */
  const columns = {};
  let nullRows = 0;
  let valueRows = 0;
  let arrayRows = 0;

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
      const colSpec = columns[key] || (columns[key] = { key: prefix ? prefix + '.' + key : key, types: {} });
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
  }

  const columnsWithConsistentData = Object.values(columns).filter(
    colDesc => {
      const stats = colDesc.types[colDesc.bestType || ''];
      const count = typeof stats === 'number' ? stats : stats.count;
      return count > Math.min(4, array.length / 10);
    }
  );

  if (columnsWithConsistentData.length && (depth || 0) <= 4) {
    for (const col of columnsWithConsistentData) {
      if (col.bestType === 'object' || col.bestType === '[object]') {
        const objectRows = array.map(entry => {
          if (!entry || typeof entry !== 'object') return;
          let valueEntry = getValue(entry, prefix ? col.key.slice(prefix.length + 1) : col.key);
          if (!valueEntry || typeof valueEntry !== 'object') return;
          if (Array.isArray(valueEntry))
            return valueEntry.length === 1 ? valueEntry[0] : undefined;
          else
            return valueEntry;
        }).filter(Boolean);

        if (objectRows.length < 2) {
          console.log(
            'collect ' + (prefix ? prefix + '.' + col.key : col.key) + ' NO subColumns ',
            objectRows,
            col.subColumns,
            ' EXAMPLE ', array[0], col.key, ' --> ', getValue(array[0], col.key));
          continue;
        }

        col.subColumns = collectColumns(
          objectRows,
          col.key + (col.bestType === '[object]' ? '.0' : ''),
          (depth || 0) + 1);
        if (!col.subColumns?.length) col.subColumns = undefined;

        console.log('collect '+ (prefix ? prefix + '.' + col.key : col.key) + ' subColumns ', objectRows, col.subColumns);
      }
    }
  }

  if (columnsWithConsistentData.length < 2 && !depth)
    return;

  return columnsWithConsistentData;
}

function getValue(entry, fieldAccess) {
  const dotPos = fieldAccess.indexOf('.');
  if (dotPos < 0) return entry[fieldAccess];

  let val = entry;
  for (const part of fieldAccess.split('.')) {
    if (!val) return undefined;
    val = val[part];
  }

  return val;
}
