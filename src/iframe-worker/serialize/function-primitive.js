// @ts-check

/**
 * @typedef {`fn-primitive-${string}`} SerializedFunctionPrimitive
 */

/**
 * @this {{
 * }}
 * @param {Function} fn
 * @returns {SerializedFunctionPrimitive}
 */
export function serializeFunctionPrimitive(fn) {
  return `fn-primitive-${fn.name}`;
}

export function deserializeFunctionPrimitive(serialized) {
}