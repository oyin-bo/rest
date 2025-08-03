// @ts-check

/**
 * @this {{
 *  serialize: (val: any) => any,
 *  serializeFunction: (fn: Function, thisObj: any, methodKey: string) => import('./function').SerializedFunction,
 *  serializeClosure?: Map<any, any>
 * }}
 * @param {Array} arr
 */
export function serializeArray(arr) {
  const serialized = [];
  this.serializeClosure?.set(arr, serialized);
  for (let i = 0; i < arr.length; i++) {
    const value = arr[i];
    const serializedValue =
      typeof value === 'function' ? this.serializeFunction(value, arr, String(i)) :
        this.serialize(value);

    if (i in arr) serialized[i] = serializedValue;
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