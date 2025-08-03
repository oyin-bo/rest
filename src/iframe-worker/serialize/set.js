// @ts-check

/**
 * @typedef {{
 *  ___kind: 'set',
 *  values: unknown[]
 * }} SerializedSet
 */

/**
 * @this {{
 *  serialize: (val: any) => any,
 *  serializeClosure?: Map<any, any>
 * }}
 * @param {Set} set
 * @returns {SerializedSet}
 */
export function serializeSet(set) {
  /** @type {SerializedSet} */
  const serialized = { ___kind: 'set', values: /** @type {unknown[]} */([]) };
  this.serializeClosure?.set(set, serialized);
  for (const value of set) {
    serialized.values.push(this.serialize(value));
  }
  // TODO: adorn any extra own properties
  return serialized;
}
/**
 * @this {{
 *  deserialize: (val: any) => any
 * }}
 * @param {SerializedSet} set
 * @returns {Set}
 */
export function deserializeSet(set) {
  const deserialized = new Set();
  for (const value of set.values) {
    deserialized.add(this.deserialize(value));
  }
  // TODO: adorn any extra own properties
  return deserialized;
}
