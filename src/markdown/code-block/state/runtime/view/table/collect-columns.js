// @ts-check

/**
 * @typedef {{
 *  key: string,
 *  types: Record<string, number>
 *  bestType?: string,
 *  subColumns?: ColumnSpec[]
 * }} ColumnSpec
 */

/**
 * @param {any[]} array
 * @param {number} [depth]
 */
export function collectColumns(array, depth) {
  /** @type {Record<string, ColumnSpec>} */
  const columns = {};
  let nullRows = 0;
  let valueRows = 0;
  let arrayRows = 0;

  for (const entry of array) {
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
      const colDesc = columns[key] || (columns[key] = { key, types: {} });
      const value = entry[key];
      const type =
        value == null ? 'null' :
          typeof value !== 'object' ? typeof value :
            Array.isArray(value) ? 'array' :
              'object';

      colDesc.types[type] = (colDesc.types[type] || 0) + 1;
    }
  }

  // not a coherent array of objects
  if (nullRows > array.length / 2 || valueRows > array.length / 4 || arrayRows > array.length / 4)
    return undefined;

  for (const colDesc of Object.values(columns)) {
    const types = Object.entries(colDesc.types);
    types.sort(([type1, count1], [type2, count2]) => count2 - count1);

    colDesc.bestType = types[0][0];
  }

  const columnsWithConsistentData = Object.values(columns).filter(
    colDesc =>
      colDesc.types[colDesc.bestType || ''] > array.length / 10
  );

  if (columnsWithConsistentData.length && (depth || 0) <= 3) {
    for (const col of columnsWithConsistentData) {
      if (col.bestType === 'object') {
        const objectRows = array.map(entry =>
          entry && typeof entry === 'object' && !Array.isArray(entry) ? entry[col.key] : null)
          .filter(Boolean);
        col.subColumns = collectColumns(objectRows, (depth || 0) + 1);
        for (const subCol of col.subColumns || []) {
          subCol.key = col.key + '.' + subCol.key;
        }
      }
    }
  }

  if (columnsWithConsistentData.length < 2)
    return;

  return columnsWithConsistentData;
}
