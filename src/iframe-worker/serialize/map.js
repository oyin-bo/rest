// @ts-check

/**
 * @typedef {{
 *  ___kind: 'map',
 *  entries: [key: unknown, value: unknown][]
 * }} SerializedMap
 */

/**
 * @this {{
 *  serialize: (val: any) => any,
 *  serializeClosure?: Map<any, any>
 * }}
 * @param {Map} map
 * @returns {SerializedMap}
 */
export function serializeMap(map) {
  /** @type {SerializedMap} */
  const serialized = { ___kind: 'map', entries: /** @type {[key: unknown, value: unknown][]} */([]) };
  this.serializeClosure?.set(map, serialized);
  for (const [key, value] of map) {
    serialized.entries.push([this.serialize(key), this.serialize(value)]);
  }
  // TODO: adorn any extra own properties
  return serialized;
}

/**
 * @this {{
 *  deserialize: (val: any) => any
 * }}
 * @param {SerializedMap} map
 * @returns {Map}
 */
export function deserializeMap(map) {
  const deserialized = new Map();
  for (const [key, value] of map.entries) {
    deserialized.set(this.deserialize(key), this.deserialize(value));
  }
  // TODO: adorn any extra own properties
  return deserialized;
}
