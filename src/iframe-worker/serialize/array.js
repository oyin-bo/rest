// @ts-check

/**
 * @this {{
 *  serialize: (val: any) => any
 * }}
 * @param {Array} arr
 */
export function serializeArray(arr) {
  const serialized = [];
  for (let i = 0; i < arr.length; i++) {
    if (i in arr) serialized[i] = this.serialize(arr[i]);
  }
  // TODO: adorn any extra own properties
  return serialized;
}

/**
 * @this {{
 *  deserialize: (val: any) => any
 * }}
 * @param {Array} arr
 */
export function deserializeArray(arr) {
  const deserialized = [];
  for (let i = 0; i < arr.length; i++) {
    if (i in arr) deserialized[i] = this.deserialize(arr[i]);
  }
  return deserialized;
}