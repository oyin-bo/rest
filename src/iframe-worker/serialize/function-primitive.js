// @ts-check

/**
 * @typedef {`function-${string}`} SerializedFunctionPrimitive
 */

/**
 * @param {{ sendCallMessage(msg: { key: SerializedFunctionPrimitive, args: any[] }): Promise<any>}} sender
 */
export function functionCache(sender) {

  /**
   * @typedef {{
   *  fn: WeakRef<Function>,
   *  thisObj: WeakRef<any>
   * }} FunctionMemoSlot
  */
  
  /**
   * @typedef {{
   *  fn: Function,
   *  key: SerializedFunctionPrimitive
   * }} FunctionThisTypedSlot
   */

  /**
   * @type {Map<string, FunctionMemoSlot>}
   */
  const cache = new Map();

  const functionReferenceHoldSymbol = Symbol('function-reference-hold');

  return {
    serializeFunctionPrimitive,
    deserializeFunctionPrimitive,
    invokeFunctionPrimitive
  };

  /**
   * @param {Function} fn
   * @param {Object} thisObj
   * @param {string} methodKey
   */
  function serializeFunctionPrimitive(fn, thisObj, methodKey) {
    /** @type {{ [methodKey: string]: FunctionThisTypedSlot | undefined } | undefined} */
    let byMethod = thisObj[functionReferenceHoldSymbol];
    let existingKeySlot = byMethod?.[methodKey];
    if (existingKeySlot) return existingKeySlot.key;

    const key = /** @type {SerializedFunctionPrimitive} */('function-' + cache.size);

    if (!byMethod) thisObj[functionReferenceHoldSymbol] = byMethod = {};
    byMethod[methodKey] = { fn, key };

    cache.set(
      key,
      {
        fn: new WeakRef(fn),
        thisObj: new WeakRef(thisObj)
      });
    
    return key;
  }

  /**
   * @param {SerializedFunctionPrimitive} serialized
   */
  function deserializeFunctionPrimitive(serialized) {
    return (...args) => {
      return sender.sendCallMessage({ key: serialized, args });
    };
  }

  /**
   * @param {{
   *  key: SerializedFunctionPrimitive,
   * args: any[]
   * }} _
   */
  function invokeFunctionPrimitive({ key, args }) {
    const slot = cache.get(key);
    if (!slot) return;
    const fn = slot.fn.deref();
    const thisObj = slot.thisObj.deref();

    if (!thisObj || !fn) return;

    return fn.apply(thisObj, args);
  }
}