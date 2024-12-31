// @ts-check

/**
 * @typedef {{
 *  ___kind: 'function',
 *  key: import('./function-primitive').SerializedFunctionPrimitive,
 *  name?: string,
 *  source?: string
 * }} SerializedFunction
 */

/**
 * @this {{
 *  serializeFunctionPrimitive: (fn: Function, thisObj: any, methodKey: string) => import('./function-primitive').SerializedFunctionPrimitive
 * }}
 * @param {Function} fn
 * @param {Object | null} thisObj
 * @param {string} methodKey
 * @returns {SerializedFunction}
 */
export function serializeFunction(fn, thisObj, methodKey) {
  return {
    ___kind: 'function',
    key: this.serializeFunctionPrimitive(fn, thisObj, methodKey),
    name: fn.name,
    source: String(fn)
  };
}

/**
 * @this {{
 *  deserializeFunctionPrimitive: (fn: import('./function-primitive').SerializedFunctionPrimitive) => ((...args) => Promise<any>)
 * }}
 * @param {SerializedFunction} serialized
 * @returns {(...args) => Promise<any>}
 */
export function deserializeFunction(serialized) {
  const fn = this.deserializeFunctionPrimitive(serialized.key);

  if (serialized.name) {
    /** @type {*} */(fn).name = serialized.name;
    if (serialized.name) Object.defineProperty(fn, 'name', { value: serialized.name });
  }

  if (serialized.source) fn.toString = () => serialized.source || '';
  return fn;
}